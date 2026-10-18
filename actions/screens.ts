'use server';

import { act, must, EDIT, MANAGE } from '@/lib/act';
import { bool, str } from '@/lib/form';

export async function saveWaitlistScreen(f: FormData) {
  return act(EDIT, async ({ sb }) => {
    must(await sb.from('screens').update({
      title: str(f, 'title', 80) || 'Join the waitlist',
      body: str(f, 'body', 400),
      placeholder: str(f, 'placeholder', 40) || 'Email address',
      button_title: str(f, 'button_title', 40) || 'Join the waitlist',
      success_title: str(f, 'success_title', 80) || "You're on the list",
      success_body: str(f, 'success_body', 300),
      show_count: bool(f, 'show_count'),
    }).eq('id', 'waitlist').select('id'));
    return 'Bekleme listesi ekranı kaydedildi.';
  }, ['/ekranlar']);
}

export async function deleteWaitlistEntry(f: FormData) {
  return act(MANAGE, async ({ sb }) => {
    const id = parseInt(str(f, 'id', 20), 10);
    if (!Number.isFinite(id)) throw new Error('invalid');
    must(await sb.from('waitlist').delete().eq('id', id).select('id'));
    return 'Kayıt silindi.';
  }, ['/bekleme-listesi']);
}
