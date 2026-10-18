import Link from 'next/link';
import type { Metadata } from 'next';
import { Delete02Icon, Download04Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { canManageApp, requireAdmin, supabaseServer } from '@/lib/supabase';
import { fmtDate, fmtRelative } from '@/lib/form';
import { ConfirmAction } from '@/components/client';
import { Empty, Group, Icon, PageHeader } from '@/components/ui';
import { deleteWaitlistEntry } from '@/actions/screens';

export const metadata: Metadata = { title: 'Bekleme listesi' };

const PAGE = 50;

export default async function WaitlistPage({ searchParams }: { searchParams: Promise<{ q?: string; s?: string }> }) {
  const sp = await searchParams;
  const admin = await requireAdmin();
  const manage = canManageApp(admin);
  const q = (sp.q ?? '').trim().slice(0, 100);
  const page = Math.max(0, parseInt(sp.s ?? '0', 10) || 0);
  const sb = await supabaseServer();

  const now = Date.now();
  const day = new Date(now - 24 * 3600e3).toISOString();
  const week = new Date(now - 7 * 24 * 3600e3).toISOString();

  let list = sb.from('waitlist').select('id, email, created_at').order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE);
  if (q) list = list.ilike('email', `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`);

  const [{ count: total }, { count: today }, { count: last7 }, { data: rows }] = await Promise.all([
    sb.from('waitlist').select('id', { count: 'exact', head: true }),
    sb.from('waitlist').select('id', { count: 'exact', head: true }).gte('created_at', day),
    sb.from('waitlist').select('id', { count: 'exact', head: true }).gte('created_at', week),
    list,
  ]);
  const items = (rows ?? []).slice(0, PAGE);
  const more = (rows ?? []).length > PAGE;
  const link = (s: number) => `/bekleme-listesi?${new URLSearchParams({ ...(q ? { q } : {}), ...(s ? { s: String(s) } : {}) })}`;

  return (
    <>
      <PageHeader
        title="Bekleme listesi"
        description="Uygulamadaki bekleme listesi ekranından katılanlar. Ekranın görselini ve metinlerini Ekranlar sayfasından düzenlersin."
        actions={(total ?? 0) > 0 ? <a href="/bekleme-listesi/csv" className="btn btn-secondary btn-sm"><Icon icon={Download04Icon} size={17} />CSV indir</a> : null}
      />

      <section className="grid grid-cols-3 gap-3 mb-10">
        {[['Toplam', total], ['Son 24 saat', today], ['Son 7 gün', last7]].map(([label, n]) => (
          <div key={label as string} className="group px-5 py-4">
            <p className="text-ink-3 text-[13.5px]">{label}</p>
            <p className="text-[28px] font-semibold tracking-[-0.02em] tabular-nums mt-0.5">{(n as number ?? 0).toLocaleString('tr-TR')}</p>
          </div>
        ))}
      </section>

      <form className="relative mb-4 max-w-[420px]" role="search">
        <Icon icon={Search01Icon} size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
        <input className="input !pl-10" type="search" name="q" defaultValue={q} placeholder="E-posta ara" aria-label="E-posta ara" />
      </form>

      {!items.length ? (
        <Empty title={q ? 'Sonuç yok' : 'Henüz kimse katılmadı'}>
          {q ? <>“{q}” içeren bir e-posta bulunamadı. <Link href="/bekleme-listesi" className="underline">Aramayı temizle</Link></> : 'Uygulamada bekleme listesi ekranını göstermek için Ekranlar sayfasından “Bekleme listesi”ni seç.'}
        </Empty>
      ) : (
        <Group foot={manage ? 'Silinen kayıt geri alınamaz.' : 'Kayıt silmeyi sadece sahip ve yöneticiler yapabilir.'}>
          <ul>
            {items.map((r) => (
              <li key={r.id} className="flex items-center gap-4 px-5 py-3 [&+&]:border-t [&+&]:border-line">
                <span className="flex-1 min-w-0 font-medium truncate">{r.email}</span>
                <span className="text-ink-3 text-[14px] whitespace-nowrap" title={fmtDate(r.created_at)}>{fmtRelative(r.created_at)}</span>
                {manage ? (
                  <ConfirmAction action={deleteWaitlistEntry} fields={{ id: String(r.id) }} title="Kayıt silinsin mi?"
                    message={<><b className="text-ink">{r.email}</b> bekleme listesinden kalıcı olarak silinir.</>} confirmLabel="Sil"
                    trigger={{ label: `${r.email} sil`, icon: Delete02Icon, iconOnly: true, className: 'btn btn-quiet btn-sm btn-icon danger-hover' }} />
                ) : null}
              </li>
            ))}
          </ul>
        </Group>
      )}

      {page > 0 || more ? (
        <div className="flex justify-between -mt-4">
          {page > 0 ? <Link className="btn btn-secondary btn-sm" href={link(page - 1)}>Daha yeni</Link> : <span />}
          {more ? <Link className="btn btn-secondary btn-sm" href={link(page + 1)}>Daha eski</Link> : null}
        </div>
      ) : null}
    </>
  );
}
