import Link from 'next/link';
import type { Metadata } from 'next';
import { Add01Icon, Delete02Icon, Edit02Icon } from '@hugeicons/core-free-icons';
import { publicUrl, requireAdmin, supabaseServer } from '@/lib/supabase';
import { ActionForm, ConfirmAction, Modal, ModalActions, SettingsForm } from '@/components/client';
import { Empty, Group, PageHeader, Row, Switch, Tag } from '@/components/ui';
import {
  createAnimation, createPost, deleteAnimation, deletePost, saveTexts, savePost, updateAnimation,
} from '@/actions/content';

export const metadata: Metadata = { title: 'İçerik' };

const TABS = [
  { id: 'animasyon', label: 'Animasyonlar' },
  { id: 'akis', label: 'Akış' },
  { id: 'metin', label: 'Metinler' },
] as const;

type SB = Awaited<ReturnType<typeof supabaseServer>>;
type Anim = { id: string; slug: string; name: string; category: string; pack_name: string | null; preview_path: string; poster_path: string | null; sort_order: number; is_featured: boolean; is_active: boolean };
type Post = { id: string; author_id: string; animation_id: string; device_type: string | null; caption: string; like_count: number; comment_count: number; age_minutes: number; sort_order: number; show_in_feed: boolean; is_published: boolean };

