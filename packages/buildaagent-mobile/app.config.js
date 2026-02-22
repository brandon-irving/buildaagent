export default ({ config }) => {
  const baseConfig = {
    ...config,
    name: "BuildAAgent",
    slug: "buildaagent-mobile",
    scheme: "buildaagent",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.buildaagent.mobile"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.buildaagent.mobile"
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro"
    },
    plugins: []
  }

  // Only add Google Sign In plugin for native platforms (not web)
  if (process.env.EXPO_PLATFORM !== 'web') {
    baseConfig.plugins.push([
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme: "com.googleusercontent.apps.44450409169-erhotn6cven9g9oqciqeipkleevjulrt"
      }
    ])
  }

  return baseConfig
}