// navigation/AppNavigator.tsx
import React, { useState } from "react";
import { SafeAreaView } from "react-native";
import StartScreen from "../screens/StartScreen";
import MetronomeModeScreen from "../screens/MetronomeModeScreen";
import type { Mode } from "../constants/Pulse";

export default function AppNavigator() {
  const [route, setRoute] = useState<"home" | Mode>("home");

  if (route === "home") {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <StartScreen onPick={(m) => setRoute(m)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MetronomeModeScreen mode={route} onBack={() => setRoute("home")} />
    </SafeAreaView>
  );
}
