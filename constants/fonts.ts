import { Platform } from 'react-native';

export const displayFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
