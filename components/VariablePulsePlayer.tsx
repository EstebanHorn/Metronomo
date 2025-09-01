// components/VariablePulsePlayer.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
} from "react-native";
import * as Metronome from "metronome-native-audio";
import type { Pulse, Role } from "metronome-native-audio";
import type { ActiveEvent } from "../types/Metronome";
import { useTheme } from "../contexts/ThemeContext";
import { Colors } from "../constants/Colors";

// --- utils ---
function soundToRole(s: string): Role {
  // Conservamos roles explícitos para que el motor use el sample correcto
  if (s === "clave") return "clave" as Role;
  if (s === "accent") return "accent" as Role;
  if (s === "silence") return "silence" as Role;
  // "sub" y cualquier otro cae en "normal"
  return "normal" as Role;
}

function generatePulses(
  structuralPattern: readonly number[],
  subdivisions: number[],
  soundMap: string[][]
): Pulse[] {
  const pulses: Pulse[] = [];
  subdivisions.forEach((numBeats, sectionIdx) => {
    const structuralDuration = structuralPattern[sectionIdx];
    const durationPerBeat = structuralDuration / numBeats; // octavos “estructurales”
    for (let k = 0; k < numBeats; k++) {
      const raw = (soundMap[sectionIdx]?.[k] ?? "sub") as string;
      const role = soundToRole(raw);
      pulses.push({
        durEighths: durationPerBeat,
        subdiv: 1,
        role, // <-- ahora respeta "accent"
        pan: 0,
        sectionIdx,
        k,
      });
    }
  });
  return pulses;
}

// Rota la timeline en UNIDADES (octavos estructurales)
function rotatePulsesByUnits(pulses: Pulse[], units: number): Pulse[] {
  if (!units) return pulses;
  const totalUnits = pulses.reduce((s, p) => s + p.durEighths, 0);
  const shift = ((units % totalUnits) + totalUnits) % totalUnits;

  let acc = 0;
  let idx = 0;
  for (; idx < pulses.length; idx++) {
    const nextAcc = acc + pulses[idx].durEighths;
    if (nextAcc > shift) break;
    acc = nextAcc;
  }
  return [...pulses.slice(idx), ...pulses.slice(0, idx)];
}

type Props = {
  bpm: number;
  structuralPattern: readonly number[];
  subdivisions: number[];
  soundMap: string[][];
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
  const isInitialMount = useRef(true);

  const stop = useCallback(() => {
    try {
      Metronome.stop();
    } catch {}
    if (subRef.current) subRef.current.remove();
    setRunning(false);
    onActive?.(null);
  }, [onActive]);

  // (Re)construir patrón y aplicar BPM
  const buildAndSetPattern = useCallback(async () => {
    const raw = generatePulses(structuralPattern, subdivisions, soundMap);
    const shifted = rotatePulsesByUnits(raw, phaseUnits);
    await Metronome.setPattern(shifted);
  }, [structuralPattern, subdivisions, soundMap, phaseUnits]);

  const applyConfig = useCallback(async () => {
    await Metronome.init({ sampleRate: 48000, bufferFrames: 1024 });
    await Metronome.setBpm(bpm);
    await buildAndSetPattern();
  }, [bpm, buildAndSetPattern]);

  useEffect(() => {
    void applyConfig();
  }, [applyConfig]);

  // Si cambian parámetros críticos, paramos (para evitar desfasajes)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      stop();
    }
  }, [bpm, subdivisions, structuralPattern, phaseUnits, stop]);

  // Actualiza BPM y patrón sin reiniciar si corre
  useEffect(() => {
    Metronome.setBpm(bpm);
    buildAndSetPattern();
  }, [
    bpm,
    subdivisions,
    structuralPattern,
    soundMap,
    phaseUnits,
    buildAndSetPattern,
  ]);

  const start = useCallback(async () => {
    await applyConfig();
    if (subRef.current) subRef.current.remove();

    const sub = Metronome.onTick((_bar, section, k, tMsFromNative) => {
      const s = (soundMap[section]?.[k] ?? "sub") as string;
      if (s !== "silence") {
        const normalizedType: ActiveEvent["type"] =
          s === "clave" ? "clave" : s === "accent" ? "accent" : "pulse";
        onActive?.({
          tMs: typeof tMsFromNative === "number" ? tMsFromNative : Date.now(),
          section,
          k,
          type: normalizedType,
          tick: section + k,
        });
      }
    });

    subRef.current = { remove: () => sub.remove() };
    Metronome.play();
    setRunning(true);
  }, [applyConfig, onActive, soundMap]);

  useEffect(() => () => stop(), [stop]);

  const reset = useCallback(() => {
    stop();
    onReset?.();
  }, [stop, onReset]);

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
      backgroundColor: `${theme.background}aa`,
      minWidth: 100,
      minHeight: 100,
    },
    button: {
      minWidth: 60,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.tint,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.metronome.activeGlow,
      ...(Platform.OS === "ios"
        ? {
            shadowColor: theme.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }
        : { elevation: 5 }),
    },
    buttonText: { fontSize: 18, fontWeight: "bold", color: theme.text },
    stopButton: {
      backgroundColor: theme.metronome.sub,
      borderColor: theme.text,
    },
    stopButtonText: { color: theme.background },
    resetButton: { paddingVertical: 4, paddingHorizontal: 12 },
    resetButtonText: {
      fontSize: 14,
      color: theme.metronome.sub,
      fontWeight: "500",
    },
  });
