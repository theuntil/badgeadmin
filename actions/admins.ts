'use server';

import { act } from '@/lib/act';
import { FormError, str, uuid } from '@/lib/form';

const ROLES = ['owner', 'admin', 'editor'];
function role(f: FormData) {
  const r = str(f, 'role', 10);
  if (!ROLES.includes(r)) throw new FormError('Geçersiz rol.');
  return r;
}

export async function addAdmin(f: FormData) {
  return act(['owner'], async ({ sb }) => {
    const email = str(f, 'email', 200).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new FormError('Geçerli bir e-posta yaz.');
    const { error } = await sb.rpc('admin_add', { p_email: email, p_role: role(f) });
    if (error) throw new Error(error.message);
    return `${email} yönetici olarak eklendi.`;
  }, ['/yoneticiler']);
}

export async function setAdminRole(f: FormData) {
  return act(['owner'], async ({ sb }) => {
    const { error } = await sb.rpc('admin_set_role', { p_user: uuid(f, 'user_id'), p_role: role(f) });
    if (error) throw new Error(error.message);
    return 'Rol güncellendi.';
  }, ['/yoneticiler']);
}

export async function removeAdmin(f: FormData) {
  return act(['owner'], async ({ sb }) => {
    const { error } = await sb.rpc('admin_remove', { p_user: uuid(f, 'user_id') });
    if (error) throw new Error(error.message);
    return 'Yönetici çıkarıldı. Bu kişi artık panele giremez.';
  }, ['/yoneticiler']);
}
