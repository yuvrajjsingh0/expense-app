module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // The reanimated plugin must be listed last.
    plugins: ["react-native-reanimated/plugin"],
  };
};
