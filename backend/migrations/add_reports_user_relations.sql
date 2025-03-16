-- Add foreign key relationships for reports table
ALTER TABLE reports
ADD CONSTRAINT reports_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE reports
ADD CONSTRAINT reports_reviewed_by_fkey
FOREIGN KEY (reviewed_by) REFERENCES users(id);