const age = (m: number) => (m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`);

function Dot({ src, size = 48 }: { src: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" className="rounded-full bg-[#050505] object-cover ring-1 ring-line shrink-0" style={{ width: size, height: size }} />;
}

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const t = (await searchParams).t;
  const tab = TABS.find((x) => x.id === t)?.id ?? 'animasyon';
  await requireAdmin();
  const sb = await supabaseServer();

  return (
    <>
      <PageHeader title="İçerik" description="Uygulamada görünen animasyonlar, akış ve metinler." />
      <nav className="seg mb-8" aria-label="İçerik türü">
        {TABS.map((x) => (
          <Link key={x.id} href={`/icerik?t=${x.id}`} aria-current={x.id === tab ? 'page' : undefined}>{x.label}</Link>
        ))}
      </nav>
      {tab === 'animasyon' ? <Animations sb={sb} /> : tab === 'akis' ? <Feed sb={sb} /> : <Texts sb={sb} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Animasyonlar
// ---------------------------------------------------------------------------
function AnimFields({ a }: { a?: Anim }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="field sm:col-span-2"><span>Ad</span>
        <input className="input" name="name" defaultValue={a?.name} maxLength={60} required autoFocus={!a} placeholder="Night Glow" /></label>
      <label className="field"><span>Kategori</span>
        <select className="input" name="category" defaultValue={a?.category ?? 'individual'}><option value="individual">Individual</option><option value="pack">Pack</option></select></label>
      <label className="field"><span>Paket adı</span>
        <input className="input" name="pack_name" defaultValue={a?.pack_name ?? ''} maxLength={40} placeholder="Sadece Pack ise" /></label>
      <label className="field"><span>{a ? 'Animasyon dosyasını değiştir' : 'Animasyon dosyası'}</span>
        <input className="input" type="file" name="file" accept="image/webp,image/gif,image/png" required={!a} />
        <small>Animated WebP önerilir · kare · en fazla 10 MB</small></label>
      <label className="field"><span>{a ? 'Posteri değiştir' : 'Poster (isteğe bağlı)'}</span>
        <input className="input" type="file" name="poster" accept="image/png,image/jpeg,image/webp" />
        <small>Listelerde görünen sabit kare</small></label>
      <label className="field"><span>Sıra</span>
        <input className="input mono" name="sort_order" defaultValue={a?.sort_order ?? 99} inputMode="numeric" /></label>
      <div className="flex flex-col gap-3 justify-end pb-1">
        <Switch name="is_active" defaultChecked={a?.is_active ?? true} label="Uygulamada görünsün" />
        <Switch name="is_featured" defaultChecked={a?.is_featured ?? false} label="Öne çıkan" />
      </div>
    </div>
  );
}

async function Animations({ sb }: { sb: SB }) {
  const [{ data }, { data: posts }] = await Promise.all([
    sb.from('animations').select('*').order('sort_order').returns<Anim[]>(),
    sb.from('posts').select('animation_id'),
  ]);
  const usage = new Map<string, number>();
  (posts ?? []).forEach((p) => usage.set(p.animation_id, (usage.get(p.animation_id) ?? 0) + 1));

  const addButton = (
    <Modal trigger={{ label: 'Yeni animasyon', icon: Add01Icon, className: 'btn btn-primary btn-sm' }} title="Yeni animasyon" width={600}>
      <ActionForm action={createAnimation} resetOnSuccess>
        <AnimFields />
        <ModalActions submitLabel="Yükle ve ekle" pending="Yükleniyor…" />
      </ActionForm>
    </Modal>
  );

  return (
    <Group title={`Kütüphane · ${data?.length ?? 0}`} action={addButton} bare
      foot="Silinen animasyonun dosyaları depolamadan da silinir. Gizlediğin animasyon uygulamada görünmez ama silinmez.">
      {data?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {data.map((a) => {
            const used = usage.get(a.id) ?? 0;
            return (
              <article key={a.id} className={`anim-card ${a.is_active ? '' : 'opacity-60'}`}>
                <div className="actions">
                  <Modal trigger={{ label: `${a.name} düzenle`, icon: Edit02Icon, iconOnly: true, className: 'btn btn-quiet btn-sm btn-icon' }} title={`${a.name} düzenle`} width={600}>
                    <ActionForm action={updateAnimation}>
                      <input type="hidden" name="id" value={a.id} />
                      <AnimFields a={a} />
                      <ModalActions submitLabel="Kaydet" />
                    </ActionForm>
                  </Modal>
                  <ConfirmAction
                    action={deleteAnimation} fields={{ id: a.id }}
                    title={`${a.name} silinsin mi?`}
                    message={<>
                      Animasyon ve dosyaları kalıcı olarak silinir.
                      {used ? <> Bu animasyonu kullanan <b className="text-ink">{used} gönderi</b> de silinir.</> : null}
                    </>}
                    confirmLabel="Sil"
                    trigger={{ label: `${a.name} sil`, icon: Delete02Icon, iconOnly: true, className: 'btn btn-quiet btn-sm btn-icon text-red' }}
                  />
                </div>
                <Dot src={publicUrl(a.preview_path)} size={88} />
                <div className="min-w-0 w-full">
                  <p className="font-semibold truncate">{a.name}</p>
                  <p className="text-ink-3 text-[13px] truncate">{a.category === 'pack' ? (a.pack_name || 'Pack') : 'Individual'}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 min-h-[22px]">
                  {a.is_featured ? <Tag tone="blue">Öne çıkan</Tag> : null}
                  {!a.is_active ? <Tag>Gizli</Tag> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : <Empty title="Henüz animasyon yok">Sağ üstteki “Yeni animasyon” ile ilkini ekle.</Empty>}
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Akış
// ---------------------------------------------------------------------------
async function Feed({ sb }: { sb: SB }) {
  const [{ data: posts }, { data: profiles }, { data: anims }, { data: devices }] = await Promise.all([
    sb.from('posts').select('*').order('show_in_feed', { ascending: false }).order('sort_order').order('age_minutes').returns<Post[]>(),
    sb.from('demo_profiles').select('id, handle, is_me').order('sort_order'),
    sb.from('animations').select('id, name, preview_path').order('sort_order'),
    sb.from('device_types').select('id, name').order('sort_order'),
  ]);
  const animById = new Map((anims ?? []).map((a) => [a.id, a]));
  const handleById = new Map((profiles ?? []).map((p) => [p.id, p.handle]));

  const fields = (p?: Post) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="field"><span>Paylaşan</span>
        <select className="input" name="author_id" defaultValue={p?.author_id}>
          {(profiles ?? []).map((u) => <option key={u.id} value={u.id}>@{u.handle}{u.is_me ? ' (sen)' : ''}</option>)}
        </select></label>
      <label className="field"><span>Animasyon</span>
        <select className="input" name="animation_id" defaultValue={p?.animation_id}>
          {(anims ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select></label>
      <label className="field sm:col-span-2"><span>Metin</span>
        <textarea className="input" name="caption" defaultValue={p?.caption} maxLength={300} required rows={2} /></label>
      <label className="field"><span>Cihaz</span>
        <select className="input" name="device_type" defaultValue={p?.device_type ?? ''}>
          <option value="">Belirtme</option>
          {(devices ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select></label>
      <label className="field"><span>Kaç dakika önce</span>
        <input className="input mono" name="age_minutes" defaultValue={p?.age_minutes ?? 30} inputMode="numeric" />
        <small>Sabit kalır: 12 yazarsan hep “12m” görünür</small></label>
      <label className="field"><span>Beğeni</span>
        <input className="input mono" name="like_count" defaultValue={p?.like_count ?? 120} inputMode="numeric" /></label>
      <label className="field"><span>Yorum</span>
        <input className="input mono" name="comment_count" defaultValue={p?.comment_count ?? 8} inputMode="numeric" /></label>
      <label className="field"><span>Sıra</span>
        <input className="input mono" name="sort_order" defaultValue={p?.sort_order ?? 0} inputMode="numeric" />
        <small>Küçük olan üstte</small></label>
      <div className="flex flex-col gap-3 justify-end pb-1">
        <Switch name="show_in_feed" defaultChecked={p?.show_in_feed ?? true} label="Akışta göster" />
        <Switch name="is_published" defaultChecked={p?.is_published ?? true} label="Yayında" />
      </div>
    </div>
  );

  const addButton = (
    <Modal trigger={{ label: 'Yeni gönderi', icon: Add01Icon, className: 'btn btn-primary btn-sm' }} title="Yeni gönderi" width={600}>
      <ActionForm action={createPost} resetOnSuccess>
        {fields()}
        <ModalActions submitLabel="Akışa ekle" pending="Ekleniyor…" />
      </ActionForm>
    </Modal>
  );

  return (
    <Group title={`Gönderiler · ${posts?.length ?? 0}`} action={addButton}>
      {posts?.length ? (
        <ul>
          {posts.map((p) => (
            <li key={p.id} className="flex items-center gap-4 px-5 py-3.5 [&+&]:border-t [&+&]:border-line">
              <Dot src={publicUrl(animById.get(p.animation_id)?.preview_path)} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">@{handleById.get(p.author_id) ?? '?'} <span className="text-ink-3 font-normal">· {age(p.age_minutes)}</span></p>
                <p className="text-ink-2 truncate">{p.caption}</p>
              </div>
              <span className="text-ink-3 text-[14px] hidden sm:block tabular-nums whitespace-nowrap">♥ {p.like_count}</span>
              {!p.is_published ? <Tag>Yayında değil</Tag> : !p.show_in_feed ? <Tag>Sadece profilde</Tag> : null}
              <div className="flex shrink-0">
                <Modal trigger={{ label: 'Düzenle', icon: Edit02Icon, iconOnly: true, className: 'btn btn-quiet btn-sm btn-icon' }} title="Gönderiyi düzenle" width={600}>
                  <ActionForm action={savePost}>
                    <input type="hidden" name="id" value={p.id} />
                    {fields(p)}
                    <ModalActions submitLabel="Kaydet" />
                  </ActionForm>
                </Modal>
                <ConfirmAction action={deletePost} fields={{ id: p.id }} title="Gönderi silinsin mi?"
                  message="Gönderi ve yorumları akıştan kalıcı olarak silinir." confirmLabel="Sil"
                  trigger={{ label: 'Sil', icon: Delete02Icon, iconOnly: true, className: 'btn btn-quiet btn-sm btn-icon text-red' }} />
              </div>
            </li>
          ))}
        </ul>
      ) : <div className="row"><span className="text-ink-3">Akış boş. “Yeni gönderi” ile ekle.</span></div>}
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Metinler
// ---------------------------------------------------------------------------
async function Texts({ sb }: { sb: SB }) {
  const { data } = await sb.from('app_content').select('key, value, description').eq('kind', 'text').order('key');
  if (!data?.length) return <Empty title="Metin yok">app_content tablosunda metin kaydı yok.</Empty>;
  return (
    <SettingsForm action={saveTexts}>
      <Group title="Uygulama metinleri" foot="Uygulama bu metinleri koddaki varsayılanların yerine kullanır. Uygulama İngilizce olduğu için metinleri İngilizce yaz. Video ve görseller Medya sayfasında.">
        {data.map((r) => (
          <Row key={r.key} label={r.description || r.key} top={r.value.length > 60} htmlFor={`t_${r.key}`}>
            <input type="hidden" name="key" value={r.key} />
            <input type="hidden" name="orig" value={r.value} />
            {r.value.length > 60
              ? <textarea id={`t_${r.key}`} className="input" name="value" defaultValue={r.value} rows={2} maxLength={1000} />
              : <input id={`t_${r.key}`} className="input" name="value" defaultValue={r.value} maxLength={1000} />}
          </Row>
        ))}
      </Group>
    </SettingsForm>
  );
}
