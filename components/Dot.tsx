import React, { useMemo } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Platform,
  Text,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { Colors } from "../constants/Colors";

type DotProps = {
  x: number;
  y: number;
  deg: number;
  bgColor: string; // color ya resuelto según role
  isActive: boolean;
  isSilenced: boolean;
  onPress: () => void;
  label?: string; // romano opcional
  labelX?: number;
  labelY?: number;
};

const DOT_W = 16;
const DOT_H = 26;
const HALF_W = DOT_W / 2;
const HALF_H = DOT_H / 2;

const Dot = React.memo(function Dot({
  x,
  y,
  deg,
  bgColor,
  isActive,
  isSilenced,
  onPress,
  label,
  labelX,
  labelY,
}: DotProps) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const ACTIVE_SHADOW = Platform.select({
    ios: {
      shadowColor: theme.metronome.activeGlow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.8,
      shadowRadius: 10,
    },
    android: { elevation: 6 },
  });

  const DEFAULT_SHADOW = Platform.select({
    ios: {
      shadowColor: theme.ui.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 2.5,
    },
    android: { elevation: 3 },
  });

  const dynamicStyle = useMemo(
    () => [
      styles.dot,
      {
        left: x - HALF_W,
        top: y - HALF_H,
        transform: [{ rotate: `${deg}deg` }],
        backgroundColor: bgColor,
        borderColor: isActive ? theme.metronome.activeGlow : theme.ui.text,
      },
      isActive && !isSilenced ? ACTIVE_SHADOW : DEFAULT_SHADOW,
      isSilenced ? styles.silenced : null,
    ],
    [
      styles,
      x,
      y,
      deg,
      bgColor,
      isActive,
      isSilenced,
      ACTIVE_SHADOW,
      DEFAULT_SHADOW,
      theme.metronome.activeGlow,
      theme.ui.text,
    ]
  );

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={dynamicStyle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={label ? `Sección ${label}` : "Pulso"}
      />
      {label && typeof labelX === "number" && typeof labelY === "number" && (
        <View
          pointerEvents="none"
          style={[styles.labelWrap, { left: labelX, top: labelY }]}
        >
          <Text style={styles.labelText}>{label}</Text>
        </View>
      )}
    </>
  );
});

const getStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    dot: {
      position: "absolute",
      width: DOT_W,
      height: DOT_H,
      borderRadius: 7.5,
      borderWidth: 2,
    },
    silenced: { opacity: 0.45 },
    labelWrap: {
      position: "absolute",
      transform: [{ translateX: -8 }, { translateY: -8 }],
      minWidth: 16,
      minHeight: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    labelText: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.ui.text,
      includeFontPadding: false,
      textAlignVertical: "center",
      textAlign: "center",
    },
  });

export default Dot;
