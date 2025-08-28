// App.tsx
import React from "react";
import {
  SafeAreaView,
  StatusBar,
  useColorScheme,
  Platform,
  View,
} from "react-native";
import { Colors } from "./constants/Colors"; // ajustá si tu ruta es distinta
import MetronomeTab from "./screens/MetronomeTab"; // ajustá si tu ruta es distinta

// Opcional: mantener la pantalla despierta mientras practicás
// Instala expo-keep-awake si aún no está en tu proyecto:
//   npx expo install expo-keep-awake
import { useKeepAwake } from "expo-keep-awake";

export default function App() {
  const colorScheme = useColorScheme();
  useKeepAwake(); // evita que el teléfono se bloquee mientras corre el metrónomo

  const isDark = colorScheme === "dark";
  const bg =
    (isDark ? Colors.dark?.background : Colors.light?.background) || "#0b0b0b";
  const barStyle = isDark ? "light-content" : "dark-content";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <StatusBar
        barStyle={barStyle}
        backgroundColor={Platform.OS === "android" ? bg : undefined}
      />
      <View style={{ flex: 1, backgroundColor: bg }}>
        <MetronomeTab />
      </View>
    </SafeAreaView>
  );
}
