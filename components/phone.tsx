import type { ReactNode } from 'react';

/** Uygulama ekranının telefon çerçevesinde önizlemesi (her zaman koyu, uygulama gibi). */
export function Phone({ mediaUrl, mediaKind, children, label = 'Uygulamada' }: {
  mediaUrl?: string; mediaKind?: 'image' | 'video' | null; children: ReactNode; label?: string;
}) {
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="font-semibold">{label}</figcaption>
      <div className="phone">
        <div className="phone-screen">
          {mediaUrl ? (
            <div className="phone-media">
              {mediaKind === 'video'
                ? <video src={mediaUrl} muted loop autoPlay playsInline preload="metadata" />
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={mediaUrl} alt="" />}
            </div>
          ) : null}
          <div className={`phone-content ${mediaUrl ? '' : 'no-media'}`}>{children}</div>
        </div>
      </div>
      <p className="text-ink-3 text-[13px]">Kaydedilmiş hali gösterilir.</p>
    </figure>
  );
}

export function PhoneButton({ children, ghost }: { children: ReactNode; ghost?: boolean }) {
  return <div className={`h-11 rounded-full grid place-items-center text-[13px] font-semibold ${ghost ? 'text-white/80' : 'bg-white text-black'}`}>{children}</div>;
}
