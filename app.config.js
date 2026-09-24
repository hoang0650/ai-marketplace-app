/**
 * Expo dynamic config.
 *
 * Extends app.json at runtime so the iOS Google reverse-client URL scheme
 * (`com.googleusercontent.apps.{prefix}`) is registered whenever
 * EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set. Without it, ASWebAuthenticationSession
 * cannot hand the OAuth code back to the app and iOS Google sign-in fails.
 */
const iosClientId = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '').trim();

function iosGoogleScheme(clientId) {
  const prefix = clientId.replace('.apps.googleusercontent.com', '').trim();
  return prefix ? `com.googleusercontent.apps.${prefix}` : '';
}

module.exports = ({ config }) => {
  const scheme = iosGoogleScheme(iosClientId);
  if (!scheme) return config;

  const ios = config.ios || {};
  const infoPlist = ios.infoPlist || {};
  const urlTypes = infoPlist.CFBundleURLTypes || [];
  const alreadyRegistered = urlTypes.some((entry) => (entry.CFBundleURLSchemes || []).includes(scheme));
  if (alreadyRegistered) return config;

  return {
    ...config,
    ios: {
      ...ios,
      infoPlist: {
        ...infoPlist,
        CFBundleURLTypes: [...urlTypes, { CFBundleURLSchemes: [scheme] }],
      },
    },
  };
};
