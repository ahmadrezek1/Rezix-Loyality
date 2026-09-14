-- Normalize legacy free trials to the requested 3-day duration; paid subscriptions are untouched.
UPDATE businesses SET trial_ends_at=trial_started_at + interval '3 days' WHERE billing_plan='trial' AND subscription_status='trialing' AND trial_started_at IS NOT NULL AND trial_ends_at>trial_started_at + interval '3 days';
