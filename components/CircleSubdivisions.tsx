import React, { useMemo, useRef, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { sectionsFromPattern, STRUCTURAL_PATTERN } from "../constants/Pulse";
import type { ActiveEvent } from "../types/Metronome";
import Dot from "./Dot";
import { useTheme } from "../contexts/ThemeContext";

type DotData = {
  key: string;
  sectionIdx: number;
  k: number;
  angle: number;
  x: number;
  y: number;
};

type Props = {
  size?: number;
  cycleMs: number;
  subdivisions: number[];
  activeEvent: ActiveEvent | null;
  soundMap: string[][];
  onDotPress: (sectionIdx: number, k: number) => void;
};

export default function CircleSubdivisions({
  size = 360,
  cycleMs,
  subdivisions,
  activeEvent,
  soundMap,
  onDotPress,
}: Props) {
  const theme = useTheme();
  const radius = size / 2 - 20;
  const center = size / 2;

  const onDotPressRef = useRef(onDotPress);
  useEffect(() => {
    onDotPressRef.current = onDotPress;
  }, [onDotPress]);

  const sections = useMemo(
    () => sectionsFromPattern({ cycleMs, pattern: STRUCTURAL_PATTERN }),
    [cycleMs]
  );

  const dotsData = useMemo(() => {
    const arr: DotData[] = [];
    if (sections.length === 0) return [];

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const n = subdivisions[i] ?? 1;
      const startAngle = 2 * Math.PI * (s.startMs / cycleMs) - Math.PI / 2;
      const sweep = 2 * Math.PI * (s.durMs / cycleMs);

      for (let k = 0; k < n; k++) {
        const angle = startAngle + sweep * (k / n);
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        arr.push({ key: `${i}-${k}`, sectionIdx: i, k, angle, x, y });
      }
    }
    return arr;
  }, [sections, subdivisions, cycleMs, center, radius]);

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: theme.metronome.muted,
          backgroundColor: theme.background,
        },
      ]}
    >
      {dotsData.map((d) => {
        const deg = (d.angle + Math.PI / 2) * (180 / Math.PI);
        const isActive =
          activeEvent?.section === d.sectionIdx && activeEvent?.k === d.k;

        const soundType = soundMap[d.sectionIdx]?.[d.k] ?? "sub";
        const isSilenced = soundType === "silence";

        const bgColor = isActive
          ? isSilenced
            ? theme.metronome.muted
            : theme.metronome.clave
          : soundType === "clave"
          ? theme.metronome.clave
          : soundType === "accent"
          ? theme.metronome.accent
          : theme.metronome.sub;

        return (
          <Dot
            key={d.key}
            x={d.x}
            y={d.y}
            deg={deg}
            bgColor={bgColor}
            isActive={!!isActive}
            isSilenced={isSilenced}
            onPress={() => onDotPressRef.current(d.sectionIdx, d.k)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 1,
  },
});
