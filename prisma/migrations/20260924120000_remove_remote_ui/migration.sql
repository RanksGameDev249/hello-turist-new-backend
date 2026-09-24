-- Remove persisted Remote UI drafts and published schemas now that the feature is retired.
DELETE FROM "app_settings"
WHERE "key" LIKE 'REMOTE_UI:%';
