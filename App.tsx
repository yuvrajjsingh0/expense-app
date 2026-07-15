import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { RootNavigator } from "./app/navigation/RootNavigator";

/**
 * App root: installs the providers every screen relies on (gestures, safe area,
 * navigation) and nothing else. Screen wiring lives in RootNavigator.
 */
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
