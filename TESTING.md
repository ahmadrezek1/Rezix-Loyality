# Rezix 0.3 smoke test

1. Run `npm install`.
2. Existing 0.2 DB: `npm run db:migrate`. Fresh DB: `npm run db:init`.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
4. Run `npm run dev`.
5. `/admin/login`: login as Rezix admin.
6. `/admin`: create a salon with PNG/WebP/JPG logo + stamp and owner credentials.
7. Confirm salon appears in Admin list and `/s/<slug>` opens.
8. `/owner/login`: login using the salon owner credentials.
9. Create a staff account in `/owner`.
10. `/staff/login`: login as staff.
11. `/s/<slug>`: register a real test customer; verify the card starts at 0 stamps.
12. Copy/scan the customer code in `/staff`; add one stamp.
13. Refresh the customer page; verify salon custom stamp appears and count is 1.
14. Verify a staff account from one salon cannot stamp a customer code belonging to another salon.
