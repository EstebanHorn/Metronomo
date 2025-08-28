package expo.modules.metronomenativeaudio

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

import android.media.AudioTrack
import android.media.AudioManager
import android.media.AudioAttributes
import android.media.AudioFormat
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper

import kotlin.math.roundToInt
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min

// ---------------- Helpers ----------------
private fun clampInt(x: Int, lo: Int, hi: Int) = min(hi, max(lo, x))
private fun clamp16(x: Int): Short =
  x.coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()

// ---------------- Records (typed API) ----------------
class ConfigureRecord : Record {
  @Field var bpm: Double = 120.0
  @Field var beatsPerCycle: Int = 8                 // p.ej. 8 negras → 2 compases 4/4
  @Field var subdivs: List<Int> = listOf(3,3,4,2,4) // 5 valores; se clamp 2..5
  @Field var silenceMap: List<List<Boolean>>? = null
  @Field var strongGain: Double = 1.0
  @Field var subdivGain: Double = 0.7
}

// ---------------- Module ----------------
class MetronomeNativeAudioModule : Module() {
  // Patrón binario: 16 unidades repartidas en 5 secciones
  private val PATTERN_UNITS = intArrayOf(3,3,4,2,4)
  private val TOTAL_UNITS = PATTERN_UNITS.sum() // 16

  // Audio state
  private var audioTrack: AudioTrack? = null
  private var sampleRate = 48000

  // Parámetros
  private var bpm: Double = 120.0
  private var beatsPerCycle: Int = 8
  private var subdivs: IntArray = intArrayOf(3,3,4,2,4) // por sección; clamp 2..5
  private var silenceMap: Array<BooleanArray>? = null   // [section][k] true = silenciado
  private var strongGain: Double = 1.0
  private var subdivGain: Double = 0.7

  // Audio data
  private lateinit var strongClick: ShortArray
  private lateinit var subdivClick: ShortArray
  private var barBuffer: ShortArray? = null

  // Engine loop
  private var engineThread: HandlerThread? = null
  private var engineHandler: Handler? = null

  // Eventos del bar (para sincronizar UI)
  private data class BeatEvt(
    val frameOffset: Int,
    val section: Int,
    val k: Int,
    val type: String // "clave" | "pulse"
  )
  private var barEvents: List<BeatEvt> = emptyList()
  private var uiHandler: Handler? = null

  // Para estadística/depuración
  private var writtenFramesTotal: Long = 0L

  override fun definition() = ModuleDefinition {
    Name("MetronomeNativeAudio")

    // Evento expuesto a JS
    Events("onBeat")

    // ---- API ----
    Function("configure") { cfg: ConfigureRecord ->
      try {
        bpm = cfg.bpm
        beatsPerCycle = max(1, cfg.beatsPerCycle)

        val inSubs = cfg.subdivs.ifEmpty { listOf(3,3,4,2,4) }
        subdivs = IntArray(5) { i -> clampInt(inSubs.getOrNull(i) ?: 2, 2, 5) }

        silenceMap = cfg.silenceMap
          ?.mapIndexed { i, row ->
            val n = subdivs.getOrNull(i) ?: 2
            BooleanArray(n) { k -> row.getOrNull(k) ?: false }
          }?.toTypedArray()

        strongGain = cfg.strongGain.coerceIn(0.0, 1.0)
        subdivGain = cfg.subdivGain.coerceIn(0.0, 1.0)

        prepareAudio()
        rebuildBarBinary16()   // genera barBuffer + barEvents
        true
      } catch (_: Throwable) {
        safeRelease()
        false
      }
    }

    Function("start") { startEngine() }
    Function("stop") { stopEngine() }

    Function("setBpm") { newBpm: Double ->
      bpm = newBpm
      rebuildBarBinary16()
    }

    Function("setSubdivs") { list: List<Int> ->
      subdivs = IntArray(5) { i -> clampInt(list.getOrNull(i) ?: subdivs.getOrNull(i) ?: 2, 2, 5) }
      rebuildBarBinary16()
    }

    Function("setSilenceMap") { map: List<List<Boolean>> ->
      silenceMap = Array(5) { i ->
        val n = subdivs.getOrNull(i) ?: 2
        BooleanArray(n) { k -> map.getOrNull(i)?.getOrNull(k) ?: false }
      }
      rebuildBarBinary16()
    }
  }

