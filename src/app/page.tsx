import Workspace from '@/components/workspace/workspace';
import { getPlayground } from '@/lib/library/playgrounds';
import { notFound } from 'next/navigation';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ example?: string }>;
}) {
  const { example } = await searchParams;
  const playground = example ? getPlayground(example) : undefined;
  if (example && !playground) notFound();
  return <Workspace key={example ?? 'default'} playground={playground} />;
}
