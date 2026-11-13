import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.myvicroads.app',
  appName: 'myVicRoads',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0D2D6B',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0D2D6B',
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#0D2D6B',
      showSpinner: false,
    },
    StatusBar: {
      // Overlay content under the status bar for true full-screen feel;
      // CSS safe-area insets keep UI clear of the notch / status icons.
      style: 'DARK',
      backgroundColor: '#0D2D6B',
      overlaysWebView: true,
    },
  },
};

export default config;
