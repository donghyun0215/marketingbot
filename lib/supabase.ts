import { createClient, SupabaseClient } from "@supabase/supabase-js";

function url() {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!u) throw new Error("NEXT_PUBLIC_SUPABASE_URL missing");
  return u;
}

/**
 * 브라우저·서버 공통. RLS 적용.
 * 지연 생성하는 이유: 모듈을 불러오는 것만으로 anon 키를 요구하면,
 * 서버 전용 스크립트(임포트·분석 등)가 anon 키 없이 돌지 못한다.
 */
let _client: SupabaseClient | null = null;
export function supabaseClient(): SupabaseClient {
  if (!_client) {
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY missing");
    _client = createClient(url(), key);
  }
  return _client;
}

/** 서버 전용. RLS를 우회하므로 클라이언트 컴포넌트에서 절대 import 금지. */
let _admin: SupabaseClient | null = null;
export function supabaseAdmin(): SupabaseClient {
  if (!_admin) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
    _admin = createClient(url(), key, { auth: { persistSession: false } });
  }
  return _admin;
}
