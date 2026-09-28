import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { getDb } from "../src/db/client";
import { useAppTheme } from "../src/theme/useAppTheme";
import { useUiStore } from "../src/store/uiStore";
import { loadSettings } from "../src/data/settings";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const theme = useAppTheme();
  const hydrate = useUiStore((state) => state.hydrate);

  // Настройки читаются до первого рендера экранов: иначе приложение на кадр
  // показало бы светлую тему тому, кто выбрал тёмную.
  useEffect(() => {
    getDb()
      .then(loadSettings)
      .then((settings) => hydrate(settings.schemePreference))
      .catch(() => hydrate("light"))
      .finally(() => {
        setReady(true);
        SplashScreen.hideAsync().catch(() => {});
      });
  }, [hydrate]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
