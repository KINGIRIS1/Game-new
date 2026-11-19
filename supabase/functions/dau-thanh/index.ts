// Edge Function Đấu thành trên Supabase: lệnh ở xuLy.ts, luật ở luat.js (`node scripts/luat.mjs`).
// SUPABASE_DB_URL, SUPABASE_URL, SUPABASE_ANON_KEY do Supabase đặt sẵn cho mọi Edge Function.

import postgres from 'npm:postgres@3.4.9';
import { nguoiDungTuSupabase, taoXuLy } from './xuLy.ts';

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10 });

Deno.serve(taoXuLy({ sql, nguoiDung: nguoiDungTuSupabase(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')) }));
