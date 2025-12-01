-- CreateTable
CREATE TABLE "AISection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "htmlCode" TEXT NOT NULL,
    "cssCode" TEXT,
    "jsCode" TEXT,
    "liquidCode" TEXT,
    "prompt" TEXT NOT NULL,
    "previewData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "appliedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "AISection_shop_idx" ON "AISection"("shop");

-- CreateIndex
CREATE INDEX "AISection_status_idx" ON "AISection"("status");
