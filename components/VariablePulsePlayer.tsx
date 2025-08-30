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

function generatePulses(
  structuralPattern: readonly number[],
  subdivisions: number[],
  soundMap: string[][]
): Pulse[] {
  const pulses: Pulse[] = [];
  subdivisions.forEach((numBeats, sectionIdx) => {
    const structuralDuration = structuralPattern[sectionIdx];
    const durationPerBeat = structuralDuration / numBeats; // en octavos

    for (let k = 0; k < numBeats; k++) {
      let soundType = (soundMap[sectionIdx]?.[k] ?? "sub") as string;
      if (soundType === "sub") soundType = "normal";

      pulses.push({
        durEighths: durationPerBeat,
        subdiv: 1,
        role: soundType as Role,
        pan: 0,
        sectionIdx,
        k,
      });
    }
  });
  return pulses;
}

type Props = {
  bpm: number;
  structuralPattern: readonly number[];
  subdivisions: number[];
  soundMap: string[][];
  onReset?: () => void;
  onActive?: (ev: ActiveEvent | null) => void;
};

export default function VariablePulsePlayer({
  bpm,
  structuralPattern,
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

  const stop = React.useCallback(() => {
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
  }, [bpm, subdivisions, structuralPattern, stop]);

  const buildAndSetPattern = useCallback(async () => {
    const newPattern = generatePulses(
      structuralPattern,
      subdivisions,
      soundMap
    );
    await Metronome.setPattern(newPattern);
  }, [structuralPattern, subdivisions, soundMap]);

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
  }, [bpm, subdivisions, structuralPattern, soundMap, buildAndSetPattern]);

  const start = useCallback(async () => {
    await applyConfig();
    if (subRef.current) subRef.current.remove();

    const sub = Metronome.onTick((_bar, section, k, tMsFromNative) => {
      if (soundMap[section]?.[k] !== "silence") {
        onActive?.({
          tMs: typeof tMsFromNative === "number" ? tMsFromNative : Date.now(),
          section,
          k,
          type: ((): ActiveEvent["type"] => {
            const sm = soundMap[section]?.[k];
            if (sm === "clave") return "clave";
            if (sm === "accent") return "accent";
            if (sm === "silence") return "silence";
            return "pulse"; // "sub" -> "pulse"
          })(),
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
    buttonText: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.text,
    },
    stopButton: {
      backgroundColor: theme.metronome.sub,
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
