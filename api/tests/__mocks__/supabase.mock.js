// Shared mock supabase client accessible via globalThis.__mockSupabase
if (!globalThis.__mockSupabase) {
  globalThis.__mockSupabase = {};
}
module.exports = globalThis.__mockSupabase;
