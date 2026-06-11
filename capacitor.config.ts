import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ggtech.controle",
  appName: "GG Tech",
  webDir: "out",
  server: {
    url: "https://calculo-comiss-o.vercel.app",
    cleartext: false,
  },
  android: {
    backgroundColor: "#09090b",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#09090b",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
  },
};

export default config;
