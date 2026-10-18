'use client';

export default function PanelError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="group px-6 py-12 text-center">
      <p className="font-medium">Sayfa yüklenemedi.</p>
      <p className="text-ink-3 mt-1">Supabase&apos;e ulaşılamıyor olabilir. Bağlantıyı kontrol edip tekrar dene.</p>
      <button className="btn btn-secondary mt-5" onClick={reset}>Tekrar dene</button>
    </div>
  );
}
