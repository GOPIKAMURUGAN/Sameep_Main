import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { DashboardHomeScreen } from "../screens/DashboardHomeScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { OnboardingWelcomeScreen } from "../screens/OnboardingWelcomeScreen";
import { SplashScreen } from "../screens/SplashScreen";
import { colors } from "../theme/colors";

export type RootStackParamList = {
  Login: undefined;
  OnboardingWelcome: undefined;
  DashboardHome: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: "transparent",
    primary: colors.primary,
  },
};

export function AppNavigator() {
  const { ready, authToken, onboardingComplete } = useAuth();

  if (!ready) {
    return <SplashScreen />;
  }

  const initialRouteName = !authToken
    ? "Login"
    : onboardingComplete
      ? "DashboardHome"
      : "OnboardingWelcome";

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        {!authToken ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : onboardingComplete ? (
          <Stack.Screen name="DashboardHome" component={DashboardHomeScreen} />
        ) : (
          <Stack.Screen
            name="OnboardingWelcome"
            component={OnboardingWelcomeScreen}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
