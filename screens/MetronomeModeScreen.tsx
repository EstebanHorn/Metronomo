import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import VariablePulsePlayer from "../components/VariablePulsePlayer";
import CircleSubdivisions from "../components/CircleSubdivisions";
import { Colors } from "../constants/Colors";
import { PRESETS, type PresetId, SECTION_NAMES } from "../constants/presets";
import type { ActiveEvent } from "../types/Metronome";
import BpmWheel from "../components/BpmWheel";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SoundType =
  | "clave"
  | "accent"
  | "pulseA"
  | "pulseB"
  | "ghost"
  | "silence"
  | "sub";

export default function MetronomeModeScreen({
  presetId,
  onBack,
}: {
  presetId: PresetId;
  onBack?: () => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const preset = PRESETS[presetId];

  const [bpm, setBpm] = useState<number>(110);
  const [subdivisions, setSubdivisions] = useState<number[]>([
    ...preset.INITIAL_SUBDIVISIONS,
  ]);
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [soundMap, setSoundMap] = useState<SoundType[][]>(() =>
    preset.DEFAULT_SOUND_MAP.map((r) => [...r])
  );

  const insets = useSafeAreaInsets();

  useEffect(() => {
    setSubdivisions([...preset.INITIAL_SUBDIVISIONS]);
    setSoundMap(preset.DEFAULT_SOUND_MAP.map((r) => [...r]));
    setActiveEvent(null);
  }, [presetId]);

  const totalUnits = useMemo(
    () => preset.STRUCTURAL_PATTERN.reduce((a, b) => a + b, 0),
    [presetId]
  );
  const cycleMs = useMemo(
    () => (60000 / bpm) * (totalUnits / 2),
    [bpm, totalUnits]
  );

  const clampBpm = (x: number) =>
    Math.max(30, Math.min(300, Math.round(x || 0)));
  const bpmMinus = (d = 5) => setBpm((x) => clampBpm(x - d));
  const bpmPlus = (d = 5) => setBpm((x) => clampBpm(x + d));

  const setSubdivisionForSection = (i: number, v: number) =>
    setSubdivisions((prev) => prev.map((x, j) => (j === i ? v : x)));

  const onDotPress = (sectionIdx: number, k: number) => {
    setSoundMap((prev) =>
      prev.map((row, i) => {
        if (i !== sectionIdx) return row;
        const next = [...row];
        const curr = next[k] as SoundType;
        if (k === 0) {
          // cabeza de sección: clave <-> silence
          next[k] = curr === "clave" ? "silence" : "clave";
        } else {
          // golpes internos: sub -> accent -> silence -> sub
          next[k] =
            curr === "sub" ? "accent" : curr === "accent" ? "silence" : "sub";
        }
        return next;
      })
    );
  };

  const onReset = () => {
    setSubdivisions([...preset.INITIAL_SUBDIVISIONS]);
    setSoundMap(preset.DEFAULT_SOUND_MAP.map((r) => [...r]));
    setActiveEvent(null);
  };

  const circleSize = Math.max(220, Math.min(width - 50, 520));
  const PATTERN_CHOICES = [2, 3, 4, 5];
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
    <View style={{ flex: 1, paddingBottom: insets.bottom }}>
      <View style={styles.main}>
        <View style={styles.headerRow}>
          {onBack && (
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <Text style={styles.backBtnText}>← Inicio</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>{preset.label}</Text>
        </View>

        <View style={styles.bpmContainer}>
          <View style={styles.bpmButtonsRow}>
            <TouchableOpacity onPress={() => bpmMinus(1)} style={styles.btn}>
              <Text style={styles.btnText}>-1</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => bpmMinus(5)} style={styles.btn}>
              <Text style={styles.btnText}>-5</Text>
            </TouchableOpacity>

            {/* Rueda scrolleable de BPM */}
            <BpmWheel
              value={bpm}
              onChange={(n) => setBpm(clampBpm(n))}
              min={30}
              max={300}
            />

            <TouchableOpacity onPress={() => bpmPlus(5)} style={styles.btn}>
              <Text style={styles.btnText}>+5</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => bpmPlus(1)} style={styles.btn}>
              <Text style={styles.btnText}>+1</Text>
            </TouchableOpacity>
          </View>
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
              structuralPattern={preset.STRUCTURAL_PATTERN}
              phaseUnits={preset.PHASE_UNITS}
              activeEvent={activeEvent}
              soundMap={soundMap}
              onDotPress={onDotPress}
            />
            <View style={styles.playOverlay} pointerEvents="box-none">
              <VariablePulsePlayer
                bpm={bpm}
                structuralPattern={preset.STRUCTURAL_PATTERN}
                subdivisions={subdivisions}
                soundMap={soundMap}
                phaseUnits={preset.PHASE_UNITS}
                onActive={setActiveEvent}
                onReset={onReset}
              />
            </View>
          </View>

          <View style={styles.selectorGrid}>
            {SECTION_NAMES.map((name, rowIdx) => (
              <View style={styles.selectorRow} key={`row-${rowIdx}`}>
                <Text style={styles.selectorLabel}>{selectorText(name)}</Text>
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
    </View>
  );
}

const getStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    scrollContainer: { flexGrow: 1, justifyContent: "center" },
    main: {
      paddingHorizontal: 10,
      backgroundColor: theme.background,
      alignItems: "center",
    },
    headerRow: {
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      gap: 4,
      flexDirection: "row",
    },
    backBtn: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.metronome.muted,
    },
    backBtnText: {
      color: theme.text,
      textAlign: "left",
    },
    title: { fontSize: 18, fontWeight: "700", color: theme.text },

    bpmContainer: { marginBottom: 20, gap: 8, alignItems: "center" },
    bpmLabel: { fontSize: 16, fontWeight: "600", color: theme.text },
    bpmButtonsRow: { flexDirection: "row", alignItems: "center", gap: 8 },

    infoText: { marginTop: 6, fontSize: 16, color: theme.metronome.sub },

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
      justifyContent: "space-around",
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
    btnText: { fontSize: 14, fontWeight: "bold", color: theme.text },
  });
