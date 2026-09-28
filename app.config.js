/**
 * Expo dynamic config.
 *
 * Registers the iOS Google reverse-client URL scheme
 * (`com.googleusercontent.apps.{prefix}`) through the google-signin config
 * plugin. It must match the API's GOOGLE_IOS_CLIENT_ID.
 */
const DEFAULT_IOS_CLIENT_ID = '321108577244-p1tp873s03sc3rmhc18b6tl0g8f0h1r4.apps.googleusercontent.com';
const iosClientId = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || DEFAULT_IOS_CLIENT_ID).trim();

function iosGoogleScheme(clientId) {
  const prefix = clientId.replace('.apps.googleusercontent.com', '').trim();
  return `com.googleusercontent.apps.${prefix}`;
}

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins || []),
    ['@react-native-google-signin/google-signin', { iosUrlScheme: iosGoogleScheme(iosClientId) }],
  ],
});
