require('dotenv').config();
const appJson = require('./app.json');

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    },
  },
};
