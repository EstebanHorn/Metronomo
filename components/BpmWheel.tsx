import React, {
  useMemo,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { Colors } from "../constants/Colors";

type Props = {
  value: number;
  onChange: (bpm: number) => void;
  min?: number;
  max?: number;
  itemHeight?: number;
};

export default function BpmWheel({
  value,
  onChange,
  min = 30,
  max = 300,
  itemHeight = 36,
}: Props) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const userIsScrolling = useRef(false);

  const styles = useMemo(() => getStyles(theme), [theme]);

  const visibleRows = 3;
  const centerRow = 1; // resaltamos la fila del medio
  const containerHeight = itemHeight * visibleRows;

  // Datos "reales"
  const data = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, i) => i + min),
    [min, max]
  );

  // Fantasmas arriba/abajo para poder centrar el medio
  const paddedData = useMemo(
    () => [null, ...data, null], // centerRow = 1 -> una celda fantasma arriba y abajo
    [data]
  );

  // Al iniciar/actualizar, scrolleo al índice real (sin restar centerRow)
  useEffect(() => {
    userIsScrolling.current = false;
    const targetIndex = value - min; // 0..N-1 dentro de "data"
    const y = targetIndex * itemHeight; // como hay 1 fantasma arriba, el centro queda correcto
    // Usá animated:false para evitar redondeos iniciales raros
    scrollRef.current?.scrollTo({ y, animated: false });
  }, [value, min, itemHeight]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!userIsScrolling.current) return;
    userIsScrolling.current = false;

    const y = e.nativeEvent.contentOffset.y;
    // y/itemHeight me da el índice "real" en data (0..N-1)
    const rawIndex = Math.round(y / itemHeight);
    const next = Math.max(min, Math.min(max, min + rawIndex));
    if (Number.isFinite(next)) onChange(next);
  };

  const handleScrollBegin = () => {
    userIsScrolling.current = true;
  };

  const [offsetY, setOffsetY] = useState(0);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setOffsetY(e.nativeEvent.contentOffset.y);
  }, []);

  // Resaltado: el índice destacado en paddedData es (offsetY/itemHeight + centerRow)
  const getItemStyle = (paddedIndex: number) => {
    const currentIndexFloat = offsetY / itemHeight;
    const highlightIndex = currentIndexFloat + centerRow; // en paddedData
    const dist = Math.abs(paddedIndex - highlightIndex);

    let opacity = 0.25;
    if (dist < 0.5) opacity = 1;
    else if (dist < 1.5) opacity = 0.2;

    const scale = dist < 0.5 ? 1.08 : dist < 1.5 ? 1.0 : 0.96;

    return { opacity, transform: [{ scale }] };
  };

  return (
    <View style={[styles.wrap, { height: containerHeight }]}>
      <View
        pointerEvents="none"
        style={[
          styles.centerLine,
          {
            top: (containerHeight - itemHeight) / 2, // línea en el medio
            height: itemHeight,
          },
        ]}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate={Platform.OS === "ios" ? 0.98 : "fast"}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={onMomentumEnd}
        onScroll={onScroll}
        scrollEventThrottle={16}
        overScrollMode="never"
        nestedScrollEnabled
        // Sin padding: usamos filas fantasma reales
        contentContainerStyle={undefined}
      >
        {paddedData.map((item, i) => (
          <View
            key={i}
            style={{
              height: itemHeight,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {item != null ? (
              <Text style={[styles.itemText, getItemStyle(i)]}>{item}</Text>
            ) : (
              <View />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const getStyles = (theme: typeof Colors.light) =>
  StyleSheet.create({
    wrap: {
      width: 92,
      position: "relative",
      borderRadius: 12,
    },
    itemText: {
      fontSize: 20,
      fontWeight: "800",
      letterSpacing: 1.5,
      color: theme.ui.text,
    },
    centerLine: {
      position: "absolute",
      left: 0,
      right: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.ui.divider,
    },
  });
