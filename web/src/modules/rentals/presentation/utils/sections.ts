/** The property screen's sections, in tile order; each is its own address: /rentals/:propertyId/:section. */
export const SECTIONS = ['todo', 'rooms', 'tenants', 'bills', 'analytics'] as const;
export type Section = (typeof SECTIONS)[number];
export const SECTION_TITLE: Record<Section, string> = { todo: 'To do', rooms: 'Rooms', tenants: 'Tenants', bills: 'Bills', analytics: 'Analytics' };
