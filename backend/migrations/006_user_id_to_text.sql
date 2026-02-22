DO $$
DECLARE
  r RECORD;
  user_oid OID;
BEGIN
  SELECT oid INTO user_oid FROM pg_class WHERE relname = 'user' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  IF user_oid IS NULL THEN
    RETURN;
  END IF;
  FOR r IN (
    SELECT c.conname, c.conrelid AS relid
    FROM pg_constraint c
    WHERE c.contype = 'f' AND c.confrelid = user_oid
  ) LOOP
    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
      (SELECT relname FROM pg_class WHERE oid = r.relid),
      r.conname
    );
  END LOOP;
END $$;

ALTER TABLE "user" ALTER COLUMN id TYPE TEXT USING id::text;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session') THEN
    ALTER TABLE session ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'account') THEN
    ALTER TABLE account ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
  END IF;
END $$;

ALTER TABLE api_keys ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE api_keys ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes') THEN
    ALTER TABLE quotes ALTER COLUMN created_by TYPE TEXT USING created_by::text;
    ALTER TABLE quotes ADD CONSTRAINT quotes_created_by_fkey FOREIGN KEY (created_by) REFERENCES "user"(id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'saved_quotes') THEN
    ALTER TABLE saved_quotes ALTER COLUMN user_id TYPE TEXT USING user_id::text;
    ALTER TABLE saved_quotes ADD CONSTRAINT saved_quotes_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_likes') THEN
    ALTER TABLE quote_likes ALTER COLUMN user_id TYPE TEXT USING user_id::text;
    ALTER TABLE quote_likes ADD CONSTRAINT quote_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id);
  END IF;
END $$;
