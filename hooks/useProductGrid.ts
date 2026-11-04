import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Recalculate from the current app window when folding, rotating or using Split View.
export function useProductGrid() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const availableWidth = Math.max(0, width - insets.left - insets.right - 32);
  const columns = Math.max(1, Math.min(4, Math.floor((availableWidth + 10) / 170)));
  return { columns };
}
