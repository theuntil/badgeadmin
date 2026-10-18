import { Suspense } from 'react';
import type { Metadata } from 'next';
import { canManageApp, requireAdmin } from '@/lib/supabase';
import { getConfig, platformName, platformOf, storeName } from '@/lib/config';
import { ActionForm, Modal, ModalClose, PlatformSwitch, SettingsForm, Submit } from '@/components/client';
import { Group, PageHeader, Row } from '@/components/ui';
import { MissingConfig } from '@/components/missing';
import { forceUpdate, saveVersions } from '@/actions/config';

export const metadata: Metadata = { title: 'Sürüm ve mağaza linkleri' };

export default async function VersionPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const platform = platformOf((await searchParams).p);
  const admin = await requireAdmin();
  const c = await getConfig(platform);
  if (!c) return <MissingConfig platform={platformName(platform)} />;
  const readOnly = !canManageApp(admin);

  return (
    <>
      <PageHeader
        title="Sürüm ve mağaza linkleri"
        description={`${platformName(platform)} uygulaması her açılışta kendi sürümünü buradaki değerlerle karşılaştırır. Güncelle butonu ${storeName(platform)} sayfasını açar.`}
        actions={<Suspense><PlatformSwitch /></Suspense>}
      />

      {!readOnly ? (
        <section className="group p-5 md:p-6 mb-10 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px]">
            <p className="font-semibold">Herkesi güncellemeye zorla</p>
            <p className="text-ink-3 text-[14px] mt-1">Yeni sürümü yayınladığında kullan. Eski sürümdeki herkes kapatılamayan güncelleme ekranını görür.</p>
          </div>
          <Modal
            trigger={{ label: 'Güncellemeye zorla', className: 'btn btn-secondary' }}
            title="Herkesi güncellemeye zorla"
            description={`Yazdığın sürümün altındaki tüm ${platformName(platform)} kullanıcıları ${storeName(platform)} sayfasına yönlendirilir ve güncelleyene kadar uygulamayı kullanamaz.`}
          >
            <ActionForm action={forceUpdate}>
              <input type="hidden" name="platform" value={platform} />
              <label className="field">
                <span>Yeni minimum sürüm</span>
                <input className="input mono" name="version" placeholder={c.latest_version} required autoFocus pattern="\d+(\.\d+){0,2}" />
                <small>Şu an minimum {c.min_supported_version}, en son {c.latest_version}. İkisi birlikte bu değere çekilir.</small>
              </label>
              <div className="flex justify-end gap-2 pt-6"><ModalClose /><Submit className="btn btn-danger" pending="Uygulanıyor…">Zorla</Submit></div>
            </ActionForm>
          </Modal>
        </section>
      ) : null}

      <SettingsForm action={saveVersions}>
        <input type="hidden" name="platform" value={platform} />
        <fieldset disabled={readOnly} className="contents">
          <Group title="Sürümler" foot="Build numarası opsiyonel. Aynı sürümün farklı build’lerini ayırmak istersen kullan.">
            <Row label="Minimum sürüm" hint="Altındakiler zorunlu güncelleme ekranını görür" htmlFor="min_v">
              <div className="flex gap-2">
                <input id="min_v" className="input mono max-w-[140px]" name="min_supported_version" defaultValue={c.min_supported_version} required pattern="\d+(\.\d+){0,2}" />
                <input className="input mono max-w-[110px]" name="min_supported_build" defaultValue={c.min_supported_build ?? ''} placeholder="build" aria-label="Minimum build" inputMode="numeric" />
              </div>
            </Row>
            <Row label="En son sürüm" hint="Altındakiler kapatılabilir bir bant görür" htmlFor="latest_v">
              <div className="flex gap-2">
                <input id="latest_v" className="input mono max-w-[140px]" name="latest_version" defaultValue={c.latest_version} required pattern="\d+(\.\d+){0,2}" />
                <input className="input mono max-w-[110px]" name="latest_build" defaultValue={c.latest_build ?? ''} placeholder="build" aria-label="En son build" inputMode="numeric" />
              </div>
            </Row>
          </Group>

          <Group title={`${storeName(platform)} linki`} foot={platform === 'android' ? 'Android uygulaması henüz yoksa da şimdiden doldurabilirsin; Android sürümü çıktığında aynı ayarları kullanır.' : 'TestFlight ya da web sitenin linkini de yazabilirsin.'}>
            <Row label="Güncelle butonu linki" hint={platform === 'ios' ? 'https://apps.apple.com/app/id…' : 'https://play.google.com/store/apps/details?id=…'} htmlFor="u_url">
              <input id="u_url" className="input mono" name="update_url" defaultValue={c.update_url} required inputMode="url" />
            </Row>
            <Row label="Buton yazısı" htmlFor="u_btn">
              <input id="u_btn" className="input" name="update_button_title" defaultValue={c.update_button_title} maxLength={60} />
            </Row>
          </Group>

          <p className="text-ink-2 -mt-4 mb-8">Güncelleme ekranının metinleri, görseli ve yenilikler listesi <a className="underline underline-offset-2" href={`/ekranlar?s=guncelleme${platform === 'android' ? '&p=android' : ''}`}>Ekranlar → Güncelleme gerekli</a> sayfasında.</p>
        </fieldset>
        {readOnly ? <p className="text-ink-3">Bu ayarları sadece sahip ve yöneticiler değiştirebilir.</p> : null}
      </SettingsForm>
    </>
  );
}
