// src/app/api/knowledge/search/route.ts
// Semantic Vector Search endpoint over clinical knowledge base guidelines.

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { searchMedicalKnowledge } from '@/lib/ai/rag';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = Number(searchParams.get('limit')) || 5;
    const threshold = Number(searchParams.get('threshold')) || 0.35;

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required for clinical vector search." },
        { status: 400 }
      );
    }

    const results = await searchMedicalKnowledge(query, limit, threshold);

    return NextResponse.json({
      query,
      count: results.length,
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Knowledge search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
