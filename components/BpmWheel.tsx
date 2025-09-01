// components/BpmWheel.tsx
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
  FlatList,
  StyleSheet,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ListRenderItemInfo,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";

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
  const listRef = useRef<FlatList<number>>(null);

  // 5 filas visibles: dos arriba, una central, dos abajo
  const visibleRows = 3;
  const centerRow = Math.floor(visibleRows / 2); // 2
  const containerHeight = itemHeight * visibleRows;

  const data = useMemo(() => {
    const arr = Array.from({ length: max - min + 1 }, (_, i) => i + min);
    const pad = new Array(centerRow).fill(NaN); // 2 fantasma arriba y abajo
    return [...pad, ...arr, ...pad];
  }, [min, max, centerRow]);

  const initialIndex = value - min + centerRow;

  useEffect(() => {
    const targetIndex = value - min + centerRow;
    listRef.current?.scrollToOffset({
      offset: targetIndex * itemHeight,
      animated: false,
    });
  }, [value, min, itemHeight, centerRow]);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const rawIndex = Math.round(y / itemHeight);
    const numIndex = rawIndex - centerRow; // quitar padding superior
    const next = Math.max(min, Math.min(max, min + numIndex));
    if (Number.isFinite(next)) onChange(next);
  };

  // Para resaltar el centro en tiempo real
  const [offsetY, setOffsetY] = useState(0);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setOffsetY(e.nativeEvent.contentOffset.y);
  }, []);

  // opacidad y tamaño en función de la distancia al centro (0 = centro)
  const getItemStyle = (index: number) => {
    const currentIndexFloat = offsetY / itemHeight; // índice superior “virtual”
    const dist = Math.abs(index - currentIndexFloat - centerRow); // 0 en el centro

    let opacity = 0.25;
    if (dist < 0.5) opacity = 1;
    else if (dist < 1.5) opacity = 0.2;

    const scale = dist < 0.5 ? 1.08 : dist < 1.5 ? 1.0 : 0.96;

    return { opacity, transform: [{ scale }] };
  };

  const renderItem = ({ item, index }: ListRenderItemInfo<number>) => {
    const isGhost = Number.isNaN(item);
    const dynamicStyle = getItemStyle(index);

    return (
      <View style={[styles.item, { height: itemHeight }]}>
        {!isGhost && (
          <Text style={[styles.itemText, { color: theme.text }, dynamicStyle]}>
            {item}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.wrap, { height: containerHeight }]}>
      {/* Indicador central */}
      <View
        pointerEvents="none"
        style={[
          styles.centerLine,
          {
            top: (containerHeight - itemHeight) / 2,
            height: itemHeight,
            borderColor: theme.metronome.muted,
          },
        ]}
      />
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate={Platform.OS === "ios" ? 0.98 : "fast"}
        onMomentumScrollEnd={onMomentumEnd}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })}
        initialScrollIndex={initialIndex}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 92, position: "relative" },
  item: { alignItems: "center", justifyContent: "center" },
  itemText: {
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  centerLine: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
});
