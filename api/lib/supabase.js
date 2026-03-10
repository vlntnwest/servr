const { createClient } = require("@supabase/supabase-js");
const logger = require("../logger");

const supabase_url = process.env.SUPABASE_URL;
const service_role_key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabase_url || !service_role_key) {
  logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

// Admin client with service role key (bypasses RLS)
const supabase = createClient(supabase_url, service_role_key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = supabase;
