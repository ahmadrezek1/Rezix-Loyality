export const POLICY_VERSION = "v1.0";
export function legalConfig(){
 return {
  company:process.env.REZIX_LEGAL_COMPANY||'Rezix',
  owner:process.env.REZIX_LEGAL_OWNER||'Ahmed Rezek',
  address:process.env.REZIX_LEGAL_ADDRESS||'Bitte Geschäftsanschrift konfigurieren',
  email:process.env.REZIX_LEGAL_EMAIL||'support@rezix.at',
  phone:process.env.REZIX_LEGAL_PHONE||'',
  vat:process.env.REZIX_LEGAL_VAT||'',
  country:process.env.REZIX_LEGAL_COUNTRY||'Österreich',
  privacyEmail:process.env.REZIX_PRIVACY_EMAIL||process.env.REZIX_LEGAL_EMAIL||'privacy@rezix.at',
 };
}
