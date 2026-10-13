import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Chỉ module server được phép khởi tạo Supabase Admin API.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Thiếu SUPABASE_SERVICE_ROLE_KEY trong môi trường server.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
