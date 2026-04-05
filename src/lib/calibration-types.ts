/**
 * Shared types for calibration feature.
 * Lives outside 'use server' files so they can be imported by client components.
 */

export interface CalibrationPick {
  id: string
  title: string
  company: string
  urgency_score: number
  match_score: number | null
  location: string | null
  url: string | null
  primary_reason: string
  visa_path: string | null
  cap_exempt_confidence: string | null
}

export type CalibrationTag = 'wrong_visa' | 'stale' | 'wrong_field' | 'other'
