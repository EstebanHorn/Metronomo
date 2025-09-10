import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
} from "react-native";
import * as Metronome from "metronome-native-audio";
import type { ActiveEvent, SoundRole as Role } from "../types/Metronome";
import { useTheme } from "../contexts/ThemeContext";
import { Colors } from "../constants/Colors";

// --- utils ---
function generatePulses(
  structuralPattern: readonly number[],
  subdivisions: number[],
  soundMap: Role[][]
) {
  type Pulse = Parameters<typeof Metronome.setPattern>[0][number];

  const pulses: Pulse[] = [];
  subdivisions.forEach((numBeats, sectionIdx) => {
    const structuralDuration = structuralPattern[sectionIdx];
    const durationPerBeat = structuralDuration / numBeats;
    for (let k = 0; k < numBeats; k++) {
      const raw =
        (soundMap[sectionIdx]?.[k] as Role) ?? ("cajon_relleno" as Role);
      pulses.push({
        durEighths: durationPerBeat,
        subdiv: 1,
        role: raw,
        pan: 0,
        sectionIdx,
        k,
      });
    }
  });
  return pulses;
}

function rotatePulsesByUnits(pulses: any[], units: number) {
  if (!units) return pulses;
  const totalUnits = pulses.reduce((s, p) => s + p.durEighths, 0);
  const shift = ((units % totalUnits) + totalUnits) % totalUnits;
  let acc = 0,
    idx = 0;
  for (; idx < pulses.length; idx++) {
    const nextAcc = acc + pulses[idx].durEighths;
    if (nextAcc > shift) break;
    acc = nextAcc;
  }
  return [...pulses.slice(idx), ...pulses.slice(0, idx)];
}

function hashSnapshot(
  structuralPattern: readonly number[],
  subdivisions: number[],
  soundMap: Role[][],
  phaseUnits: number
) {
  return JSON.stringify({
    structuralPattern,
    subdivisions,
    soundMap,
    phaseUnits,
  });
}

// --- component ---
type Props = {
  bpm: number;
  structuralPattern: readonly number[];
  subdivisions: number[];
  soundMap: Role[][];
  phaseUnits?: number;
  onReset?: () => void;
  onActive?: (ev: ActiveEvent | null) => void;
};

export default function VariablePulsePlayer({
  bpm,
  structuralPattern,
  subdivisions,
  soundMap,
  phaseUnits = 0,
  onReset,
  onActive,
}: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [running, setRunning] = useState(false);

  const subRef = useRef<{ remove: () => void } | null>(null);
  const runningRef = useRef(false);

  const structuralPatternRef = useRef(structuralPattern);
  const subdivisionsRef = useRef(subdivisions);
  const soundMapRef = useRef<Role[][]>(soundMap);
  const phaseUnitsRef = useRef(phaseUnits);

  useEffect(() => {
    structuralPatternRef.current = structuralPattern;
  }, [structuralPattern]);
  useEffect(() => {
    subdivisionsRef.current = subdivisions;
  }, [subdivisions]);
  useEffect(() => {
    soundMapRef.current = soundMap;
  }, [soundMap]);
  useEffect(() => {
    phaseUnitsRef.current = phaseUnits;
  }, [phaseUnits]);

  const pendingHashRef = useRef<string | null>(null);
  const lastAppliedHashRef = useRef<string | null>(null);

  const applyPatternNow = useCallback(async () => {
    const raw = generatePulses(
      structuralPatternRef.current,
      subdivisionsRef.current,
      soundMapRef.current
    );
    const shifted = rotatePulsesByUnits(raw, phaseUnitsRef.current);
    await Metronome.setPattern(shifted);

    // guardar hash aplicado
    lastAppliedHashRef.current = hashSnapshot(
      structuralPatternRef.current,
      subdivisionsRef.current,
      soundMapRef.current,
      phaseUnitsRef.current
    );
    pendingHashRef.current = null;
  }, []);

  const scheduleApplyOnBarline = useCallback(() => {
    const nextHash = hashSnapshot(
      structuralPatternRef.current,
      subdivisionsRef.current,
      soundMapRef.current,
      phaseUnitsRef.current
    );
    if (!runningRef.current) {
      if (lastAppliedHashRef.current !== nextHash) void applyPatternNow();
      return;
    }
    if (lastAppliedHashRef.current !== nextHash) {
      pendingHashRef.current = nextHash;
    }
  }, [applyPatternNow]);

  const stop = useCallback(() => {
    try {
      Metronome.stop();
    } catch {}
    if (subRef.current) subRef.current.remove();
    setRunning(false);
    runningRef.current = false;
    pendingHashRef.current = null;
    onActive?.(null);
  }, [onActive]);

  const start = useCallback(async () => {
    await Metronome.init({ sampleRate: 48000, bufferFrames: 1024 });
    await Metronome.setBpm(bpm);
    await applyPatternNow();

    if (subRef.current) subRef.current.remove();
    const sub = Metronome.onTick((_bar, section, k, tMsFromNative) => {
      if (pendingHashRef.current && section === 0 && k === 0) {
        void applyPatternNow();
      }
      const s =
        (soundMapRef.current[section]?.[k] as Role) ??
        ("cajon_relleno" as Role);

      // Emitimos SIEMPRE (la UI puede decidir estilo distinto para "silence")
      onActive?.({
        tMs: typeof tMsFromNative === "number" ? tMsFromNative : Date.now(),
        section,
        k,
        type: s,
        tick: section + k,
      });
    });
    subRef.current = { remove: () => sub.remove() };

    await Metronome.play();
    setRunning(true);
    runningRef.current = true;
  }, [bpm, applyPatternNow, onActive]);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (runningRef.current) Metronome.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    scheduleApplyOnBarline();
  }, [subdivisions, phaseUnits, soundMap, scheduleApplyOnBarline]);

  useEffect(() => {
    scheduleApplyOnBarline();
  }, [structuralPattern, scheduleApplyOnBarline]);

  const reset = () => {
    stop();
    onReset?.();
  };

  return (
    <View style={styles.container}>
      {!running ? (
        <TouchableOpacity style={styles.button} onPress={start}>
          <Text style={styles.buttonText}>Start</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.stopButton]}
          onPress={stop}
        >
          <Text style={[styles.buttonText, styles.stopButtonText]}>Stop</Text>
        </TouchableOpacity>
      )}
      <View style={{ height: 10 }} />
      <TouchableOpacity style={styles.resetButton} onPress={reset}>
        <Text style={styles.resetButtonText}>Reset</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 20,
      borderRadius: 999,
      backgroundColor: `${theme.ui.background}aa`,
      minWidth: 100,
      minHeight: 100,
    },
    button: {
      minWidth: 60,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.ui.accent,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.ui.accent,
      ...(Platform.OS === "ios"
        ? {
            shadowColor: theme.ui.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }
        : { boxShadow: "1px 4px 4px 0px rgba(0, 0, 0, 0.38)" }),
    },
    buttonText: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.ui.background,
    },
    stopButton: {
      backgroundColor: "#925656ff",
      borderColor: theme.ui.text,
    },
    stopButtonText: { color: theme.ui.background },
    resetButton: { paddingVertical: 4, paddingHorizontal: 12 },
    resetButtonText: {
      fontSize: 14,
      color: theme.ui.tabIconDefault,
      fontWeight: "500",
    },
  });
