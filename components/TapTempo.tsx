// components/TapTempo.tsx
import React, { useRef, useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Platform,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  onBpmChange: (bpm: number) => void;
  min?: number;
  max?: number;
  title?: string;
};

export default function TapTempo({
  onBpmChange,
  min = 30,
  max = 300,
  title = "TAP",
}: Props) {
  const theme = useTheme();
  const tapsRef = useRef<number[]>([]);

  const clamp = (x: number) => Math.max(min, Math.min(max, Math.round(x || 0)));

  const computeBpm = (taps: number[]) => {
    if (taps.length < 2) return null;
    const intervals = taps.slice(1).map((t, i) => t - taps[i]);
    // Promedio robusto: saco min y max si hay suficientes muestras
    let usable = intervals;
    if (intervals.length >= 4) {
      const sorted = [...intervals].sort((a, b) => a - b);
      usable = sorted.slice(1, sorted.length - 1);
    }
    const avg = usable.reduce((a, b) => a + b, 0) / usable.length;
    const bpm = 60000 / avg;
    return clamp(bpm);
  };

  const handleTap = () => {
    const now = Date.now();
    let taps = tapsRef.current;

    // Reset si pasó mucho tiempo entre taps
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      taps = [];
    }

    taps = [...taps, now].slice(-5);
    tapsRef.current = taps;

    const bpm = computeBpm(taps);
    if (bpm) {
      onBpmChange(bpm);
    }
  };

  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleTap}
        delayLongPress={400}
        style={styles.tapButton}
        activeOpacity={0.85}
      >
        <Text style={styles.tapText}>{title}</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      marginVertical: 8,
      gap: 4,
    },
    tapButton: {
      paddingHorizontal: 26,
      paddingVertical: 16,
      borderRadius: 999,
      backgroundColor: theme.tint,
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
    tapText: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.text,
    },
    subtext: {
      marginTop: 6,
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
    },
    hint: {
      fontSize: 12,
      color: theme.metronome.sub,
    },
  });
