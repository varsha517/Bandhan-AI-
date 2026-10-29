/*
# Add dataset_id to reports
*/
ALTER TABLE reports ADD COLUMN IF NOT EXISTS dataset_id uuid REFERENCES uploaded_datasets(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reports_dataset_id ON reports(dataset_id);
