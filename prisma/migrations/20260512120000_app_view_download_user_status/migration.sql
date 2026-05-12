ALTER TABLE "users" ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "page_views"
  ADD COLUMN "durationSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "page_views"
SET "startedAt" = "createdAt",
    "lastSeenAt" = "createdAt"
WHERE "createdAt" IS NOT NULL;

ALTER TABLE "download_events"
  ADD COLUMN "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "durationMs" INTEGER NOT NULL DEFAULT 0;

UPDATE "download_events"
SET "startedAt" = "createdAt",
    "completedAt" = "createdAt"
WHERE "createdAt" IS NOT NULL;
