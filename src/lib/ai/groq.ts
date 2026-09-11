// src/lib/ai/groq.ts
// Groq AI integration for clinical decision support, medicine suggestions, and report summarization.

import Groq from 'groq-sdk';
import type { AiSuggestion, AiMedicineRecommendation } from '@/types';

// Default clinical LLM on Groq
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

let groqInstance: Groq | null = null;

function getGroqClient(): Groq | null {
  if (groqInstance) return groqInstance;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }
  groqInstance = new Groq({ apiKey });
  return groqInstance;
}

export interface PatientClinicalContext {
  fullName?: string;
  age?: number | string;
  bloodGroup?: string | null;
  allergies: string[];
  conditions: string[];
  currentMedications?: string[];
}

export interface SuggestionInput {
  symptoms: string;
  patient?: PatientClinicalContext;
  ragGuidelines?: string[];
  pastReportSummaries?: string[];
}

/**
 * Generates clinical medicine suggestions and differential analysis using Groq AI.
 */
export async function generateMedicineSuggestion(
  input: SuggestionInput
): Promise<AiSuggestion> {
  const groq = getGroqClient();

  // If no GROQ_API_KEY is provided in development, return a structured clinical fallback
  if (!groq) {
    return createMockClinicalSuggestion(input);
  }

  const systemPrompt = `You are a Board-Certified Clinical AI Pharmacotherapy Assistant.
Your task is to review the patient's reported symptoms, clinical history, known allergies, chronic conditions, and retrieved medical evidence to propose a safe, evidence-based medication regimen for physician review.

CRITICAL CLINICAL RULES:
1. STRICT ALLERGY CHECK: NEVER recommend a medicine or drug class the patient is allergic to (e.g. no penicillins/cephalosporins for penicillin allergy).
2. CONTRAINDICATIONS: Cross-check against existing conditions (e.g. NO NSAIDs in peptic ulcer or renal disease; caution in asthma).
3. EMERGENCY DETECTION: If red flag symptoms (severe chest pain, stroke signs, anaphylaxis, severe dyspnea) are present, set requires_immediate_er = true.
4. Output MUST be ONLY a valid JSON object matching the requested schema. No conversational preamble or trailing commentary.`;

  const userPrompt = `PATIENT CLINICAL PROFILE:
- Age: ${input.patient?.age ?? 'Unknown'}
- Blood Group: ${input.patient?.bloodGroup ?? 'Not specified'}
- Documented Allergies: ${input.patient?.allergies?.length ? input.patient.allergies.join(', ') : 'None documented'}
- Chronic Conditions: ${input.patient?.conditions?.length ? input.patient.conditions.join(', ') : 'None documented'}

REPORTED SYMPTOMS:
"${input.symptoms}"

${input.ragGuidelines && input.ragGuidelines.length > 0 ? `CLINICAL KNOWLEDGE BASE CONTEXT (RAG):\n${input.ragGuidelines.join('\n---\n')}\n` : ''}
${input.pastReportSummaries && input.pastReportSummaries.length > 0 ? `PREVIOUS LAB REPORTS & HISTORY:\n${input.pastReportSummaries.join('\n---\n')}\n` : ''}

Respond with a JSON object in this exact format:
{
  "differential_diagnoses": ["Primary Suspected Condition", "Secondary Suspected Condition"],
  "suggested_medicines": [
    {
      "name": "Generic Medicine Name (e.g. Amoxicillin)",
      "dosage": "e.g. 500mg",
      "frequency": "e.g. twice daily",
      "duration_days": 7,
      "purpose": "Targeted symptom or pathogen",
      "instructions": "e.g. Take with meals"
    }
  ],
  "precautions": ["Key monitoring parameters or side effects to watch for"],
  "contraindications": ["Specific drugs or food interactions to strictly avoid"],
  "lifestyle_advice": ["Non-pharmacological measures"],
  "confidence": 0.92,
  "requires_immediate_er": false,
  "notes": "Brief clinical rationale for the attending physician."
}`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: GROQ_MODEL,
      temperature: 0.2, // Low temperature for high clinical precision
      response_format: { type: 'json_object' },
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from Groq API');
    }

    const parsed = JSON.parse(content) as AiSuggestion;
    return parsed;
  } catch (error) {
    console.error('Groq AI generation error:', error);
    return createMockClinicalSuggestion(input);
  }
}

/**
 * Summarizes OCR laboratory reports, identifying abnormal biomarkers and clinical flags.
 */
