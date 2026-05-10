import AsyncStorage from "@react-native-async-storage/async-storage";

const keys = {
  authToken: "ynot.vendor.authToken",
  vendorId: "ynot.vendor.vendorId",
  onboardingComplete: "ynot.vendor.onboardingComplete",
};

export async function setStoredAuthToken(token: string | null) {
  if (!token) {
    await AsyncStorage.removeItem(keys.authToken);
    return;
  }
  await AsyncStorage.setItem(keys.authToken, token);
}

export async function getStoredAuthToken() {
  return AsyncStorage.getItem(keys.authToken);
}

export async function setStoredVendorId(vendorId: string | null) {
  if (!vendorId) {
    await AsyncStorage.removeItem(keys.vendorId);
    return;
  }
  await AsyncStorage.setItem(keys.vendorId, vendorId);
}

export async function getStoredVendorId() {
  return AsyncStorage.getItem(keys.vendorId);
}

export async function setStoredOnboardingComplete(value: boolean) {
  await AsyncStorage.setItem(keys.onboardingComplete, value ? "true" : "false");
}

export async function getStoredOnboardingComplete() {
  const value = await AsyncStorage.getItem(keys.onboardingComplete);
  return value === "true";
}

export async function clearStoredSession() {
  await AsyncStorage.multiRemove(Object.values(keys));
}
