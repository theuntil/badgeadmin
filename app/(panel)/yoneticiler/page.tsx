import type { Metadata } from 'next';
import { Add01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { requireAdmin, supabaseServer } from '@/lib/supabase';
import { fmtDate, fmtRelative } from '@/lib/form';
import { ActionForm, ConfirmAction, Modal, ModalActions, Submit } from '@/components/client';
import { Group, PageHeader, Tag } from '@/components/ui';
import { addAdmin, removeAdmin, setAdminRole } from '@/actions/admins';

export const metadata: Metadata = { title: 'Yöneticiler' };

type AdminRow = { user_id: string; email: string; role: 'owner' | 'admin' | 'editor'; created_at: string; last_sign_in_at: string | null; is_me: boolean };

const ROLE_TEXT = {
  owner: { label: 'Sahip', hint: 'Her şey + yönetici ekleyip çıkarma' },
  admin: { label: 'Yönetici', hint: 'Her şey (yönetici yönetimi hariç)' },
  editor: { label: 'Editör', hint: 'Mağaza, içerik ve medya. Uygulama modu, sürüm ve marka hariç.' },
} as const;

export default async function AdminsPage() {
  const me = await requireAdmin();
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc('admin_list');
  const rows = (data ?? []) as AdminRow[];
  const owner = me.role === 'owner';
  const owners = rows.filter((r) => r.role === 'owner').length;

  const addButton = owner ? (
    <Modal trigger={{ label: 'Yönetici ekle', icon: Add01Icon, className: 'btn btn-primary btn-sm' }} title="Yönetici ekle"
      description="Kişinin önce Supabase’te bir hesabı olmalı: Studio → Authentication → Add user (Auto Confirm açık).">
      <ActionForm action={addAdmin} resetOnSuccess>
        <div className="grid gap-4">
          <label className="field"><span>E-posta</span>
            <input className="input" type="email" name="email" required autoFocus placeholder="isim@ornek.com" /></label>
          <label className="field"><span>Rol</span>
            <select className="input" name="role" defaultValue="editor">
              {(['editor', 'admin', 'owner'] as const).map((r) => <option key={r} value={r}>{ROLE_TEXT[r].label} — {ROLE_TEXT[r].hint}</option>)}
            </select></label>
        </div>
        <ModalActions submitLabel="Ekle" pending="Ekleniyor…" />
      </ActionForm>
    </Modal>
  ) : null;

  return (
    <>
      <PageHeader title="Yöneticiler" description="Panele kimlerin girebileceği ve neleri değiştirebileceği. Rol kuralları veritabanında da uygulanır." />
      {error ? <p className="text-red mb-6">Liste yüklenemedi. Güncelleme 2 SQL’ini çalıştırdığından emin ol.</p> : null}

      <Group title={`Hesaplar · ${rows.length}`} action={addButton}
        foot={owner ? 'Çıkardığın kişinin hesabı silinmez, sadece panele erişimi kalkar. Hesabı tamamen silmek için Studio → Authentication.' : 'Yönetici eklemeyi ve çıkarmayı sadece sahipler yapabilir.'}>
        <ul>
          {rows.map((r) => {
            const lastOwner = r.role === 'owner' && owners <= 1;
            return (
              <li key={r.user_id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 [&+&]:border-t [&+&]:border-line">
                <div className="flex-1 min-w-[220px]">
                  <p className="font-semibold flex items-center gap-2">{r.email}{r.is_me ? <Tag>Sen</Tag> : null}</p>
                  <p className="text-ink-3 text-[13.5px]" title={r.last_sign_in_at ? fmtDate(r.last_sign_in_at) : undefined}>
                    {r.last_sign_in_at ? `Son giriş ${fmtRelative(r.last_sign_in_at)}` : 'Henüz giriş yapmadı'}
                  </p>
                </div>
                {owner && !r.is_me ? (
                  <ActionForm action={setAdminRole} className="flex items-center gap-2">
                    <input type="hidden" name="user_id" value={r.user_id} />
                    <select name="role" defaultValue={r.role} className="input !w-auto" aria-label={`${r.email} rolü`} disabled={lastOwner}>
                      {(['owner', 'admin', 'editor'] as const).map((x) => <option key={x} value={x}>{ROLE_TEXT[x].label}</option>)}
                    </select>
                    {!lastOwner ? <Submit className="btn btn-secondary btn-sm" pending="…">Kaydet</Submit> : null}
                  </ActionForm>
                ) : (
                  <Tag tone={r.role === 'owner' ? 'blue' : 'neutral'}>{ROLE_TEXT[r.role].label}</Tag>
                )}
                {owner && !r.is_me && !lastOwner ? (
                  <ConfirmAction action={removeAdmin} fields={{ user_id: r.user_id }} title={`${r.email} çıkarılsın mı?`}
                    message="Bu kişi panele bir daha giremez. Hesabı Supabase’te kalır; istersen sonra tekrar ekleyebilirsin."
                    confirmLabel="Çıkar"
                    trigger={{ label: `${r.email} çıkar`, icon: Delete02Icon, iconOnly: true, className: 'btn btn-quiet btn-sm btn-icon text-red' }} />
                ) : null}
              </li>
            );
          })}
        </ul>
      </Group>

      <Group title="Roller">
        {(['owner', 'admin', 'editor'] as const).map((r) => (
          <div key={r} className="row"><span className="row-label">{ROLE_TEXT[r].label}</span><span className="text-ink-2">{ROLE_TEXT[r].hint}</span></div>
        ))}
      </Group>
    </>
  );
}
