# Rezix v1.0.6 – Registration UX Fix

- Registration wizard split into six focused steps (Branche, Treueprogramm, Betrieb, Standort, Manager, Abschluss).
- Each step has its own URL state (`?step=...`) and does not require scrolling on desktop.
- Client-side validation blocks navigation until the current step is valid.
- Inline field-specific error messages explain exactly what is wrong.
- Slugs are normalized automatically to valid Rezix URLs.
- Server-side validation returns the exact invalid field instead of only a generic error.
- Duplicate business slug and duplicate manager email are reported on the corresponding field.
- Final review page shows the entered business, URL, loyalty configuration, and manager email before submission.
