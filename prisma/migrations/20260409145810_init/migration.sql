-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "preferredUnit" TEXT NOT NULL DEFAULT 'C',
    "cycleLengthHint" INTEGER,
    "lutealLengthHint" INTEGER,
    "tempRiseThresholdC" REAL NOT NULL DEFAULT 0.2,
    "disclaimerAcceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "interpretationStale" BOOLEAN NOT NULL DEFAULT false,
    "interpretationStaleReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyObservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "cycleDay" INTEGER,
    "bbtCelsius" REAL,
    "mucusCategory" TEXT NOT NULL DEFAULT 'unknown',
    "cervixPosition" TEXT NOT NULL DEFAULT 'unknown',
    "bleedingLevel" INTEGER NOT NULL DEFAULT 0,
    "intercourse" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyObservation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterpretationDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "ruleTrace" JSONB NOT NULL,
    "reasonCodes" JSONB NOT NULL,
    "autoComputedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterpretationDay_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OverrideDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "overriddenStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "overriddenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OverrideDay_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "Cycle_userId_isActive_idx" ON "Cycle"("userId", "isActive");

-- CreateIndex
CREATE INDEX "DailyObservation_cycleId_date_idx" ON "DailyObservation"("cycleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyObservation_cycleId_date_key" ON "DailyObservation"("cycleId", "date");

-- CreateIndex
CREATE INDEX "InterpretationDay_cycleId_date_idx" ON "InterpretationDay"("cycleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "InterpretationDay_cycleId_date_key" ON "InterpretationDay"("cycleId", "date");

-- CreateIndex
CREATE INDEX "OverrideDay_cycleId_date_idx" ON "OverrideDay"("cycleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "OverrideDay_cycleId_date_key" ON "OverrideDay"("cycleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
