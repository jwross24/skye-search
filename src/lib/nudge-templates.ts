/**
 * Push notification nudge message templates.
 *
 * Design principles (from bead spec):
 * - Clock status FIRST (reduces anxiety by confirming safety)
 * - One pick, not a list (decision fatigue = paralysis)
 * - Warm, personal, brief — like a supportive friend
 * - No streaks, no penalties, no guilt
 * - Cap-exempt highlighted
 */

export interface NudgeContext {
  daysRemaining: number
  topPick: {
    title: string
    company: string
    matchScore: number
    visaPath: string
    url?: string
  } | null
  daysSinceLastOpen?: number
}

export type NudgeTemplate = 'standard' | 'no_match' | 'welcome_back' | 'warm_clock' | 'urgent_clock'

export function selectTemplate(ctx: NudgeContext): NudgeTemplate {
  // Urgent: <15 days
  if (ctx.daysRemaining <= 15) return 'urgent_clock'

  // Warm: 15-50 days
  if (ctx.daysRemaining <= 50) return 'warm_clock'

  // Welcome back after 2+ days away
  if (ctx.daysSinceLastOpen && ctx.daysSinceLastOpen >= 2) return 'welcome_back'

  // Standard with or without match
  return ctx.topPick ? 'standard' : 'no_match'
}

function clockLine(daysRemaining: number): string {
  if (daysRemaining > 100) return `Clock: ${daysRemaining} days — plenty of runway.`
  if (daysRemaining > 50) return `Clock: ${daysRemaining} days — you're in good shape.`
  if (daysRemaining > 15) return `Clock: ${daysRemaining} days remaining.`
  return `Clock: ${daysRemaining} days remaining — let's focus on your strongest leads.`
}

function pickLine(pick: NudgeContext['topPick']): string {
  if (!pick) return ''
  const capExempt = pick.visaPath === 'cap_exempt' ? ', cap-exempt' : ''
  const score = Math.round(pick.matchScore * 100)
  return `${pick.title} at ${pick.company} (${score}% match${capExempt})`
}

function linkLine(pick: NudgeContext['topPick']): string {
  if (!pick?.url) return ''
  return `\n${pick.url}`
}

export function buildMessage(ctx: NudgeContext): string {
  const template = selectTemplate(ctx)

  switch (template) {
    case 'standard':
      return [
        `Morning Skye 🌊 ${clockLine(ctx.daysRemaining)}`,
        '',
        `Found one for you: ${pickLine(ctx.topPick)}${linkLine(ctx.topPick)}`,
        '',
        `You're building momentum`,
      ].join('\n')

    case 'no_match':
      return [
        `Hey Skye 🌿 ${clockLine(ctx.daysRemaining)}`,
        '',
        `No new standout matches today — the pipeline is searching.`,
        `Maybe a good day to revisit your top picks in the app?`,
        '',
        `You've got this`,
      ].join('\n')

    case 'welcome_back':
      return [
        `Welcome back Skye 🌊`,
        '',
        clockLine(ctx.daysRemaining),
        ctx.topPick
          ? `\nHere's the best match since you've been away: ${pickLine(ctx.topPick)}${linkLine(ctx.topPick)}`
          : '\nThe pipeline kept searching while you were away.',
        '',
        `No rush. One step at a time`,
      ].join('\n')

    case 'warm_clock':
      return [
        `Morning Skye 🌊 ${clockLine(ctx.daysRemaining)}`,
        '',
        `Time to focus on your strongest leads.`,
        ctx.topPick
          ? `Top pick: ${pickLine(ctx.topPick)}${linkLine(ctx.topPick)}`
          : 'Check your top matches in the app.',
        '',
        `You have a plan, and you're working it`,
      ].join('\n')

    case 'urgent_clock':
      return [
        `Hey Skye 💙 ${clockLine(ctx.daysRemaining)}`,
        '',
        ctx.topPick
          ? `Priority: ${pickLine(ctx.topPick)}${linkLine(ctx.topPick)}`
          : 'Check your pipeline for cap-exempt opportunities.',
        '',
        `Every application counts right now. You're doing the hard part.`,
      ].join('\n')
  }
}
