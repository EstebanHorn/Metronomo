// CJS puro. Nada de imports ESM ni TS acá.
const {
  withInfoPlist,
  withAndroidManifest,
  createRunOncePlugin,
} = require("@expo/config-plugins");

function withPulsoInfoPlist(config) {
  return withInfoPlist(config, (c) => {
    c.modResults.UIBackgroundModes = c.modResults.UIBackgroundModes || [];
    if (!c.modResults.UIBackgroundModes.includes("audio")) {
      c.modResults.UIBackgroundModes.push("audio");
    }
    return c;
  });
}

function withPulsoAndroid(config) {
  return withAndroidManifest(config, (c) => c);
}

function withPulso(config) {
  config = withPulsoInfoPlist(config);
  config = withPulsoAndroid(config);
  return config;
}

// Identidad del plugin: <name, version>
module.exports = createRunOncePlugin(
  withPulso,
  "metronome-native-audio",
  "0.1.0"
);
