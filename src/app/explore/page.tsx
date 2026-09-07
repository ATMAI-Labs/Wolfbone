// SPDX-License-Identifier: MIT
import Atlas from '@/components/library/atlas';
import { getMathlibSummary } from '@/lib/library/mathlib';

export const metadata = { title: 'Wolfbone — explore mathematical thought' };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ concept?: string }>;
}) {
  const { concept } = await searchParams;
  return <Atlas summary={await getMathlibSummary()} initialConcept={concept} />;
}
