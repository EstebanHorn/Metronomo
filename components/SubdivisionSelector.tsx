import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { Colors } from "../constants/Colors";

type Props = {
  names: ReadonlyArray<string>;
  subdivisions: ReadonlyArray<number>;
  onChange: (sectionIndex: number, value: number) => void;
  choices?: ReadonlyArray<number>;
};

export default function SubdivisionSelector({
  names,
  subdivisions,
  onChange,
  choices = [2, 3, 4, 5, 6],
}: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const selectorText = (name: string) => {
    switch (name) {
      case "A":
        return "I";
      case "Á":
        return "II";
      case "B":
        return "III";
      case "C":
        return "IV";
      case "B́":
        return "V";
      default:
        return name;
    }
  };

  return (
    <View style={styles.selectorGrid}>
      {names.map((name, rowIdx) => (
        <View style={styles.selectorRow} key={`row-${rowIdx}`}>
          <Text style={styles.selectorLabel}>{selectorText(name)}</Text>
          <View style={styles.selectorDotsRow}>
            {choices.map((val) => {
              const selected = subdivisions[rowIdx] === val;
              return (
                <TouchableOpacity
                  key={`s-${rowIdx}-${val}`}
                  onPress={() => onChange(rowIdx, val)}
                  style={[
                    styles.selectorDot,
                    selected && styles.selectorDotSelected,
                  ]}
                >
                  <Text style={styles.selectorDotText}>{val}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const getStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    selectorGrid: {
      gap: 4,
      width: "100%",
      maxWidth: 320,
      justifyContent: "center",
    },
    selectorRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingVertical: 4,
    },
    selectorLabel: { fontSize: 18, fontWeight: "500", color: theme.text },
    selectorDotsRow: { flexDirection: "row", gap: 8 },
    selectorDot: {
      width: 32,
      height: 32,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.metronome.muted,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.background,
      ...(Platform.OS === "ios"
        ? {
            shadowColor: theme.text,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1.41,
          }
        : { elevation: 2 }),
    },
    selectorDotSelected: {
      backgroundColor: theme.metronome.clave,
      borderColor: theme.metronome.activeGlow,
      ...(Platform.OS === "ios"
        ? { shadowOpacity: 0.3, shadowRadius: 2.5 }
        : { elevation: 4 }),
    },
    selectorDotText: { fontSize: 14, fontWeight: "600", color: theme.text },
  });
