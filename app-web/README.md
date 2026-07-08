# AppFinancas — Mobile

A personal finance mobile app built with React Native and Expo. Allows users to register, log in, and manage their financial transactions — viewing a monthly dashboard with balance summary, and creating, editing, or deleting transactions.

## Tech Stack

| Technology | Version |
|---|---|
| React Native | 0.85.3 |
| React | 19.2.3 |
| Expo | ~56.0.9 |
| expo-status-bar | ~56.0.4 |
| expo-dev-client | ~56.0.19 |
| @react-navigation/native | ^7.3.0 |
| @react-navigation/native-stack | ^7.17.2 |
| react-native-screens | ^4.25.2 |
| react-native-safe-area-context | ^5.8.0 |
| @react-native-async-storage/async-storage | ^3.1.1 |
| axios | ^1.17.0 |

## Folder Structure

```
mobile/
├── App.js                        # Root component — navigation + auth setup
├── index.js                      # Expo entry point
├── app.json                      # Expo app configuration
├── eas.json                      # EAS Build configuration
├── package.json
└── src/
    ├── context/
    │   └── AuthContext.js        # Auth state, login, register, logout
    ├── screens/
    │   ├── LoginScreen.js
    │   ├── RegisterScreen.js
    │   ├── DashboardScreen.js
    │   ├── AddTransactionScreen.js
    │   └── EditTransactionScreen.js
    ├── services/
    │   └── api.js                # Axios instance with auth interceptor
    └── components/               # (reserved for shared components)
```

## Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- [Expo Go](https://expo.dev/go) app installed on your physical device, or an Android/iOS simulator
- Backend API running — see [AppFinancas backend](https://github.com/MARCELOASSIS87/AppFinancas)

## Running Locally with Expo Go

1. Clone the repository:
   ```bash
   git clone https://github.com/MARCELOASSIS87/AppFinancas-mobile.git
   cd AppFinancas-mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set the backend API URL in `src/services/api.js`:
   ```js
   baseURL: 'http://YOUR_SERVER_IP:3000/api', // IP or domain of the machine running the backend
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Scan the QR code with Expo Go (Android) or the Camera app (iOS).

### Platform-specific start commands

```bash
npm run android   # Open directly on Android emulator
npm run ios       # Open directly on iOS simulator
npm run web       # Open in browser
```

## Building with EAS

This project uses [EAS Build](https://docs.expo.dev/build/introduction/) with the following profiles defined in `eas.json`:

| Profile | Distribution | Notes |
|---|---|---|
| `development` | Internal | Includes dev client |
| `preview` | Internal | APK/IPA for testing |
| `production` | Store | Auto-increments version |

Install EAS CLI and build:
```bash
npm install -g eas-cli
eas login
eas build --profile preview --platform android
```

## Available Screens

| Screen | File | Description |
|---|---|---|
| Login | `LoginScreen.js` | Email and password login |
| Register | `RegisterScreen.js` | Create a new account (name, email, password) |
| Dashboard | `DashboardScreen.js` | Total balance card + current month transaction list |
| Add Transaction | `AddTransactionScreen.js` | Form to create a new transaction |
| Edit Transaction | `EditTransactionScreen.js` | Edit or delete an existing transaction |

## Backend

The REST API consumed by this app is available at:
[https://github.com/MARCELOASSIS87/AppFinancas](https://github.com/MARCELOASSIS87/AppFinancas)
