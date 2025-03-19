-- Add updated_at column to notifications table
ALTER TABLE notifications 
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();