  // ---------- Audio setup ----------
  private fun prepareAudio() {
    val nativeRate = AudioTrack.getNativeOutputSampleRate(AudioManager.STREAM_MUSIC)
    sampleRate = if (nativeRate >= 8000) nativeRate else 44100

    val attrs = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_MEDIA)
      .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
      .build()

    val format = AudioFormat.Builder()
      .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
      .setSampleRate(sampleRate)
      .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
      .build()

    val minRaw = AudioTrack.getMinBufferSize(
      sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT
    )
    val minBuf = if (minRaw > 0) minRaw else sampleRate / 2

    try { audioTrack?.stop() } catch (_: Throwable) {}
    try { audioTrack?.release() } catch (_: Throwable) {}
    audioTrack = null

    try {
      audioTrack = AudioTrack(
        attrs, format, max(minBuf, sampleRate / 2),
        AudioTrack.MODE_STREAM, AudioManager.AUDIO_SESSION_ID_GENERATE
      )
    } catch (_: Throwable) {
      audioTrack = null
    }

    // clicks ~3ms con decay exponencial
    strongClick = generateClick(sampleRate, 0.003, strongGain)
    subdivClick = generateClick(sampleRate, 0.003, subdivGain)
  }

  private fun generateClick(sr: Int, durSec: Double, gain: Double): ShortArray {
    val n = (sr * durSec).roundToInt().coerceAtLeast(1)
    val buf = ShortArray(n)
    for (i in 0 until n) {
      val env = exp(-i / (n / 3.0))
      val v = (Short.MAX_VALUE * env * gain).toInt()
      buf[i] = clamp16(v)
    }
    return buf
  }

  // ---------- Construcción del ciclo BINARIO 16-units ----------
  /**
   * - barSec = beatsPerCycle * (60/bpm)
   * - unitSec = barSec / 16
   * - Sección i dura PATTERN_UNITS[i] * unitSec
   * - Subdivisiones por sección: subdivs[i] (2..5)
   * - k=0 -> "clave" (click fuerte), k>0 -> "pulse" (click normal)
   * - silenceMap[i][k] true => omite ese golpe
   */
  private fun rebuildBarBinary16() {
    val bpmSafe = if (bpm.isFinite() && bpm > 0.5) bpm else 120.0
    bpm = bpmSafe

    val spBeat = 60.0 / bpmSafe
    val barSec = spBeat * beatsPerCycle
    val barSamples = (sampleRate * barSec).roundToInt().coerceIn(1, sampleRate * 20)
    val unitSec = barSec / TOTAL_UNITS.toDouble()
    val unitSamples = (sampleRate * unitSec).toDouble()

    val buf = ShortArray(barSamples)

    var unitsAccum = 0.0
    for (section in 0 until 5) {
      val unitsLen = PATTERN_UNITS[section].toDouble()
      val secStartSamp = (unitsAccum * unitSamples).roundToInt()
      val secDurSamp = (unitsLen * unitSamples).roundToInt()
      unitsAccum += unitsLen

      val nSub = clampInt(subdivs.getOrNull(section) ?: 2, 2, 5)
      val rowSil = silenceMap?.getOrNull(section)

      for (k in 0 until nSub) {
        val silenced = rowSil?.getOrNull(k) ?: false
        if (silenced) continue
        val at = secStartSamp + if (nSub == 1) 0
          else ((secDurSamp.toDouble() * k) / nSub).roundToInt()
        val click = if (k == 0) strongClick else subdivClick

        var i = 0
        while (i < click.size) {
          val idx = at + i
          if (idx >= barSamples) break
          val mixed = buf[idx].toInt() + click[i].toInt()
          buf[idx] = clamp16(mixed)
          i++
        }
      }
    }

    barBuffer = buf
    // Preparamos la tabla de eventos para UI
    barEvents = buildBarEvents(
      sampleRate = sampleRate,
      beatsPerCycle = beatsPerCycle,
      bpm = bpm,
      patternUnits = PATTERN_UNITS,
      subdivs = subdivs,
      silenceMap = silenceMap
    )
  }

  private fun buildBarEvents(
    sampleRate: Int,
    beatsPerCycle: Int,
    bpm: Double,
    patternUnits: IntArray,
    subdivs: IntArray,
    silenceMap: Array<BooleanArray>?
  ): List<BeatEvt> {
    val spBeat = 60.0 / bpm
    val barSec = spBeat * beatsPerCycle
    val unitSec = barSec / patternUnits.sum().toDouble()
    val unitFrames = sampleRate * unitSec

    val out = ArrayList<BeatEvt>()
    var unitsAccum = 0.0
    for (section in 0 until 5) {
      val lenUnits = patternUnits[section].toDouble()
      val secStartFrames = (unitsAccum * unitFrames).roundToInt()
      val secDurFrames = (lenUnits * unitFrames).roundToInt()
      unitsAccum += lenUnits

      val nSub = clampInt(subdivs.getOrNull(section) ?: 2, 2, 5)
      val rowSil = silenceMap?.getOrNull(section)

      for (k in 0 until nSub) {
        val silenced = rowSil?.getOrNull(k) ?: false
        if (silenced) continue
        val off = secStartFrames + if (nSub == 1) 0
          else ((secDurFrames.toDouble() * k) / nSub).roundToInt()
        val type = if (k == 0) "clave" else "pulse"
        out.add(BeatEvt(off, section, k, type))
      }
    }
    out.sortBy { it.frameOffset }
    return out
  }

  // ---------- Engine ----------
  private fun startEngine() {
    if (engineThread != null) return
    val at = audioTrack ?: return
    try { at.play() } catch (_: Throwable) { return }

    engineThread = HandlerThread("MetronomeEngine").apply { start() }
    engineHandler = Handler(engineThread!!.looper)

    // Handler UI para onBeat
    uiHandler = Handler(Looper.getMainLooper())

    writtenFramesTotal = 0L
    engineHandler?.post(engineLoop)
  }

  private val engineLoop = object : Runnable {
    override fun run() {
      val at = audioTrack ?: return
      val bar = barBuffer ?: return
      val events = barEvents

      val sr = sampleRate.coerceAtLeast(8000)
      val barFrames = bar.size // mono 16-bit: 1 muestra = 1 frame lógico para UI

      // Agenda eventos de UI relativos al inicio del ciclo
      scheduleUIEventsForCycle(sr, events)

      try {
        at.write(bar, 0, bar.size, AudioTrack.WRITE_BLOCKING)
      } catch (_: Throwable) {
        stopEngine(); return
      }

      writtenFramesTotal += barFrames
      engineHandler?.post(this)
    }
  }

  private fun scheduleUIEventsForCycle(
    sampleRate: Int,
    events: List<BeatEvt>
  ) {
    val ui = uiHandler ?: return
    // Limpiamos callbacks previos del ciclo anterior
    ui.removeCallbacksAndMessages(null)

    for (ev in events) {
      val delayMs = (ev.frameOffset.toDouble() * 1000.0 / sampleRate).roundToInt().toLong()
      ui.postDelayed({
        sendEvent(
          "onBeat",
          mapOf(
            "section" to ev.section,
            "k" to ev.k,
            "type" to ev.type,
            "tMs" to (ev.frameOffset.toDouble() * 1000.0 / sampleRate)
          )
        )
      }, delayMs)
    }
  }

  private fun stopEngine() {
    uiHandler?.removeCallbacksAndMessages(null)
    uiHandler = null

    engineHandler?.removeCallbacksAndMessages(null)
    engineThread?.quitSafely()
    engineThread = null
    engineHandler = null

    safeRelease()
  }

  private fun safeRelease() {
    try { audioTrack?.stop() } catch (_: Throwable) {}
    try { audioTrack?.release() } catch (_: Throwable) {}
    audioTrack = null
  }
}
