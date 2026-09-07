// SPDX-License-Identifier: MIT
import { NextRequest, NextResponse } from 'next/server';
import { getMathlibModule, getMathlibSummary, searchMathlib } from '@/lib/library/mathlib';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.get('summary') === 'true') return NextResponse.json(await getMathlibSummary());
  const moduleName = params.get('module');
  if (moduleName) {
    const module = await getMathlibModule(moduleName.slice(0, 300));
    return module
      ? NextResponse.json(module)
      : NextResponse.json({ error: 'Module not found.' }, { status: 404 });
  }
  const offset = Number(params.get('offset') ?? 0);
  const result = await searchMathlib({
    query: (params.get('q') ?? '').slice(0, 200),
    area: (params.get('area') ?? '').slice(0, 80),
    offset: Number.isFinite(offset) ? Math.max(0, Math.trunc(offset)) : 0,
    limit: 40,
  });
  return NextResponse.json(result);
}
