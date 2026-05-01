CREATE TABLE "post_views" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "userId" TEXT,
  "visitorId" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "referrer" TEXT,
  "userAgent" TEXT,
  "ipHash" TEXT,
  "durationSeconds" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "post_views_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "post_views_postId_startedAt_idx" ON "post_views"("postId", "startedAt");
CREATE INDEX "post_views_visitorId_idx" ON "post_views"("visitorId");
CREATE INDEX "post_views_userId_idx" ON "post_views"("userId");

ALTER TABLE "post_views"
  ADD CONSTRAINT "post_views_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_views"
  ADD CONSTRAINT "post_views_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
