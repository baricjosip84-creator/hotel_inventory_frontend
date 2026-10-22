/** A numeric before/after difference is evidence of impact only when linked to a recorded application.
 * Legacy and pre-application observations are not promoted to measured policy effect. */
export type AdaptivePolicyEffectEvidence = {
  application_id?: string | null;
  baseline_score?: number | string | null;
  observed_score?: number | string | null;
  delta_score?: number | string | null;
};

function finiteEvidenceNumber(value: unknown): boolean {
  if (typeof value !== 'number' && typeof value !== 'string') return false;
  if (typeof value === 'string' && !value.trim()) return false;
  return Number.isFinite(Number(value));
}

export function hasMeasuredPolicyEffect(evidence: AdaptivePolicyEffectEvidence | null | undefined): boolean {
  return Boolean(
    evidence && typeof evidence.application_id === 'string' && evidence.application_id.trim() &&
    finiteEvidenceNumber(evidence.baseline_score) &&
    finiteEvidenceNumber(evidence.observed_score) &&
    finiteEvidenceNumber(evidence.delta_score)
  );
}
