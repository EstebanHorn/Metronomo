import React from "react";
import {
  SafeAreaView,
  StatusBar,
  useColorScheme,
  Platform,
  View,
} from "react-native";
import { Colors } from "./constants/Colors";
import { useFonts } from "expo-font";
import { useKeepAwake } from "expo-keep-awake";
import { ThemeContext } from "./contexts/ThemeContext";
import AppNavigator from "./navigation/AppNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function App() {
  const colorScheme = useColorScheme();
  useKeepAwake();

  const theme = colorScheme === "dark" ? Colors.dark : Colors.light;
  const barStyle = colorScheme === "dark" ? "light-content" : "dark-content";

  const [loaded] = useFonts({
    SpaceMono: require("./assets/fonts/Nexa-ExtraLight.ttf"),
  });

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={theme}>
      <SafeAreaProvider
        style={{ flex: 1, backgroundColor: theme.ui.background }}
      >
        <StatusBar
          barStyle={barStyle}
          backgroundColor={
            Platform.OS === "android" ? theme.ui.background : undefined
          }
        />
        <View style={{ flex: 1, backgroundColor: theme.ui.background }}>
          <AppNavigator />
        </View>
      </SafeAreaProvider>
    </ThemeContext.Provider>
  );
}
