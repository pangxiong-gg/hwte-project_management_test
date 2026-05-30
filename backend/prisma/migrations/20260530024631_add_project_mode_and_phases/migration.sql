-- CreateTable
CREATE TABLE "ProjectPhase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "allowedTaskTypes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectPhase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "mode" TEXT NOT NULL DEFAULT 'HYBRID',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Project" ("code", "createdAt", "description", "endDate", "id", "name", "startDate", "status", "updatedAt") SELECT "code", "createdAt", "description", "endDate", "id", "name", "startDate", "status", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "taskCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'DEVELOPMENT',
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'P2',
    "requirementId" TEXT,
    "phaseId" TEXT,
    "assigneeId" TEXT,
    "plannedHours" REAL,
    "actualHours" REAL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ProjectPhase" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("actualHours", "assigneeId", "completedAt", "createdAt", "description", "id", "plannedHours", "priority", "projectId", "requirementId", "startedAt", "status", "taskCode", "title", "type", "updatedAt") SELECT "actualHours", "assigneeId", "completedAt", "createdAt", "description", "id", "plannedHours", "priority", "projectId", "requirementId", "startedAt", "status", "taskCode", "title", "type", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE UNIQUE INDEX "Task_projectId_taskCode_key" ON "Task"("projectId", "taskCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProjectPhase_projectId_order_idx" ON "ProjectPhase"("projectId", "order");
