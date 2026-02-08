CREATE INDEX IF NOT EXISTS idx_quotes_created_at_id ON quotes (created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON quotes (created_by);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash_revoked ON api_keys (key_hash) WHERE revoked_at IS NULL;
