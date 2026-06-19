-- Add creator approval status. Plain additive column so it applies online
-- without a full table rebuild (the dev server keeps a live connection open).
ALTER TABLE "Creator" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Pending';

-- Existing creators predate the approval flow, so treat them as already approved.
UPDATE "Creator" SET "status" = 'Approved';
