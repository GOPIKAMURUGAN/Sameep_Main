import React, { useState } from "react";
import { SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  bypassOtp,
  fetchSessionContext,
  requestOtp,
  verifyOtp,
} from "../services/authService";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [countryCode, setCountryCode] = useState("91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function finishLogin(token: string) {
    const context = await fetchSessionContext(token);
    const vendorId = context.vendor?._id || null;
    const onboardingComplete = Boolean(vendorId);

    await signIn({
      token,
      vendorId,
      onboardingComplete,
    });

    navigation.replace(onboardingComplete ? "DashboardHome" : "OnboardingWelcome");
  }

  async function handleRequestOtp() {
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const data = await requestOtp({
        countryCode: countryCode.trim(),
        phone: phone.trim(),
      });
      setOtpSent(true);
      setInfo(data.message || "OTP sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const data = await verifyOtp({
        countryCode: countryCode.trim(),
        phone: phone.trim(),
        otp: otp.trim(),
      });

      if (!data?.token) {
        throw new Error("Login succeeded but no session token was returned");
      }

      await finishLogin(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleBypassOtp() {
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const data = await bypassOtp({
        countryCode: countryCode.trim(),
        phone: phone.trim(),
      });

      if (!data?.token) {
        throw new Error("Bypass login succeeded but no session token was returned");
      }

      await finishLogin(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to bypass OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.kicker}>Vendor App</Text>
        <Text style={styles.title}>Log in to continue</Text>
        <Text style={styles.copy}>
          This phase now uses the existing customer OTP/session backend flow, so we can
          route existing vendors into dashboard and new users into onboarding.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Country code</Text>
          <TextInput
            value={countryCode}
            onChangeText={setCountryCode}
            keyboardType="phone-pad"
            placeholder="91"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <Text style={styles.label}>Mobile number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="Enter mobile number"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          {otpSent ? (
            <>
              <Text style={styles.label}>OTP</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                placeholder="Enter OTP"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </>
          ) : null}

          {info ? <Text style={styles.infoText}>{info}</Text> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!otpSent ? (
            <PrimaryButton
              label="Request OTP"
              onPress={handleRequestOtp}
              loading={loading}
              disabled={!countryCode.trim() || !phone.trim()}
            />
          ) : (
            <>
              <PrimaryButton
                label="Verify OTP"
                onPress={handleVerifyOtp}
                loading={loading}
                disabled={!otp.trim()}
              />
              <PrimaryButton
                label="Edit mobile number"
                onPress={() => {
                  setOtpSent(false);
                  setOtp("");
                  setInfo("");
                  setError("");
                }}
                variant="secondary"
              />
            </>
          )}

          {__DEV__ ? (
            <PrimaryButton
              label="Dev bypass OTP"
              onPress={handleBypassOtp}
              loading={loading}
              disabled={!countryCode.trim() || !phone.trim()}
              variant="secondary"
            />
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 42,
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 42,
    marginBottom: 12,
  },
  copy: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 28,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    gap: 14,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 16,
  },
  infoText: {
    color: colors.success,
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
});
