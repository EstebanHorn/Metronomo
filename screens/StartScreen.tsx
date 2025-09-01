import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { PRESETS, PRESET_ORDER, type PresetId } from "../constants/presets";

export default function StartScreen({
  onPick,
}: {
  onPick: (preset: PresetId) => void;
}) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const compact = height < 700;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, padding: compact ? 14 : 20 },
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: theme.text, fontSize: compact ? 20 : 24 },
        ]}
      >
        Elegí un modo
      </Text>

      <View style={[styles.grid, { gap: compact ? 8 : 12 }]}>
        {PRESET_ORDER.map((id) => {
          const p = PRESETS[id];
          return (
            <Pressable
              key={id}
              onPress={() => onPick(id)}
              android_ripple={{ color: theme.metronome.muted }}
              style={({ pressed }) => [
                styles.card,
                {
                  borderColor: theme.metronome.muted,
                  backgroundColor: theme.background,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      p.meter === "binary16"
                        ? theme.metronome.clave
                        : theme.metronome.accent,
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {p.label}
                </Text>
                <Text
                  style={[styles.cardSubtitle, { color: theme.metronome.sub }]}
                >
                  {p.subtitle}
                </Text>
              </View>
              <Text style={[styles.chev, { color: theme.metronome.sub }]}>
                ›
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontWeight: "800", marginBottom: 10 },
  grid: {
    width: "100%",
    maxWidth: 560,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    minHeight: 78,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
        }
      : { elevation: 2 }),
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  chev: { fontSize: 22, opacity: 0.8, marginLeft: 8 },
});
