module.exports = function (api) {
  api.cache(true);
  // react-native-worklets/plugin must be the LAST plugin (Reanimated 4 requirement).
  let plugins = ['react-native-worklets/plugin'];

  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],

    plugins,
  };
};
