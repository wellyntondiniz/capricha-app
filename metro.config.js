// Polyfill util.styleText for Node < 20.12
const util = require('util');
if (!util.styleText) {
  util.styleText = (styles, text) => text;
}

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
