/** The details form fields: key, label, autocomplete, input type. Shared with in-person signing. */
export const TEXT_FIELDS = [
  ['fullName', 'Full name', 'name', 'text'], ['phone', 'Mobile number', 'tel', 'tel'], ['address', 'Home address', 'street-address', 'text'],
  ['emergencyName', 'Emergency contact name', 'off', 'text'], ['emergencyPhone', 'Emergency contact number', 'off', 'tel'],
] as const;
// TODO owner: legal review of this wording (Data Privacy Act 2012)
export const PRIVACY_CONSENT = 'I agree that my landlord stores these details to manage my rental.';
export const OPTIONAL_FIELDS = [['facebook', 'Facebook or Messenger name', 'off', 'text'], ['email', 'Email', 'email', 'email']] as const;
/** How the details form is grouped on screen: about the tenant, then who to call. */
export const ABOUT_FIELDS = TEXT_FIELDS.slice(0, 3);
export const EMERGENCY_FIELDS = TEXT_FIELDS.slice(3);
