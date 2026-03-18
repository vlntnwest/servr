-- Add ExceptionalHour table
CREATE TABLE IF NOT EXISTS public.exceptional_hours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  date DATE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT true,
  open_time TEXT,
  close_time TEXT,
  label VARCHAR(100),
  created_at TIMESTAMPTZ(6) DEFAULT (now() AT TIME ZONE 'utc'::text),
  updated_at TIMESTAMP(6),
  UNIQUE(restaurant_id, date)
);

CREATE INDEX IF NOT EXISTS exceptional_hours_restaurant_id_idx ON public.exceptional_hours(restaurant_id);

-- Add preparation_level to restaurants
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'preparation_level') THEN
    CREATE TYPE public.preparation_level AS ENUM ('EASY', 'MEDIUM', 'BUSY', 'CLOSED');
  END IF;
END$$;

ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS preparation_level public.preparation_level NOT NULL DEFAULT 'EASY';
