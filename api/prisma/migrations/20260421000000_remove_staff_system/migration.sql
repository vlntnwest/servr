-- Safety check: abort if any restaurant would lose its OWNER after migration.
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM restaurants r
  WHERE NOT EXISTS (
    SELECT 1 FROM restaurant_members rm
    WHERE rm.restaurant_id = r.id AND rm.role = 'OWNER'
  );
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: % restaurant(s) have no OWNER member', orphan_count;
  END IF;
END $$;

-- 1. Add admin_id (nullable during backfill).
ALTER TABLE restaurants
  ADD COLUMN admin_id uuid REFERENCES users(id) ON DELETE CASCADE;

-- 2. Backfill admin_id from restaurant_members (role = 'OWNER').
UPDATE restaurants r
SET admin_id = rm.user_id
FROM restaurant_members rm
WHERE rm.restaurant_id = r.id AND rm.role = 'OWNER';

-- 3. Enforce NOT NULL now that every row is backfilled.
ALTER TABLE restaurants
  ALTER COLUMN admin_id SET NOT NULL;

-- 4. Drop legacy tables and enum.
DROP TABLE IF EXISTS invitation_tokens;
DROP TABLE IF EXISTS restaurant_members;
DROP TYPE IF EXISTS restaurant_role;
