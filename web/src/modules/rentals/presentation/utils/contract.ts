import { tenantLinkMessage as linkFor } from '@himan/shared/rentals';
import type { LinkKind } from '@himan/shared/rentals';

export { CONTRACT_BADGE, SIGN_MODES, contractLines, contractOpen, contractPdfData, detailsStatus, manilaDate, previewLessee,
  signModeWords } from '@himan/shared/rentals';
export type { ContractPdfData } from '@himan/shared/rentals';

/** The ready-to-send message for a link token (the page lives at /r/:token). */
export const tenantLinkMessage = (token: string, tenantName: string, kind: LinkKind) => linkFor(location.origin, token, tenantName, kind);
