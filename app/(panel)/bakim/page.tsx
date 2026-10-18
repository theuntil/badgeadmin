import { redirect } from 'next/navigation';

export default async function MaintenanceRedirect({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  redirect(`/ekranlar?s=bakim${p === 'android' ? '&p=android' : ''}`);
}
