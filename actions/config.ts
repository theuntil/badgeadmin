'use server';

import { act, must, MANAGE } from '@/lib/act';
import { FormError, bool, intOrNull, lines, localToIso, str, url, version } from '@/lib/form';

function platform(f: FormData) {
  const p = str(f, 'platform', 10);
  if (p !== 'ios' && p !== 'android') throw new FormError('Geçersiz platform.');
  return p;
}

const MODE_OK: Record<string, string> = {
  normal: 'Uygulama normal moda alındı.',
  maintenance: 'Bakım modu açıldı. Kullanıcılar bakım ekranını görüyor.',
  shop: 'Kullanıcılar artık sadece ürün sayfasını görüyor.',
  waitlist: 'Kullanıcılar artık bekleme listesi ekranını görüyor.',
};

export async function setMode(f: FormData) {
  return act(MANAGE, async ({ sb }) => {
    const mode = str(f, 'mode', 20);
    if (!(mode in MODE_OK)) throw new FormError('Geçersiz mod.');
    must(await sb.from('app_config').update({ app_mode: mode }).eq('platform', platform(f)).select('platform'));
    return MODE_OK[mode];
  }, ['/', '/ekranlar']);
}

export async function saveMaintenance(f: FormData) {
  return act(MANAGE, async ({ sb }) => {
    const until = str(f, 'maintenance_until', 30);
    must(await sb.from('app_config').update({
      maintenance_title: str(f, 'maintenance_title', 80) || "We'll be right back",
      maintenance_message: str(f, 'maintenance_message', 400),
      maintenance_status: str(f, 'maintenance_status', 40) || 'In progress',
      maintenance_until: until ? localToIso(until) : null,
      status_url: url(f, 'status_url', { label: 'Durum sayfası linki' }),
    }).eq('platform', platform(f)).select('platform'));
    return 'Bakım ekranı kaydedildi.';
  }, ['/ekranlar']);
}

export async function saveUpdateScreen(f: FormData) {
  return act(MANAGE, async ({ sb }) => {
    must(await sb.from('app_config').update({
      force_update_title: str(f, 'force_update_title', 80) || 'Update required',
      force_update_message: str(f, 'force_update_message', 400),
      optional_update_title: str(f, 'optional_update_title', 80) || 'Update available',
      optional_update_message: str(f, 'optional_update_message', 400),
      whats_new: lines(f, 'whats_new'),
    }).eq('platform', platform(f)).select('platform'));
    return 'Güncelleme ekranı kaydedildi.';
  }, ['/ekranlar']);
}

export async function saveVersions(f: FormData) {
  return act(MANAGE, async ({ sb }) => {
    const min = version(f, 'min_supported_version', 'Minimum sürüm');
    const latest = version(f, 'latest_version', 'En son sürüm');
    must(await sb.from('app_config').update({
      min_supported_version: min,
      min_supported_build: intOrNull(f, 'min_supported_build'),
      latest_version: latest,
      latest_build: intOrNull(f, 'latest_build'),
      update_url: url(f, 'update_url', { required: true, label: platform(f) === 'ios' ? 'App Store linki' : 'Google Play linki' }),
      update_button_title: str(f, 'update_button_title', 60) || (platform(f) === 'ios' ? 'Update on the App Store' : 'Update on Google Play'),
    }).eq('platform', platform(f)).select('platform'));
    return 'Sürüm ayarları kaydedildi.';
  });
}

export async function forceUpdate(f: FormData) {
  return act(MANAGE, async ({ sb }) => {
    const v = version(f, 'version', 'Sürüm');
    must(await sb.from('app_config').update({ min_supported_version: v, latest_version: v }).eq('platform', platform(f)).select('platform'));
    return `${v} altındaki tüm sürümler artık güncelleme ekranında.`;
  });
}

export async function saveFeatures(f: FormData) {
  return act(MANAGE, async ({ sb }) => {
    const keys = str(f, 'flag_keys', 2000).split(',').filter((k) => /^[a-z0-9_]{1,40}$/.test(k));
    const flags: Record<string, boolean> = {};
    for (const k of keys) flags[k] = bool(f, `flag_${k}`);
    const added = str(f, 'new_flag', 40).toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
    if (added) flags[added] = true;

    must(await sb.from('app_config').update({
      feature_flags: flags,
      support_url: url(f, 'support_url', { label: 'Help linki' }),
      terms_url: url(f, 'terms_url', { label: 'Terms linki' }),
      privacy_url: url(f, 'privacy_url', { label: 'Privacy linki' }),
    }).eq('platform', platform(f)).select('platform'));
    return 'Özellikler kaydedildi.';
  });
}
