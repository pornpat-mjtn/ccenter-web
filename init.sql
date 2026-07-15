-- CreateTable
CREATE TABLE IF NOT EXISTS "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" DATETIME NOT NULL,
    "region" TEXT NOT NULL,
    "admin" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "customerName" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "time" TEXT,
    "assignee" TEXT DEFAULT 'รอแพลน',
    "order" INTEGER NOT NULL DEFAULT 0,
    "lift" BOOLEAN NOT NULL DEFAULT false,
    "liftPlate" TEXT
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "region" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT,
    "carPlate" TEXT
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Staff_name_key" ON "Staff"("name");

