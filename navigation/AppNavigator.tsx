import React, { useState } from "react";
import { View } from "react-native";
import StartScreen from "../screens/StartScreen";
import MetronomeModeScreen from "../screens/MetronomeModeScreen";
import type { PresetId } from "../constants/presets";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AppNavigator() {
  const [route, setRoute] = useState<
    { name: "home" } | { name: "preset"; id: PresetId }
  >({ name: "home" });

  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, flex: 1 }}>
      {route.name === "home" ? (
        <StartScreen onPick={(id) => setRoute({ name: "preset", id })} />
      ) : (
        <MetronomeModeScreen
          presetId={route.id}
          onBack={() => setRoute({ name: "home" })}
        />
      )}
    </View>
  );
}
