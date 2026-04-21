-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyObservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "cycleDay" INTEGER,
    "bbtCelsius" REAL,
    "mucusStretch" INTEGER NOT NULL DEFAULT 0,
    "mucusTransparency" TEXT NOT NULL DEFAULT 'X',
    "mucusSlipperiness" TEXT NOT NULL DEFAULT 'X',
    "mostFertileFrequency" TEXT NOT NULL DEFAULT 'NONE',
    "cervixPosition" TEXT NOT NULL DEFAULT 'unknown',
    "bleedingLevel" INTEGER NOT NULL DEFAULT 0,
    "intercourse" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyObservation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DailyObservation" ("bbtCelsius", "bleedingLevel", "cervixPosition", "createdAt", "cycleDay", "cycleId", "date", "id", "intercourse", "mucusSlipperiness", "mucusStretch", "mucusTransparency", "notes", "updatedAt") SELECT "bbtCelsius", "bleedingLevel", "cervixPosition", "createdAt", "cycleDay", "cycleId", "date", "id", "intercourse", "mucusSlipperiness", "mucusStretch", "mucusTransparency", "notes", "updatedAt" FROM "DailyObservation";
DROP TABLE "DailyObservation";
ALTER TABLE "new_DailyObservation" RENAME TO "DailyObservation";
CREATE INDEX "DailyObservation_cycleId_date_idx" ON "DailyObservation"("cycleId", "date");
CREATE UNIQUE INDEX "DailyObservation_cycleId_date_key" ON "DailyObservation"("cycleId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

