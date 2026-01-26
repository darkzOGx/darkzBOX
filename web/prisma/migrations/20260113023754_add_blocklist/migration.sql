-- CreateTable
CREATE TABLE "BlockedEmail" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlockedEmail_email_idx" ON "BlockedEmail"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedEmail_workspaceId_email_key" ON "BlockedEmail"("workspaceId", "email");
