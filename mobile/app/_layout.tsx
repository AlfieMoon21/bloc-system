import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/context/auth';

// Sits inside AuthProvider so it can read auth state and redirect accordingly.
// Checks on every auth change: if not logged in and inside tabs → go to login.
// If logged in and outside tabs (e.g. on login screen) → go to tabs.
function RootNavigator() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (isLoading) return;
    const onAuthScreen = segments[0] === 'login' || segments[0] === 'register';
    if (!user && !onAuthScreen) router.replace('/login');
    else if (user && onAuthScreen) router.replace('/(tabs)');
  }, [user, isLoading, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="session/new" options={{ title: 'New Session' }} />
        <Stack.Screen name="session/[id]" options={{ title: 'Session' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
