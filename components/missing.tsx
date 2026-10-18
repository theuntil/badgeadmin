import { Empty } from './ui';

export function MissingConfig({ platform }: { platform: string }) {
  return (
    <Empty title={`${platform} ayarları bulunamadı`}>
      Supabase&apos;te app_config tablosunda bu platformun satırı yok. Kurulum SQL&apos;ini çalıştırdığından emin ol.
    </Empty>
  );
}
