import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Button } from "react-native";
import MetronomeNativeAudio, {
  addOnBeatListener,
  OnBeatPayload,
} from "../modules/metronome-native-audio";
import {
  ActiveEvent,
  buildEventsMs,
  makeSilenceMap,
  PATTERN,
  clamp,
} from "../constants/Pulse";

type Props = {
  bpm: number;
  beatsPerCycle: number;
  subdivs: number[];
  silenceMap?: boolean[][];
  onActive?: (ev: ActiveEvent | null) => void;
  initialSubdivs: number[];
  initialSilenceMap: boolean[][];
  onReset?: (payload: { subdivs: number[]; silenceMap: boolean[][] }) => void;
};

const MIN_SUBDIV = 2;
const MAX_SUBDIV = 5;

export default function VariablePulsePlayer({
  bpm,
  beatsPerCycle,
  subdivs,
  silenceMap,
  onActive,
  initialSubdivs,
  initialSilenceMap,
  onReset,
}: Props) {
  const cycleMs = useMemo(
    () => (60000 / Math.max(1, bpm)) * Math.max(1, beatsPerCycle),
    [bpm, beatsPerCycle]
  );

  const safeSubdivs = useMemo(() => {
    const base = [...subdivs];
    if (base.length !== 5) {
      const fill = Array(5).fill(2);
      for (let i = 0; i < 5; i++)
        fill[i] = clamp(base[i] ?? 2, MIN_SUBDIV, MAX_SUBDIV);
      return fill;
    }
    return base.map((n) => clamp(n, MIN_SUBDIV, MAX_SUBDIV));
  }, [subdivs]);

  const safeSilence = useMemo(() => {
    if (!silenceMap)
      return makeSilenceMap(safeSubdivs).map((r) => r.map(() => false));
    return safeSubdivs.map((n, i) => {
      const row = silenceMap[i] ?? [];
      const out = Array(n).fill(false) as boolean[];
      for (let k = 0; k < Math.min(row.length, n); k++) out[k] = !!row[k];
      return out;
    });
  }, [silenceMap, safeSubdivs]);

  const { events, tickMs } = useMemo(
    () => buildEventsMs({ cycleMs, subdivs: safeSubdivs, pattern: PATTERN }),
    [cycleMs, safeSubdivs]
  );

  const [running, setRunning] = useState(false);
  const subRef = useRef<{ remove: () => void } | null>(null);

  const configureNative = useCallback(async () => {
    const ok = await (MetronomeNativeAudio as any).configure?.({
      bpm,
      beatsPerCycle,
      subdivs: safeSubdivs,
      silenceMap: safeSilence,
      strongGain: 1.0,
      subdivGain: 0.6,
    });
    return !!ok;
  }, [bpm, beatsPerCycle, safeSubdivs, safeSilence]);

  // Re-config en frío
  useEffect(() => {
    if (!running) configureNative();
  }, [configureNative, running]);

  const start = useCallback(async () => {
    const ok = await configureNative();
    if (!ok) return;

    // Suscribimos onBeat ANTES de arrancar
    if (subRef.current) {
      try {
        subRef.current.remove();
      } catch {}
      subRef.current = null;
    }
    const sub = addOnBeatListener((ev: OnBeatPayload) => {
      onActive?.({
        tMs: ev.tMs,
        section: ev.section,
        k: ev.k,
        type: ev.type,
        tick: tickMs ? ev.tMs / tickMs : 0,
      });
    });
    subRef.current = { remove: () => sub.remove() };

    try {
      MetronomeNativeAudio.start();
      setRunning(true);
    } catch {}
  }, [configureNative, onActive, tickMs]);

  const stop = useCallback(() => {
    try {
      MetronomeNativeAudio.stop();
    } catch {}
    if (subRef.current) {
      try {
        subRef.current.remove();
      } catch {}
      subRef.current = null;
    }
    setRunning(false);
    onActive?.(null);
  }, [onActive]);

  useEffect(() => stop, [stop]);

  const reset = useCallback(() => {
    stop();
    const subs = [...initialSubdivs];
    const sils = initialSilenceMap.map((r) => [...r]);
    onReset?.({ subdivs: subs, silenceMap: sils });
  }, [stop, initialSubdivs, initialSilenceMap, onReset]);

  return (
    <View style={{ alignItems: "center", justifyContent: "center", gap: 8 }}>
      {!running ? (
        <Button title="Start" onPress={start} />
      ) : (
        <Button title="Stop" onPress={stop} />
      )}
      <View style={{ height: 6 }} />
      <Button title="Reset" onPress={reset} />
    </View>
  );
}
