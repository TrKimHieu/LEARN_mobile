const { resolveApiOrigin, resolveEnvironment } = require('./src/lib/config-policy');

module.exports = ({ config }) => {
  if (process.env.EAS_BUILD_PROFILE && process.env.APP_ENV &&
    process.env.EAS_BUILD_PROFILE !== process.env.APP_ENV) {
    throw new Error('APP_ENV must match the EAS build profile.');
  }
  const environment = resolveEnvironment(process.env.APP_ENV || process.env.EAS_BUILD_PROFILE ||
    (process.env.NODE_ENV === 'production' ? 'production' : 'development'));
  resolveApiOrigin(process.env.EXPO_PUBLIC_API_URL, environment);
  return { ...config, extra: { ...config.extra, appEnvironment: environment } };
};
