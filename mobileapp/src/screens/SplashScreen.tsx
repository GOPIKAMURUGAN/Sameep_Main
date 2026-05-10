import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>YNOT Vendor</Text>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.caption}>Preparing your workspace...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 24,
  },
  brand: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
  },
  caption: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
