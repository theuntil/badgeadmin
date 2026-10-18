import 'server-only';
import { supabaseServer } from './supabase';

export type Platform = 'ios' | 'android';
export type AppConfig = {
  platform: Platform;
  min_supported_version: string; min_supported_build: number | null;
  latest_version: string; latest_build: number | null;
  update_url: string; update_button_title: string;
  force_update_title: string; force_update_message: string;
  optional_update_title: string; optional_update_message: string;
  whats_new: string[];
  maintenance_enabled: boolean; shop_only_enabled: boolean; shop_only_product_id: string | null; app_mode: Mode; maintenance_title: string; maintenance_message: string;
  maintenance_status: string; maintenance_until: string | null; status_url: string | null;
  feature_flags: Record<string, boolean>;
  support_url: string | null; terms_url: string | null; privacy_url: string | null;
  updated_at: string;
};

export const platformOf = (p?: string): Platform => (p === 'android' ? 'android' : 'ios');
export const platformName = (p: Platform) => (p === 'ios' ? 'iOS' : 'Android');

export async function getConfig(platform: Platform) {
  const sb = await supabaseServer();
  const { data, error } = await sb.from('app_config').select('*').eq('platform', platform).maybeSingle<AppConfig>();
  if (error) throw new Error(error.message);
  return data;
}

export const FLAG_LABELS: Record<string, { label: string; hint: string }> = {
  tab_home: { label: 'Home', hint: 'Sosyal akış sekmesi' },
  tab_badges: { label: 'Badges', hint: 'Cihazlar ve animasyon kütüphanesi' },
  tab_race: { label: 'Race', hint: 'Yarış modu sekmesi' },
  tab_map: { label: 'Map', hint: 'Harita ve arkadaş konumları' },
  tab_profile: { label: 'Profile', hint: 'Profil sekmesi' },
  shop: { label: 'Shop', hint: 'Home’daki çanta ikonu ve Badge Car sayfası' },
  studio_upload: { label: 'Fotoğraf ve video yükleme', hint: 'Studio’daki Photo ve Video sekmeleri' },
  group_ride: { label: 'Group Ride', hint: 'Ortak sürüş planlama' },
};

export type Mode = 'normal' | 'maintenance' | 'shop' | 'waitlist';
export const modeOf = (c: { app_mode?: string | null; maintenance_enabled?: boolean; shop_only_enabled?: boolean }): Mode =>
  (['normal', 'maintenance', 'shop', 'waitlist'].includes(c.app_mode ?? '') ? c.app_mode as Mode
    : c.maintenance_enabled ? 'maintenance' : c.shop_only_enabled ? 'shop' : 'normal');
export const MODE_TEXT: Record<Mode, { title: string; screen: string; tone: 'live' | 'blue' | 'amber' | 'violet' }> = {
  normal: { title: 'Yayında', screen: 'Uygulamanın tamamı', tone: 'live' },
  maintenance: { title: 'Bakımda', screen: 'Bakım ekranı', tone: 'amber' },
  shop: { title: 'Sadece ürün sayfası', screen: 'Ürün sayfası', tone: 'blue' },
  waitlist: { title: 'Bekleme listesi', screen: 'Bekleme listesi ekranı', tone: 'violet' },
};
export const storeName = (p: Platform) => (p === 'ios' ? 'App Store' : 'Google Play');

export type Screen = {
  id: 'maintenance' | 'force_update' | 'shop' | 'waitlist';
  media_path: string | null; media_kind: 'image' | 'video' | null;
  title: string; body: string; placeholder: string; button_title: string;
  success_title: string; success_body: string; show_count: boolean;
};
