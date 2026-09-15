# Rezix Wallet Setup (v1.0.10)

## Google Wallet
The integration now creates one Loyalty Class per Rezix business automatically and then creates the customer Loyalty Object through the signed **Add to Google Wallet** JWT.

Required server-side environment variables are documented in `.env.wallet.example`.

Important Google-side steps:
1. Enable **Google Wallet API** for the Google Cloud project.
2. In Google Pay & Wallet Console -> **Nutzer / Users**, invite the service-account email and give it **Developer** access.
3. The issuer currently starts in **Demo mode**. Add test accounts for testing, then complete **Get publishing access** before public launch.
4. Never commit the service-account JSON or private key.

The class ID is generated per business as:
`ISSUER_ID.GOOGLE_WALLET_CLASS_SUFFIX_BUSINESS_ID`

This is required for Rezix multi-branch/multi-business branding so one merchant does not share another merchant's Wallet class.

## Apple Wallet
Required server-side environment variables:
- APPLE_PASS_TYPE_IDENTIFIER
- APPLE_TEAM_IDENTIFIER
- APPLE_WWDR_CERT (PEM or base64 encoded PEM)
- APPLE_PASS_CERT (PEM or base64 encoded PEM)
- APPLE_PASS_PRIVATE_KEY (PEM or base64 encoded PEM)
- APPLE_PASS_PRIVATE_KEY_PASSPHRASE (only if the key is encrypted)
- WALLET_TOKEN_SECRET (recommended; AUTH_SECRET is used as fallback)

Never commit certificates, private keys, service-account JSON files or passwords.

## Install
Run `npm install` after upgrading. `passkit-generator` is included for Apple Wallet.
