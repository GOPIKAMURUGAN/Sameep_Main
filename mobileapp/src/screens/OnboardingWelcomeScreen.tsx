import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "OnboardingWelcome">;

const onboardingModules = [
  "Category and business setup",
  "Google business connect",
  "OTP verification",
  "Trust profile questions",
  "Services and menu setup",
  "Domain and website preview",
];

export function OnboardingWelcomeScreen({ navigation }: Props) {
  const { completeOnboarding } = useAuth();

  async function handleContinue() {
    await completeOnboarding("phase1-demo-vendor");
    navigation.replace("DashboardHome");
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.kicker}>Phase 1</Text>
        <Text style={styles.title}>Vendor onboarding app foundation is ready</Text>
        <Text style={styles.copy}>
          The next phase will convert the existing onboarding journey into mobile-first
          screens using the same backend APIs you already have.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upcoming onboarding modules</Text>
          {onboardingModules.map((item) => (
            <View key={item} style={styles.listRow}>
              <View style={styles.dot} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton label="Open dashboard shell" onPress={handleContinue} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 32,
    gap: 24,
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
  },
  copy: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 22,
    gap: 14,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  listText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
});