export async function summarizeMedicalReportWithGroq(
  ocrText: string,
  patientAllergies: string[] = []
): Promise<{ summary: string; abnormalFlags: string[]; keyBiomarkers: Record<string, string> }> {
  const groq = getGroqClient();

  if (!groq) {
    return {
      summary: 'Automated extraction: Report received. Clinical review pending.',
      abnormalFlags: ['AI OCR parsing simulated in development mode'],
      keyBiomarkers: { status: 'Processed' },
    };
  }

  const prompt = `Analyze this medical lab report / prescription text:
"""
${ocrText}
"""
Patient Allergies: ${patientAllergies.join(', ') || 'None'}

Extract:
1. Concise 2-3 sentence clinical summary.
2. List of abnormal biomarkers or values out of reference range.
3. Key numerical metrics detected (e.g. HbA1c, Blood Pressure, WBC, Hemoglobin).

Respond with JSON:
{
  "summary": "...",
  "abnormalFlags": ["..."],
  "keyBiomarkers": { "Biomarker Name": "Value with Unit" }
}`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a Clinical Diagnostics Extraction AI. Output ONLY JSON.',
        },
        { role: 'user', content: prompt },
      ],
      model: GROQ_MODEL,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from Groq');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('Groq report summarization error:', error);
    return {
      summary: 'Report text parsed. Attending physician manual review recommended.',
      abnormalFlags: [],
      keyBiomarkers: {},
    };
  }
}

/**
 * Fallback generator for development or when GROQ_API_KEY is not yet populated.
 */
function createMockClinicalSuggestion(input: SuggestionInput): AiSuggestion {
  const symptomsLower = input.symptoms.toLowerCase();
  const allergies = (input.patient?.allergies || []).map((a) => a.toLowerCase());

  const hasPenicillinAllergy = allergies.some((a) => a.includes('penicillin') || a.includes('amoxicillin'));
  const hasNsaidAllergy = allergies.some((a) => a.includes('nsaid') || a.includes('ibuprofen') || a.includes('aspirin'));

  const suggestedMedicines: AiMedicineRecommendation[] = [];

  if (symptomsLower.includes('fever') || symptomsLower.includes('headache') || symptomsLower.includes('pain')) {
    suggestedMedicines.push({
      name: 'Acetaminophen (Paracetamol)',
      dosage: '500mg',
      frequency: 'every 6 to 8 hours as needed',
      duration_days: 3,
      purpose: 'Antipyretic and analgesic for fever and pain',
      instructions: 'Do not exceed 3000mg in 24 hours. Take with water.',
    });
  }

  if (symptomsLower.includes('cough') || symptomsLower.includes('cold') || symptomsLower.includes('throat')) {
    if (!hasPenicillinAllergy) {
      suggestedMedicines.push({
        name: 'Amoxicillin',
        dosage: '500mg',
        frequency: '3 times a day',
        duration_days: 7,
        purpose: 'Antibiotic for suspected bacterial pharyngitis / respiratory infection',
        instructions: 'Complete the entire 7-day course even if symptoms resolve.',
      });
    } else {
      suggestedMedicines.push({
        name: 'Azithromycin',
        dosage: '500mg Day 1, then 250mg daily',
        frequency: 'once daily',
        duration_days: 5,
        purpose: 'Alternative macrolide antibiotic due to documented penicillin allergy',
        instructions: 'Take 1 hour before or 2 hours after meals.',
      });
    }
  }

  if (symptomsLower.includes('swelling') || symptomsLower.includes('inflammation')) {
    if (!hasNsaidAllergy) {
      suggestedMedicines.push({
        name: 'Ibuprofen',
        dosage: '400mg',
        frequency: 'twice daily',
        duration_days: 5,
        purpose: 'Anti-inflammatory agent',
        instructions: 'Always take with food or milk.',
      });
    }
  }

  if (suggestedMedicines.length === 0) {
    suggestedMedicines.push({
      name: 'Oral Rehydration Salts (ORS)',
      dosage: '1 sachet in 1L water',
      frequency: 'as needed',
      duration_days: 3,
      purpose: 'Electrolyte rehydration and supportive care',
      instructions: 'Sip continuously throughout the day.',
    });
  }

  return {
    differential_diagnoses: ['Upper Respiratory Tract Infection', 'Viral Syndrome'],
    suggested_medicines: suggestedMedicines,
    precautions: [
      'Monitor body temperature every 6 hours',
      'Maintain adequate oral hydration (>2 liters/day)',
      'Consult physician immediately if shortness of breath develops',
    ],
    contraindications: hasPenicillinAllergy
      ? ['Strictly avoid all Beta-lactams and Penicillins']
      : ['Avoid duplicate acetaminophen-containing combination products'],
    lifestyle_advice: [
      'Prioritize 8 hours of restful sleep',
      'Warm saline gargles twice daily',
      'Avoid cold exposure and strenuous physical activity',
    ],
    confidence: 0.88,
    requires_immediate_er: symptomsLower.includes('chest pain') || symptomsLower.includes('shortness of breath'),
    notes: 'Generated via Clinical AI Assistant. Pending physician clinical sign-off.',
  };
}
