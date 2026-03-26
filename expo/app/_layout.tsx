import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { HockeyProvider } from "@/contexts/hockey-context";
import { OpponentsProvider } from "@/contexts/opponents-context";
import { MatchFeaturesProvider } from "@/contexts/match-features-context";
import { ThemeProvider, useTheme } from "@/contexts/theme-context";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="players" options={{ title: 'Players' }} />
      <Stack.Screen name="match-setup" options={{ title: 'Match Setup' }} />
      <Stack.Screen name="stats" options={{ title: 'Statistics' }} />
      <Stack.Screen name="opponents" options={{ title: 'Opponents' }} />
      <Stack.Screen name="player-profile" options={{ title: 'Player Profile' }} />
      <Stack.Screen name="match-history" options={{ title: 'Match History' }} />
      <Stack.Screen name="opponent-detail" options={{ title: 'Opponent' }} />
      <Stack.Screen name="match-detail" options={{ title: 'Match Detail' }} />
      <Stack.Screen name="season-dashboard" options={{ title: 'Season Dashboard' }} />
      <Stack.Screen name="player-compare" options={{ title: 'Compare Players' }} />
      <Stack.Screen name="pp-pk-dashboard" options={{ title: 'PP/PK Dashboard' }} />
      <Stack.Screen name="match-features" options={{ title: 'Match Features' }} />
      <Stack.Screen name="milestones" options={{ title: 'Milestones' }} />
      <Stack.Screen name="post-game-summary" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="team-chemistry" options={{ title: 'Team Chemistry' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <HockeyProvider>
          <OpponentsProvider>
            <MatchFeaturesProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <RootLayoutNav />
              </GestureHandlerRootView>
            </MatchFeaturesProvider>
          </OpponentsProvider>
        </HockeyProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
