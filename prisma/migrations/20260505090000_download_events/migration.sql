CREATE TABLE "download_events" (
  "id" TEXT NOT NULL,
  "appSlug" TEXT NOT NULL,
  "userId" TEXT,
  "ipAddress" TEXT NOT NULL,
  "referrer" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "download_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "download_events_appSlug_createdAt_idx" ON "download_events"("appSlug", "createdAt");
CREATE INDEX "download_events_appSlug_ipAddress_idx" ON "download_events"("appSlug", "ipAddress");
CREATE INDEX "download_events_userId_idx" ON "download_events"("userId");

ALTER TABLE "download_events"
  ADD CONSTRAINT "download_events_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
