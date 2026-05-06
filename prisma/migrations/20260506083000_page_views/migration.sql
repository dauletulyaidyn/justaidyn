CREATE TABLE "page_views" (
  "id" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "entitySlug" TEXT NOT NULL,
  "entityTitle" TEXT NOT NULL,
  "userId" TEXT,
  "path" TEXT NOT NULL,
  "referrer" TEXT,
  "userAgent" TEXT,
  "ipHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "page_views_section_entitySlug_createdAt_idx" ON "page_views"("section", "entitySlug", "createdAt");
CREATE INDEX "page_views_userId_idx" ON "page_views"("userId");

ALTER TABLE "page_views" ADD CONSTRAINT "page_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
