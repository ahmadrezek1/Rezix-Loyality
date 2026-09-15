# Rezix v1.0.8 – Performance & reliability

- Manager pages now load only the data needed for the active view.
- Overview counters are aggregated to reduce PostgreSQL round trips.
- Session validation uses one authorization query for staff/manager sessions.
- `last_seen_at` writes are throttled to once per five minutes per active session.
- Database pool is configurable with `REZIX_DB_POOL_MAX` (default 5, max 20).
- Added hot-path PostgreSQL indexes for customers, staff, visits, sessions and loyalty operations.
- Registration background work uses Next.js `after()` when available and a safe fallback elsewhere.
- Added immediate Manager route loading feedback.

Run `npm run db:migrate` after deployment to apply `migrate-performance-v108.sql`.
For production, size `REZIX_DB_POOL_MAX` against the database provider's total connection budget; do not blindly set it to 20.
