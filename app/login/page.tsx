import type { Metadata } from 'next';
import { Orb } from '@/components/ui';
import { LoginForm } from './form';

export const metadata: Metadata = { title: 'Giriş' };
export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <main className="min-h-dvh grid place-items-center px-4 py-10">
      <div className="w-full max-w-[360px]">
        <div className="flex items-center gap-4 mb-8">
          <Orb size={52} />
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="badge" className="brand-img h-[22px] w-auto" />
            <p className="text-ink-3 mt-1">Yönetim paneli</p>
          </div>
        </div>
        <div className="group p-6">
          <LoginForm initialError={e === 'yetki' ? 'Bu hesabın panele erişim yetkisi yok.' : undefined} />
        </div>
        <p className="text-ink-3 text-[12.5px] mt-4 px-1">Hesabın yoksa Supabase&apos;te bir kullanıcı oluşturup admin_users tablosuna eklemen gerekir.</p>
      </div>
    </main>
  );
}
