-- CreateIndex
CREATE INDEX "FollowUpAction_clinicId_idx" ON "FollowUpAction"("clinicId");

-- CreateIndex
CREATE INDEX "FollowUpAction_patientId_idx" ON "FollowUpAction"("patientId");

-- AddForeignKey
ALTER TABLE "FollowUpAction" ADD CONSTRAINT "FollowUpAction_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
