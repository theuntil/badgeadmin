import { Suspense } from 'react';
import type { Metadata } from 'next';
import { canManageApp, requireAdmin } from '@/lib/supabase';
import { FLAG_LABELS, getConfig, platformName, platformOf } from '@/lib/config';
import { PlatformSwitch, SettingsForm } from '@/components/client';
import { Group, PageHeader, Row, Switch } from '@/components/ui';
import { MissingConfig } from '@/components/missing';
import { saveFeatures } from '@/actions/config';

export const metadata: Metadata = { title: 'Özellikler' };

export default async function FeaturesPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const platform = platformOf((await searchParams).p);
  const admin = await requireAdmin();
  const c = await getConfig(platform);
  if (!c) return <MissingConfig platform={platformName(platform)} />;
  const readOnly = !canManageApp(admin);

  const flags: Record<string, boolean> = { ...Object.fromEntries(Object.keys(FLAG_LABELS).map((k) => [k, true])), ...c.feature_flags };
  const keys = Object.keys(flags);

  return (
    <>
      <PageHeader
        title="Özellikler"
        description="Kapattığın bölüm uygulamada gizlenir. Uygulama bir sonraki açılışta değişikliği alır."
        actions={<Suspense><PlatformSwitch /></Suspense>}
      />
      <SettingsForm action={saveFeatures}>
        <input type="hidden" name="platform" value={platform} />
        <input type="hidden" name="flag_keys" value={keys.join(',')} />
        <fieldset disabled={readOnly} className="contents">
          <Group title="Bölümler">
            {keys.map((k) => (
              <Row key={k} label={FLAG_LABELS[k]?.label ?? k} hint={FLAG_LABELS[k]?.hint ?? 'Özel bayrak'} htmlFor={`f_${k}`}>
                <div className="flex justify-end sm:justify-start"><Switch id={`f_${k}`} name={`flag_${k}`} defaultChecked={flags[k]} /></div>
              </Row>
            ))}
            <Row label="Yeni bayrak" hint="Uygulamaya ileride ekleyeceğin bir özellik için. Küçük harf ve alt çizgi." htmlFor="nf">
              <input id="nf" className="input mono max-w-[260px]" name="new_flag" placeholder="promo_banner" maxLength={40} />
            </Row>
          </Group>

          <Group title="Ayarlar ekranındaki linkler">
            <Row label="Help" htmlFor="l_h"><input id="l_h" className="input mono" name="support_url" defaultValue={c.support_url ?? ''} placeholder="https://" inputMode="url" /></Row>
            <Row label="Terms" htmlFor="l_t"><input id="l_t" className="input mono" name="terms_url" defaultValue={c.terms_url ?? ''} placeholder="https://" inputMode="url" /></Row>
            <Row label="Privacy Policy" htmlFor="l_p"><input id="l_p" className="input mono" name="privacy_url" defaultValue={c.privacy_url ?? ''} placeholder="https://" inputMode="url" /></Row>
          </Group>
        </fieldset>
        {readOnly ? <p className="text-ink-3">Bu ayarları sadece sahip ve yöneticiler değiştirebilir.</p> : null}
      </SettingsForm>
    </>
  );
}
