import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-dvh grid place-items-center px-4 text-center">
      <div>
        <p className="text-[15px] font-medium">Bu sayfa yok.</p>
        <Link href="/" className="btn btn-secondary mt-4">Genel bakışa dön</Link>
      </div>
    </main>
  );
}
