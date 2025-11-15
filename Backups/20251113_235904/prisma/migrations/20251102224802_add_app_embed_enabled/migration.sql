-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "appEmbedEnabled" BOOLEAN NOT NULL DEFAULT false,
    "showOnProductPages" BOOLEAN NOT NULL DEFAULT true,
    "showOnCart" BOOLEAN NOT NULL DEFAULT false,
    "showOnCheckout" BOOLEAN NOT NULL DEFAULT false,
    "defaultPosition" TEXT NOT NULL DEFAULT 'bottom-left',
    "animationSpeed" TEXT NOT NULL DEFAULT 'medium',
    "displayDuration" INTEGER NOT NULL DEFAULT 5000,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSettings" ("animationSpeed", "createdAt", "defaultPosition", "displayDuration", "enabled", "id", "shop", "showOnCart", "showOnCheckout", "showOnProductPages", "updatedAt") SELECT "animationSpeed", "createdAt", "defaultPosition", "displayDuration", "enabled", "id", "shop", "showOnCart", "showOnCheckout", "showOnProductPages", "updatedAt" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
CREATE UNIQUE INDEX "AppSettings_shop_key" ON "AppSettings"("shop");
CREATE INDEX "AppSettings_shop_idx" ON "AppSettings"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
