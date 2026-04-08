/**
 * Application Staleness — source-aware thresholds for nudges, visual cooldown, and auto-archive.
 * Academic and government hiring moves slowly; industry moves fast.
 * "until_filled" positions sit between academic and industry.
 */

export type SourceType = 'academic' | 'government' | 'industry' | 'until_filled'
export type StalenessLevel = 'fresh' | 'stale' | 'ghosted' | 'archived'

export interface StalenessThresholds {
  nudgeDays: number       // When to show nudge
  cooldownDays: number    // When to apply visual cooldown
  ghostedDays: number     // When to mark as ghosted
  archiveDays: number     // When to auto-archive
}

const THRESHOLDS: Record<SourceType, Record<string, StalenessThresholds>> = {
  academic: {
    interested: { nudgeDays: 5, cooldownDays: 14, ghostedDays: 56, archiveDays: 90 },
    tailoring: { nudgeDays: 3, cooldownDays: 7, ghostedDays: 28, archiveDays: 60 },
    applied: { nudgeDays: 28, cooldownDays: 42, ghostedDays: 56, archiveDays: 90 },
    phone_screen: { nudgeDays: 14, cooldownDays: 21, ghostedDays: 42, archiveDays: 60 },
    interview: { nudgeDays: 14, cooldownDays: 21, ghostedDays: 42, archiveDays: 60 },
  },
  government: {
    interested: { nudgeDays: 5, cooldownDays: 14, ghostedDays: 70, archiveDays: 90 },
    tailoring: { nudgeDays: 3, cooldownDays: 7, ghostedDays: 28, archiveDays: 60 },
    applied: { nudgeDays: 35, cooldownDays: 50, ghostedDays: 70, archiveDays: 90 },
    phone_screen: { nudgeDays: 21, cooldownDays: 28, ghostedDays: 56, archiveDays: 90 },
    interview: { nudgeDays: 14, cooldownDays: 21, ghostedDays: 42, archiveDays: 60 },
  },
  industry: {
    interested: { nudgeDays: 5, cooldownDays: 10, ghostedDays: 28, archiveDays: 45 },
    tailoring: { nudgeDays: 3, cooldownDays: 5, ghostedDays: 14, archiveDays: 30 },
    applied: { nudgeDays: 14, cooldownDays: 21, ghostedDays: 28, archiveDays: 45 },
    phone_screen: { nudgeDays: 7, cooldownDays: 14, ghostedDays: 21, archiveDays: 30 },
    interview: { nudgeDays: 7, cooldownDays: 14, ghostedDays: 21, archiveDays: 30 },
  },
  until_filled: {
    interested: { nudgeDays: 5, cooldownDays: 14, ghostedDays: 56, archiveDays: 90 },
    tailoring: { nudgeDays: 3, cooldownDays: 7, ghostedDays: 28, archiveDays: 60 },
    applied: { nudgeDays: 21, cooldownDays: 35, ghostedDays: 56, archiveDays: 90 },
    phone_screen: { nudgeDays: 14, cooldownDays: 21, ghostedDays: 42, archiveDays: 60 },
    interview: { nudgeDays: 14, cooldownDays: 21, ghostedDays: 42, archiveDays: 60 },
  },
}

export function getStalenessLevel(
  daysInStatus: number,
  status: string,
  sourceType: SourceType,
  hasDeadline: boolean,
  daysToDeadline?: number,
): StalenessLevel {
  const thresholds = THRESHOLDS[sourceType]?.[status]
  if (!thresholds) return 'fresh'

  // Accelerate nudge if deadline within 14 days (interested/tailoring only)
  const effectiveNudgeDays = hasDeadline && daysToDeadline !== undefined && daysToDeadline <= 14
    && (status === 'interested' || status === 'tailoring')
    ? 2
    : thresholds.nudgeDays

  if (daysInStatus >= thresholds.archiveDays) return 'archived'
  if (daysInStatus >= thresholds.ghostedDays) return 'ghosted'
  if (daysInStatus >= thresholds.cooldownDays) return 'stale'
  if (daysInStatus >= effectiveNudgeDays) return 'stale'
  return 'fresh'
}

export function getNudgeMessage(
  status: string,
  company: string,
  sourceType: SourceType,
  daysInStatus: number,
  deadline?: string,
): { message: string; actions: Array<{ label: string; action: 'advance' | 'snooze' | 'remove' }> } | null {
  const thresholds = THRESHOLDS[sourceType]?.[status]
  if (!thresholds) return null

  // Deadline-accelerated nudge — checked BEFORE regular threshold (lower bar: 2 days)
  if (deadline && (status === 'interested' || status === 'tailoring')) {
    const daysToDeadline = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysToDeadline > 0 && daysToDeadline <= 14 && daysInStatus >= 2) {
      return {
        message: `${company} closes in ${daysToDeadline} days \u2014 want to queue this for tailoring?`,
        actions: [
          { label: 'Start tailoring', action: 'advance' },
          { label: 'Not this one', action: 'remove' },
        ],
      }
    }
  }

  if (daysInStatus < thresholds.nudgeDays) return null

  if (status === 'interested' || status === 'tailoring') {
    return {
      message: `This one\u2019s been waiting \u2014 still interested in ${company}?`,
      actions: [
        { label: 'Apply this week', action: 'advance' },
        { label: 'Not ready yet', action: 'snooze' },
        { label: 'Remove', action: 'remove' },
      ],
    }
  }

  if (status === 'applied' && daysInStatus >= thresholds.ghostedDays) {
    const timeframe = sourceType === 'academic' ? 'academic hiring' : sourceType === 'government' ? 'government hiring' : 'this timeline'
    return {
      message: `No response from ${company} yet \u2014 this is normal for ${timeframe}.`,
      actions: [
        { label: 'Keep waiting', action: 'snooze' },
        { label: 'Archive', action: 'remove' },
      ],
    }
  }

  if (status === 'applied') {
    return {
      message: `Applied to ${company} ${daysInStatus} days ago. Any updates?`,
      actions: [
        { label: 'Got a response', action: 'advance' },
        { label: 'Still waiting', action: 'snooze' },
      ],
    }
  }

  return null
}

export function getThresholds(sourceType: SourceType, status: string): StalenessThresholds | null {
  return THRESHOLDS[sourceType]?.[status] ?? null
}
