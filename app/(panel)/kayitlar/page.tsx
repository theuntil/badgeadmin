import Link from 'next/link';
import type { Metadata } from 'next';
import { requireAdmin, supabaseServer } from '@/lib/supabase';
import { fmtDate, fmtRelative } from '@/lib/form';
import { Empty, PageHeader, Tag } from '@/components/ui';

export const metadata: Metadata = { title: 'Değişiklik kaydı' };

type Row = {
  id: number; table_name: string; row_id: string | null; action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null;
  actor_email: string | null; created_at: string;
};

const TABLES: Record<string, string> = {
  app_config: 'Uygulama ayarları', products: 'Mağaza', animations: 'Animasyon', posts: 'Gönderi',
  app_content: 'Metin / medya', demo_profiles: 'Profil', admin_users: 'Yönetici hesabı', stories: 'Story',
  notifications: 'Bildirim', race_events: 'Yarış', race_grid: 'Yarış grid', rides: 'Sürüş', device_types: 'Cihaz görseli',
};
const IGNORE = new Set(['updated_at', 'created_at']);
const PAGE = 50;

function show(v: unknown) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'açık' : 'kapalı';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > 80 ? s.slice(0, 77) + '…' : s;
}

function diff(r: Row) {
  if (r.action !== 'UPDATE' || !r.old_data || !r.new_data) return [];
  return Object.keys(r.new_data)
    .filter((k) => !IGNORE.has(k) && JSON.stringify(r.old_data![k]) !== JSON.stringify(r.new_data![k]))
    .map((k) => ({ k, from: r.old_data![k], to: r.new_data![k] }));
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireAdmin();
  const page = Math.max(0, parseInt((await searchParams).s ?? '0', 10) || 0);
  const sb = await supabaseServer();
  const { data } = await sb.from('audit_log')
    .select('id, table_name, row_id, action, old_data, new_data, actor_email, created_at')
    .not('actor_id', 'is', null)
    .order('id', { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE)
    .returns<Row[]>();
  const rows = (data ?? []).slice(0, PAGE);
  const hasMore = (data ?? []).length > PAGE;

  return (
    <>
      <PageHeader title="Değişiklik kaydı" description="Panelden yapılan her değişiklik kimin yaptığıyla birlikte burada tutulur. Kayıtlar silinemez." />
      {!rows.length ? <Empty title="Henüz değişiklik yok">Panelden bir şey kaydettiğinde burada görünecek.</Empty> : (
        <ol className="group">
          {rows.map((r) => {
            const ch = diff(r);
            return (
              <li key={r.id} className="px-5 py-4 [&+&]:border-t [&+&]:border-line">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{TABLES[r.table_name] ?? r.table_name}</span>
                  {r.row_id && r.table_name === 'app_config' ? <Tag>{r.row_id === 'ios' ? 'iOS' : 'Android'}</Tag> : null}
                  <Tag tone={r.action === 'DELETE' ? 'red' : r.action === 'INSERT' ? 'live' : 'neutral'}>
                    {r.action === 'DELETE' ? 'Silindi' : r.action === 'INSERT' ? 'Eklendi' : 'Güncellendi'}
                  </Tag>
                  <span className="text-ink-3 ml-auto text-[13px]" title={fmtDate(r.created_at)}>{r.actor_email} · {fmtRelative(r.created_at)}</span>
                </div>
                {ch.length ? (
                  <dl className="mt-2.5 grid grid-cols-[minmax(0,180px)_1fr] gap-x-4 gap-y-1 text-[13px]">
                    {ch.slice(0, 8).map((c) => (
                      <div key={c.k} className="contents">
                        <dt className="font-mono text-ink-3 truncate">{c.k}</dt>
                        <dd className="min-w-0 break-words"><span className="text-ink-3 line-through decoration-ink-3/50">{show(c.from)}</span> <span className="text-ink-3">→</span> {show(c.to)}</dd>
                      </div>
                    ))}
                    {ch.length > 8 ? <dd className="col-span-2 text-ink-3">ve {ch.length - 8} alan daha</dd> : null}
                  </dl>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      {(page > 0 || hasMore) ? (
        <div className="flex justify-between mt-4">
          {page > 0 ? <Link className="btn btn-secondary btn-sm" href={`/kayitlar?s=${page - 1}`}>Daha yeni</Link> : <span />}
          {hasMore ? <Link className="btn btn-secondary btn-sm" href={`/kayitlar?s=${page + 1}`}>Daha eski</Link> : null}
        </div>
      ) : null}
    </>
  );
}
