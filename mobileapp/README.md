# YNOT Vendor Mobile App

This is the new vendor-focused mobile application for YNOT. The app is being built as a separate React Native / Expo project so it can support both iOS and Android while reusing the existing backend APIs.

## Phase 1 Scope

Phase 1 sets up the mobile foundation:

- Expo / React Native project scaffold
- Navigation shell
- Auth/session context
- Shared theme tokens
- API client + storage helpers
- Starter screens for:
  - Splash
  - Login
  - Onboarding entry
  - Dashboard home

## Suggested Commands

Run these after installing dependencies:

```bash
npm install
npm run start
```

For devices/simulators:

```bash
npm run android
npm run ios
```

## Next Phases

1. Real OTP login flow
2. Onboarding flow screens
3. Dashboard modules
4. Prices / My Menu
5. Billing
6. Enquiries

