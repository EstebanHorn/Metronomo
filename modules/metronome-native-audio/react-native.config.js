module.exports = {
  dependency: {
    platforms: {
      android: { sourceDir: "./android" },
      ios: { podspecPath: null }, // usamos RCT_EXTERN, sin podspec custom
    },
  },
};
