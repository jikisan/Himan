import { parsePesos } from '@himan/shared/rentals';
import type { UtilityState } from './UtilityFields';

/** Utility columns of a room, in centavos; an empty price for a billed utility raises the peso parser's message. */
export const utilityColumns = ({ modes, amounts }: UtilityState) => ({
  electricMode: modes.electric, electricAmountCentavos: modes.electric === 'none' || modes.electric === 'monthly' ? 0 : parsePesos(amounts.electric),
  waterMode: modes.water, waterAmountCentavos: modes.water === 'none' || modes.water === 'monthly' ? 0 : parsePesos(amounts.water),
});
