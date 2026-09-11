// src/lib/ai/rag.ts
// Retrieval-Augmented Generation (RAG) for medical knowledge and patient history.

import { createClient } from '@/lib/supabase/server';
import { generateEmbedding, cosineSimilarity } from '@/lib/ai/embeddings';

export interface MedicalKnowledgeMatch {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  similarity: number;
}

export interface PatientReportMatch {
  id: string;
  title: string | null;
  report_type: string;
  ai_summary: string | null;
  ocr_text: string | null;
  similarity: number;
  created_at: string;
}

/**
 * Searches the medical knowledge base using vector similarity.
 */
export async function searchMedicalKnowledge(
  query: string,
  limit = 4,
  threshold = 0.4
): Promise<MedicalKnowledgeMatch[]> {
  try {
    const supabase = await createClient();
    const queryEmbedding = await generateEmbedding(query);

    // 1. Try Supabase pgvector RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'match_medical_knowledge',
      {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
      }
    );

    if (!rpcError && rpcData && rpcData.length > 0) {
      return rpcData as MedicalKnowledgeMatch[];
    }

    // 2. Fallback: Table query with local cosine similarity / text search
    const { data: fallbackData } = await supabase
      .from('medical_knowledge')
      .select('id, title, category, content, tags, embedding')
      .limit(20);

    if (fallbackData && fallbackData.length > 0) {
      const scored = fallbackData
        .map((row) => {
          let score = 0.5;
          if (row.embedding && Array.isArray(row.embedding)) {
            score = cosineSimilarity(queryEmbedding, row.embedding);
          } else {
            // Text keyword overlap fallback
            const lowerQuery = query.toLowerCase();
            const lowerContent = (row.content + ' ' + row.title).toLowerCase();
            const keywords = lowerQuery.split(/\s+/);
            const matches = keywords.filter((k) => k.length > 3 && lowerContent.includes(k));
            score = matches.length > 0 ? 0.6 + matches.length * 0.1 : 0.3;
          }
          return {
            id: row.id,
            title: row.title,
            category: row.category,
            content: row.content,
            tags: row.tags || [],
            similarity: Number(score.toFixed(4)),
          };
        })
        .filter((item) => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return scored;
    }

    return [];
  } catch (err) {
    console.warn('RAG knowledge search error:', err);
    return [];
  }
}

/**
 * Searches a patient's historical reports and lab summaries.
 */
export async function searchPatientHistory(
  patientId: string,
  query: string,
  limit = 3
): Promise<PatientReportMatch[]> {
  try {
    const supabase = await createClient();
    const queryEmbedding = await generateEmbedding(query);

    // 1. Try vector RPC
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'match_patient_reports',
      {
        p_patient_id: patientId,
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: limit,
      }
    );

    if (!rpcError && rpcData && rpcData.length > 0) {
      return rpcData as PatientReportMatch[];
    }

    // 2. Fallback: Standard query on patient's recent reports
    const { data: reports } = await supabase
      .from('medical_reports')
      .select('id, title, report_type, ai_summary, ocr_text, created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!reports) return [];

    return reports.map((r) => ({
      id: r.id,
      title: r.title,
      report_type: r.report_type,
      ai_summary: r.ai_summary,
      ocr_text: r.ocr_text ? r.ocr_text.substring(0, 300) : null,
      similarity: 0.8,
      created_at: r.created_at,
    }));
  } catch (err) {
    console.warn('RAG patient history search error:', err);
    return [];
  }
}

/**
 * Builds composite RAG context strings for Groq prompt.
 */
export async function buildClinicalRagContext(
  symptoms: string,
  patientId?: string
): Promise<{
  guidelines: string[];
  pastReports: string[];
  sources: string[];
}> {
  const [knowledgeMatches, patientReports] = await Promise.all([
    searchMedicalKnowledge(symptoms, 4, 0.35),
    patientId ? searchPatientHistory(patientId, symptoms, 3) : Promise.resolve([]),
  ]);

  const guidelines = knowledgeMatches.map(
    (k) => `[GUIDELINE: ${k.title} (${k.category})]\n${k.content}`
  );

  const pastReports = patientReports.map(
    (r) =>
      `[PAST REPORT: ${r.title || r.report_type} (${new Date(r.created_at).toLocaleDateString()})]\nSummary: ${
        r.ai_summary || r.ocr_text || 'No summary available.'
      }`
  );

  const sources = [
    ...knowledgeMatches.map((k) => k.title),
    ...patientReports.map((r) => r.title || r.report_type),
  ];

  return { guidelines, pastReports, sources };
}
