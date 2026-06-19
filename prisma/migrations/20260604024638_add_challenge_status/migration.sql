-- Add status column to Challenge
ALTER TABLE "Challenge" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Active';
