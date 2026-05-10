import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme/colors";

const modules = [
  {
    title: "Onboarding",
    description: "Convert the current onboarding journey into mobile screens.",
  },
  {
    title: "Prices & My Menu",
    description: "Manage standard pricing and self-managed menu from the app.",
  },
  {
    title: "Billing",
    description: "Create bills, search customers, and run in-store operations.",
  },
  {
    title: "Enquiries",
    description: "Respond to leads coming from the public website.",
  },
];

export function DashboardHomeScreen() {
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Vendor dashboard</Text>
          <Text style={styles.title}>Mobile foundation is now in place</Text>
          <Text style={styles.copy}>
            This phase gives us the shell for the future vendor app. The next steps will
            wire real modules into this app one by one.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Phase 1 completed</Text>
          <Text style={styles.summaryValue}>4 starter modules mapped</Text>
          <Text style={styles.summaryCopy}>
            Shared navigation, storage, API client, auth state, and vendor-facing app
            structure are ready.
          </Text>
        </View>

        <View style={styles.modulesGrid}>
          {modules.map((module) => (
            <View key={module.title} style={styles.moduleCard}>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              <Text style={styles.moduleCopy}>{module.description}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton label="Sign out" variant="secondary" onPress={signOut} />
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
    paddingTop: 32,
    paddingBottom: 36,
    gap: 22,
  },
  hero: {
    gap: 10,
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
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 22,
    gap: 8,
  },
  summaryTitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: "800",
  },
  summaryCopy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  modulesGrid: {
    gap: 16,
  },
  moduleCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 8,
  },
  moduleTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  moduleCopy: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
});
