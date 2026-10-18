'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase';
import { clientIp, hit, reset } from '@/lib/rate-limit';

export type LoginState = { error?: string; email?: string } | undefined;

const WINDOW = 15 * 60 * 1000;

export async function signIn(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase().slice(0, 200);
  const password = String(form.get('password') ?? '').slice(0, 200);
  if (!email || !password) return { error: 'E-posta ve şifreyi gir.', email };

  // Kaba kuvvet koruması: IP başına 20, IP+e-posta başına 5 deneme / 15 dk
  const ip = clientIp(await headers());
  const byIp = hit(`ip:${ip}`, 20, WINDOW);
  const byUser = hit(`u:${ip}:${email}`, 5, WINDOW);
  if (!byIp.ok || !byUser.ok) {
    const min = Math.ceil(Math.max(byIp.retryInSec, byUser.retryInSec) / 60);
    return { error: `Çok fazla deneme. ${min} dakika sonra tekrar dene.`, email };
  }

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    await new Promise((r) => setTimeout(r, 400)); // zamanlama farkını azalt
    return { error: 'E-posta veya şifre hatalı.', email };
  }

  const { data: admin } = await sb.from('admin_users').select('user_id').eq('user_id', data.user.id).maybeSingle();
  if (!admin) {
    await sb.auth.signOut();
    return { error: 'Bu hesabın panele erişim yetkisi yok.', email };
  }

  reset(`u:${ip}:${email}`);
  redirect('/');
}

export async function signOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect('/login');
}
