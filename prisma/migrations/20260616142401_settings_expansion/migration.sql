-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "workingHoursJson" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "mustResetPassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "title" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "title" TEXT,
    "role" "Role" NOT NULL DEFAULT 'DOCTOR',
    "token" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_clinicId_idx" ON "Invitation"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_email_clinicId_key" ON "Invitation"("email", "clinicId");

-- CreateIndex
CREATE INDEX "AuditLog_clinicId_idx" ON "AuditLog"("clinicId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
