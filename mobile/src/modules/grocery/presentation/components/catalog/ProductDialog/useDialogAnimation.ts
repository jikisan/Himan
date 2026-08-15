import { useEffect, useState } from 'react';
import { useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import type { ProductType } from '@himan/shared/grocery';
import { EASE_OUT } from './constants';

// Keeps the last product mounted through the exit animation so the card can
// scale/fade out instead of vanishing.
export function useDialogAnimation(product: ProductType | null) {
  const [rendered, setRendered] = useState<ProductType | null>(product);
  const anim = useSharedValue(product ? 1 : 0);

  useEffect(() => {
    if (product) {
      setRendered(product);
      anim.value = withTiming(1, { duration: 240, easing: EASE_OUT });
    } else {
      anim.value = withTiming(0, { duration: 160, easing: EASE_OUT }, (finished) => {
        if (finished) runOnJS(setRendered)(null);
      });
    }
  }, [product, anim]);

  return { rendered, anim };
}
