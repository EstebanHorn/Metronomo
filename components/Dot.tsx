import React, { useMemo } from "react";
import { TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { Colors } from "../constants/Colors";

type DotProps = {
  x: number;
  y: number;
  deg: number;
  bgColor: string;
  isActive: boolean;
  isSilenced: boolean;
  onPress: () => void;
};

const Dot = React.memo(function Dot({
  x,
  y,
  deg,
  bgColor,
  isActive,
  isSilenced,
  onPress,
}: DotProps) {
  const theme = useTheme();

  const SHADOW_ACTIVE = Platform.select({
    ios: {
      shadowColor: theme.metronome.activeGlow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.8,
      shadowRadius: 12,
    },
    android: {
      boxShadow: `0px 4px 8px 2px ${theme.metronome.activeGlow}`,
      backgroundColor: theme.metronome.activeGlow,
    },
  });

  const SHADOW_DEFAULT = Platform.select({
    ios: {
      shadowColor: theme.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
    },
    android: {
      elevation: 4,
    },
  });

  const styles = useMemo(() => getStyles(theme), [theme]);

  const dynamicStyle = useMemo(
    () => [
      styles.dot,
      {
        left: x - 8.5,
        top: y - 13.5,
        transform: [{ rotate: `${deg}deg` }],
        backgroundColor: bgColor,
      },
      isActive && !isSilenced ? SHADOW_ACTIVE : SHADOW_DEFAULT,
      isSilenced ? styles.silenced : null,
    ],
    [
      x,
      y,
      deg,
      bgColor,
      isActive,
      isSilenced,
      styles,
      SHADOW_ACTIVE,
      SHADOW_DEFAULT,
    ]
  );

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={dynamicStyle}
    />
  );
});

const getStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    dot: {
      position: "absolute",
      width: 15,
      height: 25,
      borderRadius: 7.5,
      borderWidth: 1,
      borderColor: theme.text,
    },
    silenced: {
      opacity: 0.45,
    },
  });

export default Dot;
