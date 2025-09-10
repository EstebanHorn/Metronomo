package com.metronomenativeaudio;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Iterator;

public class MetronomeModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext ctx;

    // Estado de reproducción
    private volatile boolean running = false;
    private Thread audioThread;
    private int sampleRate = 48000;
    private int bufferFrames = 1024;
    private double bpm = 120.0;
    private long sampleCursor = 0;
    private long cycleLen = 0;
    private int trigIndex = 0;

    // Volumen maestro (0..1)
    private volatile float masterGain = 1.0f;

    static class Trigger {
        long when;
        int role;
        float pan;   // -1..1
        int section; // para UI
        int k;       // para UI
    }

    private ArrayList<Trigger> triggers = new ArrayList<>();
    private ReadableArray lastPattern = null;

    // Buffers de samples (mono, 16-bit)
    private short[] sCajonGrave   = new short[0];
    private short[] sCajonRelleno = new short[0];
    private short[] sCajonAgudo   = new short[0];
    private short[] sCencerro     = new short[0];
    private short[] sClick        = new short[0];
    private short[] sSilence      = new short[0]; // <- NUEVO

    // Roles
    private static final int ROLE_CAJON_GRAVE   = 0;
    private static final int ROLE_CAJON_RELLENO = 1;
    private static final int ROLE_CAJON_AGUDO   = 2;
    private static final int ROLE_CENCERRO      = 3;
    private static final int ROLE_CLICK         = 4;
    private static final int ROLE_SILENCE       = 5;

    public MetronomeModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.ctx = reactContext;
    }

    @Override
    public String getName() { return "Metronome"; }

    // ---------- API desde JS ----------

    @ReactMethod
    public void init(ReadableMap params) {
        if (params != null) {
            if (params.hasKey("sampleRate"))  sampleRate = params.getInt("sampleRate");
            if (params.hasKey("bufferFrames")) bufferFrames = params.getInt("bufferFrames");
        }
        // Cargar WAV desde res/raw
        sCajonGrave   = loadWav(ctx.getResources(), R.raw.cajon_grave).pcm;
        sCajonRelleno = loadWav(ctx.getResources(), R.raw.cajon_relleno).pcm;
        sCajonAgudo   = loadWav(ctx.getResources(), R.raw.cajon_agudo).pcm;
        sCencerro     = loadWav(ctx.getResources(), R.raw.cencerro).pcm;
        sClick        = loadWav(ctx.getResources(), R.raw.click).pcm;
        sSilence      = loadWav(ctx.getResources(), R.raw.silence).pcm; // <- NUEVO
    }

    @ReactMethod
    public void setBpm(double value) {
        bpm = value;
        if (this.lastPattern != null) buildPattern(this.lastPattern);
    }

    @ReactMethod
    public void setPattern(ReadableArray pattern) {
        this.lastPattern = pattern;
        buildPattern(pattern);
    }

    @ReactMethod
    public void setVolume(double v) {
        float g = (float) v;
        if (g < 0f) g = 0f;
        if (g > 1f) g = 1f;
        masterGain = g;
    }

    @ReactMethod
    public void play() {
        if (running) return;
        running = true;
        sampleCursor = 0;
        trigIndex = 0;
        audioThread = new Thread(this::runAudio, "PulsoAudio");
        audioThread.setPriority(Thread.MAX_PRIORITY);
        audioThread.start();
    }

    @ReactMethod
    public void stop() { running = false; }

    // Requeridos por RN (no-ops)
    @ReactMethod public void addListener(String eventName) {}
    @ReactMethod public void removeListeners(double count) {}

    // ---------- Construcción del patrón ----------

    private long eighthSamples() {
        double secPerQuarter = 60.0 / bpm;
        double secPerEighth = 0.5 * secPerQuarter;
        return Math.max(1, (long) Math.round(secPerEighth * sampleRate));
    }

    private void buildPattern(ReadableArray pattern) {
        ArrayList<Trigger> list = new ArrayList<>();
        long pos = 0;
        long e8 = eighthSamples();

        int count = (pattern != null ? pattern.size() : 0);
        for (int i = 0; i < count; i++) {
            ReadableMap p = pattern.getMap(i);
            double durEighths = p.getDouble("durEighths");
            String role = p.getString("role");
            double pan = p.getDouble("pan");
            int sectionIdx = p.hasKey("sectionIdx") ? p.getInt("sectionIdx") : 0;
            int k = p.hasKey("k") ? p.getInt("k") : 0;

            long durSamples = Math.max(1, (long) (durEighths * e8));

            Trigger t = new Trigger();
            t.when = pos;
            switch (role) {
                case "cajon_grave":   t.role = ROLE_CAJON_GRAVE; break;
                case "cajon_relleno": t.role = ROLE_CAJON_RELLENO; break;
                case "cajon_agudo":   t.role = ROLE_CAJON_AGUDO; break;
                case "cencerro":      t.role = ROLE_CENCERRO; break;
                case "click":         t.role = ROLE_CLICK; break;
                case "silence":       t.role = ROLE_SILENCE; break;
                default:              t.role = ROLE_CAJON_RELLENO; break;
            }
            t.pan = (float) pan;
            t.section = sectionIdx;
            t.k = k;
            list.add(t);

            pos += durSamples;
        }

        list.sort(Comparator.comparingLong(o -> o.when));
        triggers = list;
        cycleLen = Math.max(1, pos);
        trigIndex = 0;
        sampleCursor = 0;
    }

    // ---------- Hilo de audio (motor de voces) ----------

    // Una voz persiste entre buffers hasta completar su sample (cap 100 ms)
    private static class Voice {
        short[] s;     // sample
        int len;       // largo efectivo (cap 100 ms)
        int pos;       // índice actual en el sample
        float gl, gr;  // ganancias por canal (incluye master)
        int startInFrame; // offset dentro del frame actual (>=0 en el 1er frame, luego negativo)
        int fade;      // tamaño de micro-fade
        Voice(short[] s, int len, float gl, float gr, int startInFrame, int fade) {
            this.s = s; this.len = len; this.gl = gl; this.gr = gr;
            this.startInFrame = startInFrame; this.fade = fade;
            this.pos = 0;
        }
    }

    private int soundLenSamples() {
        return Math.max(1, (int) Math.round(0.100 * sampleRate)); // 100 ms
    }

    private float roleBaseGain(int role) {
        switch (role) {
            case ROLE_CAJON_GRAVE:   return 0.95f;
            case ROLE_CAJON_RELLENO: return 0.90f;
            case ROLE_CAJON_AGUDO:   return 0.90f;
            case ROLE_CENCERRO:      return 0.85f;
            case ROLE_CLICK:         return 0.88f;
            case ROLE_SILENCE:       return 1.00f; // el WAV de silencio debería ser 0s; mantenemos ganancia 1
            default:                 return 0.90f;
        }
    }

    private short[] roleSample(int role) {
        switch (role) {
            case ROLE_CAJON_GRAVE:   return sCajonGrave;
            case ROLE_CAJON_RELLENO: return sCajonRelleno;
            case ROLE_CAJON_AGUDO:   return sCajonAgudo;
            case ROLE_CENCERRO:      return sCencerro;
            case ROLE_CLICK:         return sClick;
            case ROLE_SILENCE:       return sSilence; // <- usa el WAV
            default:                 return sCajonRelleno;
        }
    }

    private void runAudio() {
        final int chan = AudioFormat.CHANNEL_OUT_STEREO;
        final int enc  = AudioFormat.ENCODING_PCM_FLOAT;

        int minBufBytes = AudioTrack.getMinBufferSize(sampleRate, chan, enc);
        int frames = Math.max(bufferFrames, Math.max(512, minBufBytes / 8));

        AudioTrack track = new AudioTrack.Builder()
            .setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build())
            .setAudioFormat(new AudioFormat.Builder()
                .setEncoding(enc)
                .setSampleRate(sampleRate)
                .setChannelMask(chan)
                .build())
            .setBufferSizeInBytes(frames * 8) // 2ch * float(4 bytes) * frames
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build();

        float[] left  = new float[frames];
        float[] right = new float[frames];
        float[] inter = new float[frames * 2];

        // voces activas que continúan entre buffers
        ArrayList<Voice> voices = new ArrayList<>();

        try {
            track.play();
            while (running) {
                Arrays.fill(left, 0f);
                Arrays.fill(right, 0f);

                long start = sampleCursor;
                long end   = start + frames;

                // Programar triggers que caen dentro de este frame → crear voces
                if (!triggers.isEmpty()) {
                    while (true) {
                        Trigger t = triggers.get(trigIndex);
                        long base = (start / cycleLen) * cycleLen;
                        long whenAbs = t.when + base;
                        if (whenAbs < start) {
                            long kCycles = ((start - whenAbs) / cycleLen) + 1;
                            whenAbs += kCycles * cycleLen;
                        }
                        if (whenAbs >= end) break;

                        int startInFrame = (int) (whenAbs - start);

                        // calcular ganancias con pan (potencia constante)
                        float theta = (float)((t.pan + 1.0) * Math.PI * 0.25);
                        float gBase = roleBaseGain(t.role) * masterGain;
                        float gl = (float)(Math.cos(theta) * gBase);
                        float gr = (float)(Math.sin(theta) * gBase);

                        short[] s = roleSample(t.role);
                        int cap = Math.min(s.length, soundLenSamples());
                        int fade = Math.min(32, Math.max(8, cap / 16)); // 8..32 muestras

                        voices.add(new Voice(s, cap, gl, gr, startInFrame, fade));

                        double tMs = ((whenAbs % cycleLen) * 1000.0) / sampleRate;
                        sendTick(t.section, t.k, tMs);

                        // siguiente trigger
                        trigIndex++;
                        if (trigIndex >= triggers.size()) {
                            trigIndex = 0;
                        }
                    }
                }

                // Mezcla de todas las voces activas en este frame
                if (!voices.isEmpty()) {
                    Iterator<Voice> it = voices.iterator();
                    while (it.hasNext()) {
                        Voice v = it.next();

                        int dstStart = Math.max(0, v.startInFrame); // si negativo, arranca antes del frame (continuación)
                        int srcStart = v.pos + Math.max(0, -v.startInFrame);

                        if (srcStart >= v.len) { it.remove(); continue; }

                        int n = Math.min(v.len - srcStart, frames - dstStart);
                        if (n > 0) {
                            // micro-fade (in/out) basado en len total
                            int fade = v.fade;
                            for (int i = 0; i < n; i++) {
                                int si = srcStart + i;
                                float env = 1f;
                                if (si < fade) env *= (si / (float) fade);
                                if (si > v.len - fade) env *= ((v.len - si) / (float) fade);

                                float sample = (v.s[si] / 32768f) * env;
                                int di = dstStart + i;
                                left[di]  += sample * v.gl;
                                right[di] += sample * v.gr;
                            }
                            v.pos = srcStart + n;
                        }

                        // Preparar para el próximo frame
                        v.startInFrame -= frames;

                        // Si terminó, remover
                        if (v.pos >= v.len) {
                            it.remove();
                        }
                    }
                }

                // interleave y enviar
                int j = 0;
                for (int i = 0; i < frames; i++) {
                    inter[j++] = left[i];
                    inter[j++] = right[i];
                }
                track.write(inter, 0, inter.length, AudioTrack.WRITE_BLOCKING);
                sampleCursor = end;
            }
        } catch (Exception e) {
            Log.e("Metronome", "AudioThread error: " + e.getMessage());
        } finally {
            if (track.getState() == AudioTrack.STATE_INITIALIZED) {
                try { track.stop(); } catch (Exception ignored) {}
                track.release();
            }
        }
    }

    // ---------- Eventos a JS ----------

    private void sendTick(int section, int k, double tMs) {
        WritableMap e = Arguments.createMap();
        e.putInt("bar", 0);
        e.putInt("section", section);
        e.putInt("k", k);
        e.putDouble("tMs", tMs);
        ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
           .emit("PulsoTick", e);
    }

    // ---------- WAV loader (PCM 16-bit LE) ----------

    private static class WavData { short[] pcm; }

    private WavData loadWav(android.content.res.Resources res, int resId) {
        try (InputStream is = res.openRawResource(resId)) {
            byte[] all = readAll(is);
            int[] meta = findDataChunk(all);
            int off = meta[0], len = meta[1];
            ByteBuffer bb = ByteBuffer.wrap(all, off, len).order(ByteOrder.LITTLE_ENDIAN);
            short[] pcm = new short[len / 2];
            for (int i = 0; i < pcm.length; i++) pcm[i] = bb.getShort();
            WavData w = new WavData(); w.pcm = pcm; return w;
        } catch (Exception e) {
            Log.e("Pulso", "WAV load error: " + e);
            WavData w = new WavData(); w.pcm = new short[0]; return w;
        }
    }

    // Busca chunk "data"
    private static int[] findDataChunk(byte[] b) {
        for (int i = 12; i < b.length - 8;) {
            int id = toIntBE(b, i);
            int sz = toIntLE(b, i + 4);
            if (id == 0x64617461) return new int[]{ i + 8, sz }; // "data"
            i += 8 + sz + (sz & 1);
        }
        // fallback típico de RIFF con 44 bytes de header
        return new int[]{ 44, Math.max(0, b.length - 44) };
    }

    private static int toIntLE(byte[] b, int o) {
        return (b[o] & 0xff) | ((b[o + 1] & 0xff) << 8) | ((b[o + 2] & 0xff) << 16) | ((b[o + 3] & 0xff) << 24);
    }

    private static int toIntBE(byte[] b, int o) {
        return ((b[o] & 0xff) << 24) | ((b[o + 1] & 0xff) << 16) | ((b[o + 2] & 0xff) << 8) | (b[o + 3] & 0xff);
    }

    private static byte[] readAll(InputStream is) throws Exception {
        ArrayList<byte[]> parts = new ArrayList<>();
        int total = 0;
        byte[] buf = new byte[8192];
        int n;
        while ((n = is.read(buf)) > 0) {
            parts.add(Arrays.copyOf(buf, n));
            total += n;
        }
        byte[] out = new byte[total];
        int off = 0;
        for (byte[] p : parts) {
            System.arraycopy(p, 0, out, off, p.length);
            off += p.length;
        }
        return out;
    }
}
