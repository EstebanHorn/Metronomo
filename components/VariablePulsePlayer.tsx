import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  Button,
} from "react-native";
import * as Metronome from "metronome-native-audio";
import type { Pulse, Role } from "metronome-native-audio";
import type { ActiveEvent } from "../types/Metronome";
import { STRUCTURAL_PATTERN } from "../constants/Pulse";
import { useTheme } from "../contexts/ThemeContext";
import { Colors } from "../constants/Colors";

function generatePulses(subdivisions: number[], soundMap: string[][]): Pulse[] {
  const pulses: Pulse[] = [];
  subdivisions.forEach((numBeats, sectionIdx) => {
    const structuralDuration = STRUCTURAL_PATTERN[sectionIdx];
    const durationPerBeat = structuralDuration / numBeats;

    for (let k = 0; k < numBeats; k++) {
      let soundType = soundMap[sectionIdx]?.[k] ?? "sub";
      if (soundType === "sub") {
        soundType = "normal";
      }

      pulses.push({
        durEighths: durationPerBeat,
        subdiv: 1,
        role: soundType as Role,
        pan: 0,
        sectionIdx: sectionIdx,
        k: k,
      });
    }
  });
  return pulses;
}

// --- FUNCIÓN PROBLEMÁTICA ELIMINADA ---
// const findBeatFromAbsoluteIndex = ... (la borramos)

type Props = {
  bpm: number;
  subdivisions: number[];
  soundMap: string[][];
  onReset?: () => void;
  onActive?: (ev: ActiveEvent | null) => void;
};

export default function VariablePulsePlayer({
  bpm,
  subdivisions,
  soundMap,
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

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      stop();
    }
  }, [bpm, subdivisions, stop]);

  const buildAndSetPattern = useCallback(async () => {
    const newPattern = generatePulses(subdivisions, soundMap);
    await Metronome.setPattern(newPattern);
  }, [subdivisions, soundMap]);

  const applyConfig = useCallback(async () => {
    await Metronome.init({ sampleRate: 48000, bufferFrames: 1024 });
    await Metronome.setBpm(bpm);
    await buildAndSetPattern();
  }, [bpm, buildAndSetPattern]);

  useEffect(() => {
    void applyConfig();
  }, [applyConfig]);

  useEffect(() => {
    Metronome.setBpm(bpm);
    buildAndSetPattern();
  }, [bpm, subdivisions, soundMap, buildAndSetPattern]);

  const start = useCallback(async () => {
    await applyConfig();
    if (subRef.current) subRef.current.remove();

    // --- RECEPTOR SIMPLIFICADO ---
    const sub = Metronome.onTick((_bar, section, k, tMsFromNative) => {
      // Ahora `section` y `k` vienen directos y correctos desde Java.
      if (soundMap[section]?.[k] !== "silence") {
        onActive?.({
          tMs: typeof tMsFromNative === "number" ? tMsFromNative : Date.now(),
          section: section,
          k: k,
          type: k === 0 ? "clave" : "pulse",
          tick: section + k,
        });
      }
    });

    subRef.current = { remove: () => sub.remove() };
    Metronome.play();
    setRunning(true);
  }, [applyConfig, onActive, soundMap, subdivisions]);

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
      borderRadius: 999, // Círculo
      backgroundColor: `${theme.background}aa`, // Fondo semi-transparente
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
    buttonText: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.text,
    },
    stopButton: {
      backgroundColor: theme.metronome.sub, // Un color más oscuro para 'Stop'
      borderColor: theme.text,
    },
    stopButtonText: {
      color: theme.background,
    },
    resetButton: {
      paddingVertical: 4,
      paddingHorizontal: 12,
    },
    resetButtonText: {
      fontSize: 14,
      color: theme.metronome.sub,
      fontWeight: "500",
    },
  });
