package com.metronomenativeaudio;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
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

public class MetronomeModule extends ReactContextBaseJavaModule {
    // ... (todo el código hasta runAudio no cambia)
    private final ReactApplicationContext ctx;
    private volatile boolean running = false;
    private Thread audioThread;
    private int sampleRate = 48000;
    private int bufferFrames = 1024;
    private double bpm = 120.0;
    private long sampleCursor = 0;
    private long cycleLen = 0;
    private int trigIndex = 0;
    static class Trigger { long when; int role; float pan; int section; int k; }
    private ArrayList<Trigger> triggers = new ArrayList<>();
    private ReadableArray lastPattern = null;
    private short[] sClave = new short[0];
    private short[] sAccent = new short[0];
    private short[] sPulse = new short[0];
    private static final int ROLE_PULSE = 0;
    private static final int ROLE_ACCENT = 1;
    private static final int ROLE_CLAVE = 2;
    private static final int ROLE_SILENCE = 3;

    public MetronomeModule(ReactApplicationContext reactContext) { super(reactContext); this.ctx = reactContext; }
    @Override public String getName() { return "Metronome"; }
    @ReactMethod public void init(ReadableMap params) {
        if (params != null) {
            if (params.hasKey("sampleRate")) sampleRate = params.getInt("sampleRate");
            if (params.hasKey("bufferFrames")) bufferFrames = params.getInt("bufferFrames");
        }
        sClave  = loadWav(ctx.getResources(), R.raw.acento_fuerte).pcm;
        sAccent = loadWav(ctx.getResources(), R.raw.subdivision).pcm;
        sPulse  = loadWav(ctx.getResources(), R.raw.pulso_regular).pcm;
    }
    @ReactMethod public void setBpm(double value) { bpm = value; if (this.lastPattern != null) buildPattern(this.lastPattern); }
    @ReactMethod public void setPattern(ReadableArray pattern) { this.lastPattern = pattern; buildPattern(pattern); }
    @ReactMethod public void play() {
        if (running) return;
        running = true;
        sampleCursor = 0; trigIndex = 0;
        audioThread = new Thread(this::runAudio, "PulsoAudio");
        audioThread.setPriority(Thread.MAX_PRIORITY);
        audioThread.start();
    }
    @ReactMethod public void stop() { running = false; }
    @ReactMethod public void addListener(String eventName) {}
    @ReactMethod public void removeListeners(double count) {}

    private long eighthSamples() {
        double secPerQuarter = 60.0 / bpm;
        double secPerEighth = 0.5 * secPerQuarter;
        return Math.max(1, (long) Math.round(secPerEighth * sampleRate));
    }

    private void buildPattern(ReadableArray pattern) {
        ArrayList<Trigger> list = new ArrayList<>();
        long pos = 0;
        long e8 = eighthSamples();
        for (int i = 0; i < (pattern != null ? pattern.size() : 0); i++) {
            ReadableMap p = pattern.getMap(i);
            double durEighths = p.getDouble("durEighths");
            String role = p.getString("role");
            double pan = p.getDouble("pan");
            int sectionIdx = p.hasKey("sectionIdx") ? p.getInt("sectionIdx") : 0;
            int k = p.hasKey("k") ? p.getInt("k") : 0;
            long durSamples = Math.max(1, (long) (durEighths * e8));
            if (!"silence".equals(role)) {
                Trigger t = new Trigger();
                t.when = pos;
                if ("clave".equals(role)) { t.role = ROLE_CLAVE; }
                else if ("accent".equals(role)) { t.role = ROLE_ACCENT; }
                else { t.role = ROLE_PULSE; }
                t.pan = (float) pan;
                t.section = sectionIdx;
                t.k = k;
                list.add(t);
            }
            pos += durSamples;
        }
        list.sort(Comparator.comparingLong(o -> o.when));
        triggers = list;
        cycleLen = Math.max(1, pos);
        trigIndex = 0;
        sampleCursor = 0;
    }

    private void runAudio() {
        final int chan = AudioFormat.CHANNEL_OUT_STEREO;
        final int enc  = AudioFormat.ENCODING_PCM_FLOAT;
        int minBufBytes = AudioTrack.getMinBufferSize(sampleRate, chan, enc);
        int frames = Math.max(bufferFrames, Math.max(512, minBufBytes / 8));
        AudioTrack track = new AudioTrack.Builder()
            .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
            .setAudioFormat(new AudioFormat.Builder().setEncoding(enc).setSampleRate(sampleRate).setChannelMask(chan).build())
            .setBufferSizeInBytes(frames * 8)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build();
        float[] left = new float[frames];
        float[] right = new float[frames];
        float[] inter = new float[frames * 2];
        try {
            track.play();
            while (running) {
                Arrays.fill(left, 0f);
                Arrays.fill(right, 0f);
                long start = sampleCursor, end = start + frames;
                if (!triggers.isEmpty()) {
                    while (true) {
                        Trigger t = triggers.get(trigIndex);
                        long whenAbs = t.when + (start / cycleLen) * cycleLen;
                        if (whenAbs < start) {
                            whenAbs += ((start - whenAbs) / cycleLen + 1) * cycleLen;
                        }
                        if (whenAbs >= end) break;
                        
                        int i = (int) (whenAbs - start);
                        switch (t.role) {
                            case ROLE_CLAVE:  mixOne(left, right, i, sClave,  1.0f, t.pan); break;
                            case ROLE_ACCENT: mixOne(left, right, i, sAccent, 1.0f, t.pan); break;
                            case ROLE_PULSE:  mixOne(left, right, i, sPulse,  0.8f, t.pan); break;
                            default: break;
                        }

                        double tMs = ((whenAbs % cycleLen) * 1000.0) / sampleRate;
                        
                        // --- CORRECCIÓN DEFINITIVA AQUÍ ---
                        // Enviamos la sección y el k que ya habíamos guardado en el Trigger.
                        sendTick(t.section, t.k, tMs);

                        trigIndex++;
                        if (trigIndex >= triggers.size()) {
                            trigIndex = 0;
                        }
                    }
                }
                
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
                track.stop();
                track.release();
            }
        }
    }

    private void mixOne(float[] left, float[] right, int startIndex, short[] sample, float gain, float pan) {
        if (sample.length == 0 || startIndex >= left.length) return;
        float gl = gain * (pan <= 0 ? 1f : 1f - pan);
        float gr = gain * (pan >= 0 ? 1f : 1f + pan);
        int n = Math.min(sample.length, left.length - startIndex);
        for (int i = 0; i < n; i++) {
            float v = sample[i] / 32768f;
            left[startIndex + i]  += v * gl;
            right[startIndex + i] += v * gr;
        }
    }

    private void sendTick(int section, int k, double tMs) {
        WritableMap e = Arguments.createMap();
        e.putInt("bar", 0);
        e.putInt("section", section);
        e.putInt("k", k);
        e.putDouble("tMs", tMs);
        ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("PulsoTick", e);
    }
    // -------- WAV loader --------
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

    private static int[] findDataChunk(byte[] b) {
        for (int i = 12; i < b.length - 8;) {
            int id = toIntBE(b, i);
            int sz = toIntLE(b, i + 4);
            if (id == 0x64617461) return new int[]{ i + 8, sz }; // "data"
            i += 8 + sz + (sz & 1);
        }
        return new int[]{ 44, b.length - 44 };
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