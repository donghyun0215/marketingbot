import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/** 브라우저·서버 공통. RLS 적용. */
export const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

/** 서버 전용. RLS 우회하므로 클라이언트 컴포넌트에서 절대 import 금지. */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  return createClient(url, key, { auth: { persistSession: false } });
}
