-- Add sectionId to ChatConversation for section tracking
ALTER TABLE "ChatConversation" ADD COLUMN "sectionId" TEXT;

-- Create index for sectionId lookups
CREATE INDEX "ChatConversation_sectionId_idx" ON "ChatConversation"("sectionId");
