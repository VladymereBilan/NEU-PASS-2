const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// react-native-fast-tflite loads .tflite models via require(...); Metro needs
// to be told to treat that extension as a bundleable asset.
config.resolver.assetExts.push("tflite");

module.exports = config;
