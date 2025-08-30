import { Colors } from "../constants/Colors";
import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Platform,
} from "react-native";
import VariablePulsePlayer from "../components/VariablePulsePlayer";
import {
  STRUCTURAL_PATTERN,
  SECTION_NAMES,
  INITIAL_SUBDIVISIONS,
} from "../constants/Pulse";
import CircleSubdivisions from "../components/CircleSubdivisions";
import type { ActiveEvent } from "../types/Metronome";
import { useTheme } from "../contexts/ThemeContext";

type SoundType = "clave" | "sub" | "accent" | "silence";

const initializeSoundMap = (pattern: readonly number[]): SoundType[][] => {
  return pattern.map((numBeats) =>
    Array.from({ length: numBeats }, (_, k) => (k === 0 ? "clave" : "sub"))
  );
};

const totalStructuralUnits = STRUCTURAL_PATTERN.reduce((a, b) => a + b, 0);

export default function MetronomeTab() {
  const theme = useTheme(); // Obtenemos el tema del contexto
  const { width } = useWindowDimensions();
  const [bpm, setBpm] = useState<number>(110);
  const [subdivisions, setSubdivisions] = useState<number[]>([
    ...INITIAL_SUBDIVISIONS,
  ]);

  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [soundMap, setSoundMap] = useState<SoundType[][]>(() =>
    initializeSoundMap(INITIAL_SUBDIVISIONS)
  );

  useEffect(() => {
    setSoundMap((prev) =>
      subdivisions.map((n, i) => {
        const oldRow = prev[i] ?? [];
        const newRow: SoundType[] = Array.from({ length: n }, (_, k) =>
          k === 0 ? "clave" : "sub"
        );
        for (let k = 0; k < Math.min(oldRow.length, newRow.length); k++) {
          newRow[k] = oldRow[k];
        }
        return newRow;
      })
    );
  }, [subdivisions]);

  const cycleMs = useMemo(
    () => (60000 / bpm) * (totalStructuralUnits / 2),
    [bpm]
  );

  const clampBpm = (x: number) =>
    Math.max(30, Math.min(300, Math.round(x || 0)));
  const bpmMinus = (d = 5) => setBpm((x) => clampBpm(x - d));
  const bpmPlus = (d = 5) => setBpm((x) => clampBpm(x + d));
  const bpmFromInput = (txt: string) => {
    const n = parseInt(txt.replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) setBpm(clampBpm(n));
  };

  const setSubdivisionForSection = (sectionIdx: number, value: number) => {
    setSubdivisions((prev) =>
      prev.map((v, i) => (i === sectionIdx ? value : v))
    );
  };

  const onDotPress = (sectionIdx: number, k: number) => {
    setSoundMap((prev) =>
      prev.map((row, i) => {
        if (i !== sectionIdx) return row;
        const nextRow = [...row];
        const currentSound = nextRow[k];
        let nextSound: SoundType = currentSound;

        if (k === 0) {
          if (currentSound === "clave") nextSound = "silence";
          else nextSound = "clave";
        } else {
          if (currentSound === "sub") nextSound = "accent";
          else if (currentSound === "accent") nextSound = "silence";
          else nextSound = "sub";
        }
        nextRow[k] = nextSound;
        return nextRow;
      })
    );
  };

  const onReset = () => {
    setSubdivisions([...INITIAL_SUBDIVISIONS]);
    setSoundMap(initializeSoundMap(INITIAL_SUBDIVISIONS));
  };

  const PATTERN_CHOICES = [2, 3, 4, 5];
  const circleSize = Math.max(220, Math.min(width - 40, 520));

  // Pasamos el tema a la función que crea los estilos
  const styles = getStyles(theme);

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.main}>
        <View style={styles.bpmContainer}>
          <Text style={styles.bpmLabel}>BPM:</Text>
          <View style={styles.bpmButtonsRow}>
            <TouchableOpacity onPress={() => bpmMinus(1)} style={styles.btn}>
              <Text style={styles.btnText}>-1</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => bpmMinus(5)} style={styles.btn}>
              <Text style={styles.btnText}>-5</Text>
            </TouchableOpacity>
            <TextInput
              value={String(bpm)}
              onChangeText={bpmFromInput}
              onBlur={() => setBpm((c) => clampBpm(c))}
              keyboardType="numeric"
              style={styles.bpmInput}
              placeholderTextColor={theme.metronome.muted}
            />
            <TouchableOpacity onPress={() => bpmPlus(5)} style={styles.btn}>
              <Text style={styles.btnText}>+5</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => bpmPlus(1)} style={styles.btn}>
              <Text style={styles.btnText}>+1</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.infoText}>Ciclo: {cycleMs.toFixed(0)} ms</Text>
        </View>

        <View style={styles.beatsContainer}>
          <View
            style={[
              styles.circleWrap,
              { width: circleSize, height: circleSize },
            ]}
          >
            <CircleSubdivisions
              size={circleSize}
              cycleMs={cycleMs}
              subdivisions={subdivisions}
              activeEvent={activeEvent}
              soundMap={soundMap}
              onDotPress={onDotPress}
            />
            <View style={styles.playOverlay} pointerEvents="box-none">
              <VariablePulsePlayer
                bpm={bpm}
                subdivisions={subdivisions}
                soundMap={soundMap}
                onActive={setActiveEvent}
                onReset={onReset}
              />
            </View>
          </View>

          <View style={styles.selectorGrid}>
            {SECTION_NAMES.map((name, rowIdx) => (
              <View style={styles.selectorRow} key={`row-${rowIdx}`}>
                <Text style={styles.selectorLabel}>{name}</Text>
                <View style={styles.selectorDotsRow}>
                  {PATTERN_CHOICES.map((val) => {
                    const selected = subdivisions[rowIdx] === val;
                    return (
                      <TouchableOpacity
                        key={`s-${rowIdx}-${val}`}
                        onPress={() => setSubdivisionForSection(rowIdx, val)}
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
        </View>
      </View>
    </ScrollView>
  );
}

const getStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    scrollContainer: { flexGrow: 1, justifyContent: "center" },
    main: {
      paddingVertical: 20,
      paddingHorizontal: 10,
      backgroundColor: theme.background,
      alignItems: "center",
    },
    bpmContainer: { marginBottom: 20, gap: 8, alignItems: "center" },
    bpmLabel: { fontSize: 16, fontWeight: "600", color: theme.text },
    bpmButtonsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    bpmInput: {
      minWidth: 70,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 2,
      borderColor: theme.metronome.activeGlow,
      borderRadius: 8,
      textAlign: "center",
      fontSize: 30,
      fontWeight: "bold",
      backgroundColor: theme.background,
      color: theme.text,
    },
    infoText: {
      marginTop: 6,
      fontSize: 16,
      color: theme.metronome.sub,
    },
    beatsContainer: {
      alignItems: "center",
      gap: 30,
      width: "100%",
      marginTop: 20,
    },
    circleWrap: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    },
    playOverlay: { position: "absolute" },
    selectorGrid: { gap: 10, width: "100%", maxWidth: 320 },
    selectorRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
    },
    selectorLabel: { fontSize: 18, fontWeight: "500", color: theme.text },
    selectorDotsRow: { flexDirection: "row", gap: 8 },
    selectorDot: {
      width: 36,
      height: 36,
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
    btn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.tint,
      borderWidth: 2,
      borderColor: theme.metronome.activeGlow,
      borderRadius: 8,
      ...(Platform.OS === "ios"
        ? {
            shadowColor: theme.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }
        : { elevation: 5 }),
    },
    btnText: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.text,
    },
  });
