-- CreateEnum
CREATE TYPE "CptStatus" AS ENUM ('SUGGESTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CptSource" AS ENUM ('AI', 'MANUAL');

-- CreateTable
CREATE TABLE "CptCode" (
    "id" TEXT NOT NULL,
    "soapNoteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CptStatus" NOT NULL DEFAULT 'SUGGESTED',
    "source" "CptSource" NOT NULL DEFAULT 'AI',
    "confidence" DOUBLE PRECISION,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CptCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CptCode_soapNoteId_idx" ON "CptCode"("soapNoteId");

-- AddForeignKey
ALTER TABLE "CptCode" ADD CONSTRAINT "CptCode_soapNoteId_fkey" FOREIGN KEY ("soapNoteId") REFERENCES "SoapNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
