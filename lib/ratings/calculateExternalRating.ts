import type { ExternalRating, ExternalRatingConfidence, ExternalRatingLabel, ExternalSignal } from "@/lib/ratings/types";
import { normalizeSignalScore } from "@/lib/ratings/externalSignals";

export function calculateExternalRating(signals: ExternalSignal[]): ExternalRating {
  const normalizedSignals = normalizeSignals(signals);
  const scoredSignals = normalizedSignals.filter((signal) => signal.sourceType !== "store_service_rating" && typeof signal.score === "number");
  const now = new Date().toISOString();

  if (!scoredSignals.length) {
    return {
      label: "Sin datos suficientes",
      confidence: "low",
      source: "external_signals",
      sourcesCount: 0,
      explanation: "Todavía no hay suficientes puntuaciones externas para estimar la recepción del juego.",
      lastCheckedAt: now,
      signals: normalizedSignals
    };
  }

  const score = roundOneDecimal(average(scoredSignals.map((signal) => signal.score || 0)));
  const sourcesCount = scoredSignals.length;
  const confidence = calculateConfidence(scoredSignals, score);

  return {
    score,
    label: scoreToLabel(score),
    confidence,
    source: "external_signals",
    sourcesCount,
    explanation: buildExplanation(score, scoredSignals, confidence),
    lastCheckedAt: now,
    signals: normalizedSignals
  };
}

function buildExplanation(score: number, signals: ExternalSignal[], confidence: ExternalRatingConfidence) {
  const sourceNames = [...new Set(signals.map((signal) => signal.sourceName))];
  const scoreList = signals
    .map((signal) => `${signal.sourceName}${typeof signal.score === "number" ? ` ${formatNumber(signal.score, 1)}/10` : ""}`)
    .join(", ");
  const confidenceText = confidence === "high" ? "alta" : confidence === "medium" ? "media" : "baja";

  return `Media de ${formatNumber(score, 1)}/10 basada en ${sourceNames.length} fuentes: ${scoreList}. Confianza ${confidenceText}.`;
}

function calculateConfidence(signals: ExternalSignal[], score: number): ExternalRatingConfidence {
  if (signals.length >= 3) {
    const spread = Math.max(...signals.map((signal) => signal.score || score)) - Math.min(...signals.map((signal) => signal.score || score));
    if (spread <= 1.2) {
      return "high";
    }

    return "medium";
  }

  if (signals.length === 2) {
    return "medium";
  }

  const onlySignal = signals[0];
  if (onlySignal && onlySignal.sourceType === "product_rating" && (onlySignal.reviewCount || 0) >= 100) {
    return "medium";
  }

  return "low";
}

function scoreToLabel(score?: number): ExternalRatingLabel {
  if (typeof score !== "number") {
    return "Sin datos suficientes";
  }

  if (score >= 8.7) {
    return "Imprescindible";
  }

  if (score >= 8.0) {
    return "Muy recomendado";
  }

  if (score >= 7.0) {
    return "Recomendado";
  }

  if (score >= 6.0) {
    return "Interesante";
  }

  if (score >= 5.0) {
    return "Solo para fans";
  }

  return "Sin datos suficientes";
}

function normalizeSignals(signals: ExternalSignal[]) {
  return signals
    .map((signal) => ({
      ...signal,
      ...(typeof signal.score === "number" ? { score: clamp(signal.score, 0, 10) } : normalizeScoreSignal(signal))
    }))
    .filter((signal): signal is ExternalSignal => Boolean(signal.sourceName && signal.sourceType));
}

function normalizeScoreSignal(signal: ExternalSignal) {
  const score = normalizeSignalScore(signal);
  return typeof score === "number" ? { score } : {};
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function formatNumber(value: number, minimumFractionDigits = 0) {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits,
    maximumFractionDigits: 1
  }).format(value);
}
