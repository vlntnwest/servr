-- CreateEnum
CREATE TYPE "public"."user_role" AS ENUM ('CUSTOMER', 'RESTAURATEUR');

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN "role" "public"."user_role" NOT NULL DEFAULT 'CUSTOMER';

-- Update Supabase trigger function to set role from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'CUSTOMER')::public.user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN new;
END;
$$;
