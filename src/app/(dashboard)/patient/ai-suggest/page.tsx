"use client";

import { useState, useTransition } from "react";
import { Bot, ChevronRight, Loader2, AlertTriangle, Pill, Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MedicineSuggestion {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  contraindications?: string[];
}

interface AiResponse {
  suggestions: MedicineSuggestion[];
  clinical_reasoning: string;
  disclaimer: string;
  warnings?: string[];
  follow_up_recommended?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AiSuggestPage() {
  const [isPending, startTransition] = useTransition();

  const [symptoms, setSymptoms] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [result, setResult] = useState<AiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!symptoms.trim()) return;
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/ai/suggest-medicines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symptoms: symptoms.trim(),
            allergies: allergies.trim()
              ? allergies.split(",").map((a) => a.trim()).filter(Boolean)
              : [],
            current_conditions: conditions.trim()
              ? conditions.split(",").map((c) => c.trim()).filter(Boolean)
              : [],
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError((data as { error?: string }).error ?? "AI suggestion failed. Please try again.");
          return;
        }

        // The API returns an AiSuggestion object with a recommendation field
        const rec = (data as { recommendation?: AiResponse }).recommendation ?? data as AiResponse;
        setResult(rec);
      } catch {
        setError("Network error. Please check your connection and try again.");
      }
    });
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setSymptoms("");
    setAllergies("");
    setConditions("");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-[#14B8A6]">Patient portal · AI powered</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">AI Medicine Suggestion</h1>
        <p className="mt-1 text-[#64748B]">
          Describe your symptoms and get AI-powered medicine draft suggestions. Always consult a doctor before taking any medicine.
        </p>
      </div>

      {/* Disclaimer banner */}
      <div className="flex items-start gap-3 rounded-xl border border-[#FEF3C7] bg-[#FFFBEB] p-4">
        <AlertTriangle className="size-5 shrink-0 text-[#D97706] mt-0.5" />
        <p className="text-sm text-[#92400E]">
          <strong>Medical disclaimer:</strong> AI suggestions are for informational purposes only and do not replace professional medical advice. A licensed doctor must review and approve any prescription before use.
        </p>
      </div>

      {!result ? (
        /* ── Input Form ───────────────────────────────────────────────────── */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="size-5 text-[#14B8A6]" />
              Describe your condition
            </CardTitle>
            <CardDescription>
              The more detail you provide, the more relevant the AI suggestions will be.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="symptoms" className="text-sm font-semibold text-[#0F172A]">
                  Symptoms <span className="text-[#EF4444]">*</span>
                </Label>
                <Textarea
                  id="symptoms"
                  placeholder="e.g. I have had a persistent headache for 3 days, mild fever around 37.8°C, sore throat, and fatigue. No cough or shortness of breath."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={5}
                  required
                  className="resize-none"
                />
                <p className="text-xs text-[#64748B]">
                  Include duration, severity, and any associated symptoms for better results.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="allergies" className="text-sm font-semibold text-[#0F172A]">
                    Known allergies <span className="font-normal text-[#64748B]">(comma-separated)</span>
                  </Label>
                  <Input
                    id="allergies"
                    placeholder="e.g. Penicillin, Aspirin"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conditions" className="text-sm font-semibold text-[#0F172A]">
                    Existing conditions <span className="font-normal text-[#64748B]">(comma-separated)</span>
                  </Label>
                  <Input
                    id="conditions"
                    placeholder="e.g. Hypertension, Diabetes"
                    value={conditions}
                    onChange={(e) => setConditions(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-[#FEE2E2] px-4 py-3 text-sm font-medium text-[#991B1B]">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isPending || !symptoms.trim()}
                className="w-full"
              >
                {isPending ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" /> Analysing symptoms…</>
                ) : (
                  <><Bot className="size-4 mr-2" /> Get AI suggestions <ChevronRight className="size-4 ml-1" /></>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* ── Results ──────────────────────────────────────────────────────── */
        <div className="space-y-5">
          {/* Follow-up recommended */}
          {result.follow_up_recommended && (
            <div className="flex items-start gap-3 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
              <Info className="size-5 shrink-0 text-[#1D4ED8] mt-0.5" />
              <p className="text-sm text-[#1E3A8A]">
                <strong>Follow-up recommended:</strong> Based on your symptoms, a doctor consultation is advised in addition to these suggestions.
              </p>
            </div>
          )}

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-4">
              <AlertTriangle className="size-5 shrink-0 text-[#DC2626] mt-0.5" />
              <div className="text-sm text-[#7F1D1D]">
                <strong>Warnings:</strong>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Clinical reasoning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="size-4 text-[#14B8A6]" />
                Clinical reasoning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#334155] leading-relaxed">{result.clinical_reasoning}</p>
            </CardContent>
          </Card>

          {/* Medicine suggestions */}
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] mb-3 flex items-center gap-2">
              <Pill className="size-5 text-[#0EA5E9]" />
              Suggested medicines ({result.suggestions?.length ?? 0})
            </h2>
            <div className="space-y-3">
              {(result.suggestions ?? []).map((med, i) => (
                <Card key={i} className="border-[#E2E8F0]">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-[#0F172A]">{med.name}</p>
                        <p className="text-sm text-[#0EA5E9] font-medium">{med.dosage}</p>
                      </div>
                      <span className="shrink-0 inline-flex items-center rounded-full bg-[#CCFBF1] px-2.5 py-0.5 text-xs font-medium text-[#0F766E]">
                        Medicine {i + 1}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="text-[#64748B]">Frequency: </span>
                        <span className="font-medium text-[#0F172A]">{med.frequency}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B]">Duration: </span>
                        <span className="font-medium text-[#0F172A]">{med.duration}</span>
                      </div>
                    </div>

                    {med.instructions && (
                      <p className="text-sm text-[#475569] bg-[#F8FAFC] rounded-lg px-3 py-2">
                        💊 {med.instructions}
                      </p>
                    )}

                    {med.contraindications && med.contraindications.length > 0 && (
                      <div className="text-sm">
                        <span className="text-[#64748B]">Avoid if: </span>
                        <span className="text-[#DC2626]">{med.contraindications.join(", ")}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-xs text-[#64748B] leading-relaxed">
            <strong>Disclaimer:</strong> {result.disclaimer}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              <RotateCcw className="size-4 mr-2" /> Try again with different symptoms
            </Button>
            <Button
              onClick={() => window.location.href = "/patient/appointments/book"}
              className="flex-1"
            >
              Book a consultation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
