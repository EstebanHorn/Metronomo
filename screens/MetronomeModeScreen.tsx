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
import TapTempo from "../components/TapTempo";
import SubdivisionSelector from "../components/SubdivisionSelector";

type SoundType = "clave" | "accent" | "silence" | "sub";

export default function MetronomeModeScreen({
  presetId,
  onBack,
}: {
  presetId: PresetId;
  onBack?: () => void;
}) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
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

  const setSubdivisionForSection = (i: number, v: number) =>
    setSubdivisions((prev) => prev.map((x, j) => (j === i ? v : x)));

  const onDotPress = (sectionIdx: number, k: number) => {
    setSoundMap((prev) =>
      prev.map((row, i) => {
        if (i !== sectionIdx) return row;
        const next = [...row];
        const curr = next[k] as SoundType;
        if (k === 0) {
          next[k] = curr === "clave" ? "silence" : "clave";
        } else {
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

  const shortSide = Math.min(width, height);
  const circleSize = Math.max(180, Math.min(shortSide * 0.9, 520));

  const styles = getStyles(theme);

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
          <BpmWheel
            value={bpm}
            onChange={(n) => setBpm(clampBpm(n))}
            min={30}
            max={300}
          />
          <TapTempo onBpmChange={(n) => setBpm(n)} min={30} max={300} />
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
                onActive={setActiveEvent}
                onReset={onReset}
              />
            </View>
          </View>

          <SubdivisionSelector
            names={SECTION_NAMES}
            subdivisions={subdivisions}
            onChange={setSubdivisionForSection}
          />
        </View>
      </View>
    </View>
  );
}

const getStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    main: {
      flex: 1,
      height: "100%",
      width: "100%",
      paddingHorizontal: 10,
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "flex-start",
      marginBottom: 5,
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

    bpmContainer: {
      marginBottom: 20,
      gap: 8,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
    },

    beatsContainer: {
      alignItems: "center",
      justifyContent: "space-around",
      flex: 1,
      gap: 12,
      width: "100%",
      marginTop: 5,
    },
    circleWrap: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    },
    playOverlay: { position: "absolute" },

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
