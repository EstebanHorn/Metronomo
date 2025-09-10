import React, { useMemo } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { Colors } from "../constants/Colors";

type MeterType = "binary16" | "ternary12";

type Props = {
  names: ReadonlyArray<string>;
  subdivisions: ReadonlyArray<number>;
  onChange: (sectionIndex: number, value: number) => void;
  choices?: ReadonlyArray<number>;
  mtype: MeterType; // <-- tipado estricto
};

export default function SubdivisionSelector({
  names,
  subdivisions,
  onChange,
  choices = [2, 3, 4, 5, 6],
  mtype,
}: Props) {
  const theme = useTheme();

  const styles = useMemo(() => getStyles(theme, mtype), [theme, mtype]);

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
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Sección ${selectorText(name)}: ${val}`}
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.selectorDotText,
                      selected && styles.selectorDotTextSelected,
                    ]}
                  >
                    {val}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
const getStyles = (theme: typeof Colors.light, mtype: MeterType) => {
  const dotBg =
    mtype === "binary16" ? "rgba(124,58,237,0.12)" : "rgba(16,185,129,0.12)";

  return StyleSheet.create({
    selectorGrid: {
      gap: 6,
      width: "100%",
      maxWidth: 340,
      justifyContent: "center",
    },
    selectorRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 6,
    },
    selectorLabel: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.ui.text,
      width: 42,
      textAlign: "center",
    },
    selectorDotsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },

    selectorDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: theme.ui.divider,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.ui.accent + "2f",
      ...(Platform.OS === "ios"
        ? {
            shadowColor: theme.ui.text,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.18,
            shadowRadius: 1.6,
          }
        : { boxShadow: "1px 4px 4px 0px rgba(15, 15, 15, 0.35)" }),
    },
    selectorDotSelected: {
      backgroundColor: theme.ui.accent,
      borderColor: theme.ui.accent,
      ...(Platform.OS === "ios"
        ? { shadowOpacity: 0.3, shadowRadius: 2.5 }
        : { elevation: 4 }),
    },
    selectorDotText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.ui.text,
    },
    selectorDotTextSelected: {
      color: theme.ui.background,
    },
  });
};
