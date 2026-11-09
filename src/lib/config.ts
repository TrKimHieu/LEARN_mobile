import Constants from 'expo-constants';
import { resolveApiOrigin, resolveEnvironment } from './config-policy';

/** Explicit API origin in every environment; release validation is shared with Expo config. */
const environment = resolveEnvironment(Constants.expoConfig?.extra?.appEnvironment ?? (__DEV__ ? 'development' : 'production'));

export const config = {
  environment,
  apiUrl: resolveApiOrigin(process.env.EXPO_PUBLIC_API_URL, environment),
} as const;
