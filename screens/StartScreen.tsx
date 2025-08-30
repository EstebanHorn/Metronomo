// screens/StartScreen.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

export default function StartScreen({
  onPick,
}: {
  onPick: (mode: "binary" | "ternary") => void;
}) {
  const theme = useTheme();

  const Card = ({
    title,
    subtitle,
    onPress,
    accent,
    testID,
  }: {
    title: string;
    subtitle: string;
    onPress: () => void;
    accent: string;
    testID?: string;
  }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={testID}
      onPress={onPress}
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
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.cardSubtitle, { color: theme.metronome.sub }]}>
          {subtitle}
        </Text>
      </View>
      <Text style={[styles.chevron, { color: theme.metronome.sub }]}>›</Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Elegí un modo</Text>
        <Text style={[styles.subtitle, { color: theme.metronome.sub }]}>
          5 secciones fijas: A · Á · B · C · B́
        </Text>
      </View>

      <View style={styles.cardsWrap}>
        <Card
          title="Binario"
          subtitle="Secciones: 3‑3‑4‑2‑4"
          onPress={() => onPick("binary")}
          accent={theme.metronome.clave}
          testID="start-binary"
        />
        <Card
          title="Ternario (12)"
          subtitle="Secciones: 2‑3‑2‑2‑3"
          onPress={() => onPick("ternary")}
          accent={theme.metronome.accent}
          testID="start-ternary"
        />
      </View>

      <View style={styles.footerHint}>
        <View
          style={[styles.dot, { backgroundColor: theme.metronome.clave }]}
        />
        <Text style={[styles.hintText, { color: theme.metronome.sub }]}>
          Clave
        </Text>
        <View
          style={[styles.dot, { backgroundColor: theme.metronome.accent }]}
        />
        <Text style={[styles.hintText, { color: theme.metronome.sub }]}>
          Acento
        </Text>
        <View style={[styles.dot, { backgroundColor: theme.metronome.sub }]} />
        <Text style={[styles.hintText, { color: theme.metronome.sub }]}>
          Pulso
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  header: { width: "100%", maxWidth: 480, marginBottom: 18 },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { marginTop: 4, fontSize: 14 },

  cardsWrap: {
    width: "100%",
    maxWidth: 520,
    gap: 12,
  },
  card: {
    width: "100%",
    minHeight: 82,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 14,
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
        }
      : { elevation: 2 }),
  },
  accentBar: { width: 8, alignSelf: "stretch" },
  cardContent: { flex: 1, paddingVertical: 14, paddingHorizontal: 14 },
  cardTitle: { fontSize: 18, fontWeight: "800", letterSpacing: 0.2 },
  cardSubtitle: { marginTop: 2, fontSize: 14 },
  chevron: { fontSize: 26, opacity: 0.8, marginLeft: 8 },

  footerHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  hintText: { fontSize: 12 },
});
