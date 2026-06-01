ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en'
    CHECK (locale IN ('en', 'es'));
