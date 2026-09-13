import fs from 'node:fs/promises';

const obsolete = [
  'app/api/auth/2fa',
  'app/auth/2fa',
  'components/MfaQr.tsx',
  'lib/totp.ts',
  'V0.8.3-ADMIN-2FA.md'
];

for (const path of obsolete) {
  await fs.rm(path, { recursive: true, force: true });
  console.log(`removed obsolete: ${path}`);
}
console.log('Rezix obsolete 2FA files cleaned.');
