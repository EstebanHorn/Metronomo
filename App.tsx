// App.tsx
import React from "react";
import {
  SafeAreaView,
  StatusBar,
  useColorScheme,
  Platform,
  View,
} from "react-native";
import { Colors } from "./constants/Colors";
import MetronomeTab from "./screens/MetronomeTab";
import { useFonts } from "expo-font";
import { useKeepAwake } from "expo-keep-awake";
import { ThemeContext } from "./contexts/ThemeContext"; // 1. Importamos el Context

export default function App() {
  const colorScheme = useColorScheme();
  useKeepAwake();

  // 2. Determinamos el objeto de tema completo a usar
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light;
  const barStyle = colorScheme === "dark" ? "light-content" : "dark-content";

  const [loaded] = useFonts({
    SpaceMono: require("./assets/fonts/Nexa-ExtraLight.ttf"),
  });

  if (!loaded) {
    return null;
  }

  // 3. Envolvemos la app con el ThemeContext.Provider
  return (
    <ThemeContext.Provider value={theme}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <StatusBar
          barStyle={barStyle}
          backgroundColor={
            Platform.OS === "android" ? theme.background : undefined
          }
        />
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <MetronomeTab />
        </View>
      </SafeAreaView>
    </ThemeContext.Provider>
  );
}
