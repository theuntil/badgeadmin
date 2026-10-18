import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type Role = 'owner' | 'admin' | 'editor';
export type Admin = { id: string; email: string; role: Role };

export function env() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ve SUPABASE_ANON_KEY tanımlı olmalı.');
  return { url: url.replace(/\/+$/, ''), key };
}

/** Oturum çerezleri tarayıcıdaki JavaScript'e kapalı (httpOnly) ve HTTPS'te secure. */
export function cookieOptions(): CookieOptions {
  const secure = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production';
  return { httpOnly: true, secure, sameSite: 'lax', path: '/' };
}

export async function supabaseServer() {
  const { url, key } = env();
  const store = await cookies();
  return createServerClient(url, key, {
    cookieOptions: cookieOptions(),
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, { ...options, ...cookieOptions() }));
        } catch {
          /* Server Component içinde yazılamaz; middleware yeniler. */
        }
      },
    },
  });
}

export async function currentAdmin(): Promise<Admin | null> {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from('admin_users').select('email, role').eq('user_id', user.id).maybeSingle();
  if (!data) return null;
  return { id: user.id, email: data.email, role: data.role as Role };
}

/** Sayfa ve action'larda: giriş + rol kontrolü. Veritabanı RLS ayrıca yazmayı engeller. */
export async function requireAdmin(roles: Role[] = ['owner', 'admin', 'editor']): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect('/login');
  if (!roles.includes(admin.role)) redirect('/?error=' + encodeURIComponent('Bu işlem için yetkin yok.'));
  return admin;
}

export const canManageApp = (a: Admin) => a.role === 'owner' || a.role === 'admin';

export function publicUrl(path: string | null | undefined) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${env().url}/storage/v1/object/public/${path.split('/').map(encodeURIComponent).join('/')}`;
}
