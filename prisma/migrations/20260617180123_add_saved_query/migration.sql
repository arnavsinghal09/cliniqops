-- CreateTable
CREATE TABLE "SavedQuery" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "sql" TEXT NOT NULL,
    "chartType" TEXT,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedQuery_clinicId_idx" ON "SavedQuery"("clinicId");

-- CreateIndex
CREATE INDEX "SavedQuery_userId_idx" ON "SavedQuery"("userId");

-- AddForeignKey
ALTER TABLE "SavedQuery" ADD CONSTRAINT "SavedQuery_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
