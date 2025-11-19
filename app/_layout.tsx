import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { HockeyProvider } from "@/contexts/hockey-context";
import { OpponentsProvider } from "@/contexts/opponents-context";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="players" />
      <Stack.Screen name="match-setup" />
      <Stack.Screen name="stats" />
      <Stack.Screen name="opponents" />
      <Stack.Screen name="player-profile" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <HockeyProvider>
        <OpponentsProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <RootLayoutNav />
          </GestureHandlerRootView>
        </OpponentsProvider>
      </HockeyProvider>
    </QueryClientProvider>
  );
}
