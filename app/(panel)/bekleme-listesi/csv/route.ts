import { currentAdmin, supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Excel/Sheets formül enjeksiyonuna karşı: = + - @ ile başlayan hücreleri metne çevir
const cell = (v: string) => {
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return new Response('Unauthorized', { status: 401 });

  const sb = await supabaseServer();
  const out: string[] = ['email,joined_at'];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('waitlist').select('email, created_at').order('created_at').range(from, from + 999);
    if (error) return new Response('Error', { status: 500 });
    data.forEach((r) => out.push(`${cell(r.email)},${r.created_at}`));
    if (data.length < 1000) break;
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response('﻿' + out.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="badge-waitlist-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
