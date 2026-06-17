/*
  Warnings:

  - You are about to drop the column `appointmentId` on the `ScribeSession` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[consultationRoomId]` on the table `ScribeSession` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `patientInstructions` to the `SoapNote` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('WAITING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "SoapNote" DROP CONSTRAINT "SoapNote_scribeSessionId_fkey";

-- AlterTable
ALTER TABLE "ScribeSession" DROP COLUMN "appointmentId",
ADD COLUMN     "consultationRoomId" TEXT;

-- AlterTable
ALTER TABLE "SoapNote" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "patientInstructions" TEXT NOT NULL,
ADD COLUMN     "prescriptions" TEXT[];

-- CreateTable
CREATE TABLE "ConsultationRoom" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT,
    "patientName" TEXT NOT NULL,
    "patientEmail" TEXT,
    "patientPhone" TEXT,
    "roomToken" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'WAITING',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "reportViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationRoom_roomToken_key" ON "ConsultationRoom"("roomToken");

-- CreateIndex
CREATE INDEX "ConsultationRoom_clinicId_idx" ON "ConsultationRoom"("clinicId");

-- CreateIndex
CREATE INDEX "ConsultationRoom_doctorId_idx" ON "ConsultationRoom"("doctorId");

-- CreateIndex
CREATE INDEX "ConsultationRoom_roomToken_idx" ON "ConsultationRoom"("roomToken");

-- CreateIndex
CREATE UNIQUE INDEX "ScribeSession_consultationRoomId_key" ON "ScribeSession"("consultationRoomId");

-- CreateIndex
CREATE INDEX "ScribeSession_doctorId_idx" ON "ScribeSession"("doctorId");

-- CreateIndex
CREATE INDEX "SoapNote_clinicId_idx" ON "SoapNote"("clinicId");

-- AddForeignKey
ALTER TABLE "ConsultationRoom" ADD CONSTRAINT "ConsultationRoom_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationRoom" ADD CONSTRAINT "ConsultationRoom_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationRoom" ADD CONSTRAINT "ConsultationRoom_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScribeSession" ADD CONSTRAINT "ScribeSession_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScribeSession" ADD CONSTRAINT "ScribeSession_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScribeSession" ADD CONSTRAINT "ScribeSession_consultationRoomId_fkey" FOREIGN KEY ("consultationRoomId") REFERENCES "ConsultationRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoapNote" ADD CONSTRAINT "SoapNote_scribeSessionId_fkey" FOREIGN KEY ("scribeSessionId") REFERENCES "ScribeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
