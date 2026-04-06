'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  Shield,
  MapPin,
  GraduationCap,
} from 'lucide-react'

// ─── School Data ────────────────────────────────────────────────────────────

interface School {
  name: string
  distance: string
  program: string
  accreditation: string
  onSite: string
  tuition: string
  verified: boolean
  note?: string
}

const SCHOOLS: School[] = [
  { name: 'Curry College', distance: '15 min', program: 'MBA', accreditation: 'NECHE', onSite: 'Weekend monthly', tuition: '$800/credit', verified: true },
  { name: 'Cambridge College', distance: '10 min', program: 'MBA/MS Management', accreditation: 'NECHE', onSite: 'Weekend monthly', tuition: '$675/credit', verified: true },
  { name: 'New England College', distance: '75 min', program: 'MBA/MS', accreditation: 'NECHE', onSite: 'Weekend monthly', tuition: '$700/credit', verified: true },
  { name: 'Tiffin University', distance: 'Online + trips', program: 'MBA', accreditation: 'HLC', onSite: '3 weekends/semester', tuition: '$550/credit', verified: true },
  { name: 'Westcliff University', distance: 'Online + trips', program: 'DBA/MBA', accreditation: 'WSCUC', onSite: 'Quarterly intensive', tuition: '$500/credit', verified: false, note: 'USCIS scrutiny reported' },
  { name: 'Monroe College', distance: 'Online + NYC trips', program: 'MBA/MS', accreditation: 'MSCHE', onSite: 'Weekend monthly', tuition: '$650/credit', verified: true },
  { name: 'Harrisburg University', distance: 'Online + trips', program: 'MS Analytics', accreditation: 'MSCHE', onSite: '2 weekends/semester', tuition: '$725/credit', verified: true },
  { name: 'University of the Cumberlands', distance: 'Online + KY trips', program: 'PhD/EdD', accreditation: 'SACSCOC', onSite: 'Semester intensive', tuition: '$300/credit', verified: true },
  { name: 'Ottawa University', distance: 'Online + KS trips', program: 'MBA', accreditation: 'HLC', onSite: 'Quarterly intensive', tuition: '$450/credit', verified: true },
  { name: 'CIAM (California Institute)', distance: 'Online + CA trips', program: 'MBA/DBA', accreditation: 'WSCUC', onSite: 'Quarterly intensive', tuition: '$475/credit', verified: false, note: 'USCIS scrutiny reported' },
  { name: 'Sofia University', distance: 'Online + CA trips', program: 'MBA/PhD', accreditation: 'WSCUC', onSite: 'Weekend monthly', tuition: '$550/credit', verified: false, note: 'USCIS scrutiny reported' },
  { name: 'Humphreys University', distance: 'Online + CA trips', program: 'MBA/JD', accreditation: 'WSCUC', onSite: 'Hybrid', tuition: '$400/credit', verified: true },
  { name: 'National University', distance: 'Online + CA trips', program: 'MBA/MS', accreditation: 'WSCUC', onSite: 'Online only', tuition: '$425/credit', verified: true },
]

// ─── Risk Tiers ─────────────────────────────────────────────────────────────

interface RiskTier {
  label: string
  tone: 'lower' | 'moderate' | 'higher'
  description: string
  schools: string[]
}

const RISK_TIERS: RiskTier[] = [
  {
    label: 'Lower risk',
    tone: 'lower',
    description: 'NECHE/HLC accredited, established programs, in-state or nearby',
    schools: ['Curry College', 'Cambridge College', 'New England College', 'Tiffin University'],
  },
  {
    label: 'Moderate risk',
    tone: 'moderate',
    description: 'Regional accreditation, online-heavy, out-of-state trips required',
    schools: ['Monroe College', 'Harrisburg University', 'University of the Cumberlands', 'Ottawa University', 'Humphreys University', 'National University'],
  },
  {
    label: 'Higher risk',
    tone: 'higher',
    description: 'Reported USCIS scrutiny or newer programs',
    schools: ['Westcliff University', 'CIAM (California Institute)', 'Sofia University'],
  },
]

// ─── SEVIS Steps ────────────────────────────────────────────────────────────

const SEVIS_STEPS = [
  { label: 'Research and select a program', detail: 'Use the comparison table above' },
  { label: 'Submit application to selected school', detail: 'Deadline: intake date minus 8 weeks' },
  { label: 'Receive I-20 from new school', detail: null },
  { label: 'Request SEVIS release from current DSO', detail: 'Deadline: intake date minus 6 weeks' },
  { label: 'Complete SEVIS transfer to new school', detail: 'Deadline: intake date minus 4 weeks' },
  { label: 'Begin program — CPT authorization starts Day 1', detail: null },
]

// ─── Component ──────────────────────────────────────────────────────────────

interface PlanCContentProps {
  employmentActive: boolean
}

export function PlanCContent({ employmentActive }: PlanCContentProps) {
  const [breakGlass, setBreakGlass] = useState(false)
  const [checkedSteps, setCheckedSteps] = useState<boolean[]>(
    new Array(SEVIS_STEPS.length).fill(false),
  )

  const toggleStep = (index: number) => {
    setCheckedSteps(prev => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  return (
    <div className="space-y-8">
      {/* A. Attorney Consultation Warning */}
      <div
        role="alert"
        className="rounded-xl border border-amber-warm/30 bg-amber-warm/5 px-4 py-3"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-warm" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-amber-warm">
              Consult an immigration attorney before making any decisions about CPT enrollment.
            </p>
            <p className="mt-1 text-xs text-amber-warm/80">
              SEVIS transfer terminates your active OPT. This action is irreversible.
            </p>
          </div>
        </div>
      </div>

      {/* B. School Comparison */}
      <section aria-labelledby="school-comparison-heading">
        <h2 id="school-comparison-heading" className="text-base font-medium text-foreground mb-3">
          School comparison
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          13 Day 1 CPT programs ranked by proximity to Boston. Verify details directly with each school before applying.
        </p>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-sm" data-testid="school-table">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">School</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Distance</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Program</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Accreditation</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">On-site</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Tuition</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {SCHOOLS.map((school, i) => (
                <tr
                  key={school.name}
                  className={`border-b border-border/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                  data-testid={`school-row-${i}`}
                >
                  <td className="px-3 py-2.5 font-medium text-foreground">
                    <div className="flex items-center gap-1.5">
                      {school.name}
                      {school.verified ? (
                        <CheckCircle2 className="size-3.5 text-jade" role="img" aria-label="Verified" />
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-amber-warm/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-warm">
                          unverified
                        </span>
                      )}
                    </div>
                    {school.note && (
                      <p className="mt-0.5 text-[11px] text-amber-warm/80">{school.note}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3 text-muted-foreground/50" aria-hidden="true" />
                      {school.distance}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{school.program}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{school.accreditation}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{school.onSite}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{school.tuition}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground/60">Not started</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-3" data-testid="school-cards">
          {SCHOOLS.map((school, i) => (
            <div
              key={school.name}
              className="rounded-xl border border-border/60 bg-card p-4"
              data-testid={`school-card-${i}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-medium text-foreground">{school.name}</h3>
                    {school.verified ? (
                      <CheckCircle2 className="size-3.5 text-jade" aria-label="Verified" />
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-amber-warm/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-warm">
                        unverified
                      </span>
                    )}
                  </div>
                  {school.note && (
                    <p className="mt-0.5 text-[11px] text-amber-warm/80">{school.note}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground/60">Not started</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3 text-muted-foreground/50" />
                  {school.distance}
                </span>
                <span>{school.program}</span>
                <span>{school.accreditation}</span>
                <span>{school.onSite}</span>
                <span className="col-span-2">{school.tuition}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* C. Risk Framework */}
      <section aria-labelledby="risk-framework-heading">
        <h2 id="risk-framework-heading" className="text-base font-medium text-foreground mb-3">
          Risk framework
        </h2>
        <div className="space-y-3" data-testid="risk-tiers">
          {RISK_TIERS.map(tier => (
            <div
              key={tier.label}
              className={`rounded-xl border px-4 py-3 ${
                tier.tone === 'lower'
                  ? 'border-jade/20 bg-jade/5'
                  : tier.tone === 'moderate'
                    ? 'border-border/60 bg-card'
                    : 'border-amber-warm/20 bg-amber-warm/5'
              }`}
              data-testid={`risk-tier-${tier.tone}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Shield
                  aria-hidden="true"
                  className={`size-4 ${
                    tier.tone === 'lower'
                      ? 'text-jade'
                      : tier.tone === 'moderate'
                        ? 'text-muted-foreground'
                        : 'text-amber-warm'
                  }`}
                />
                <h3 className={`text-sm font-medium ${
                  tier.tone === 'lower'
                    ? 'text-jade'
                    : tier.tone === 'moderate'
                      ? 'text-foreground'
                      : 'text-amber-warm'
                }`}>
                  {tier.label}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{tier.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {tier.schools.map(name => (
                  <span
                    key={name}
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ${
                      tier.tone === 'lower'
                        ? 'bg-jade/10 text-jade'
                        : tier.tone === 'moderate'
                          ? 'bg-muted/50 text-muted-foreground'
                          : 'bg-amber-warm/10 text-amber-warm'
                    }`}
                  >
                    {name}
                  </span>
                ))}
              </div>
              {tier.tone === 'higher' && (
                <p className="mt-2 text-[11px] text-amber-warm/70">
                  These programs have reported increased USCIS scrutiny. Proceed with extra caution and attorney guidance.
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* E. Bridge Job Collision Warning (before SEVIS section) */}
      {employmentActive && (
        <div
          role="alert"
          className="rounded-xl border border-amber-warm/30 bg-amber-warm/5 px-4 py-3"
          data-testid="bridge-collision-warning"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-warm" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-amber-warm">
                You currently have an active bridge role.
              </p>
              <p className="mt-1 text-xs text-amber-warm/80">
                Initiating a SEVIS transfer will terminate your OPT and your current employment authorization.
                Talk to your immigration attorney before proceeding.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* D. SEVIS Transfer Checklist */}
      <section aria-labelledby="sevis-checklist-heading">
        {!breakGlass ? (
          <div
            className="rounded-xl border border-border/60 bg-muted/20 px-4 py-5"
            data-testid="sevis-locked"
          >
            <div className="flex items-center gap-2 mb-2">
              <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
              <h2 id="sevis-checklist-heading" className="text-base font-medium text-foreground">
                SEVIS Transfer Checklist
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Unlocking this section indicates you&apos;re seriously considering CPT enrollment.
            </p>
            <button
              type="button"
              onClick={() => setBreakGlass(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-warm/30 bg-amber-warm/5 px-3 py-2 text-sm font-medium text-amber-warm hover:bg-amber-warm/10 transition-colors"
              data-testid="break-glass-button"
            >
              <GraduationCap className="size-4" aria-hidden="true" />
              Break Glass: Show Steps
            </button>
          </div>
        ) : (
          <div
            className="rounded-xl border border-border/60 bg-card px-4 py-5"
            data-testid="sevis-unlocked"
          >
            <div className="flex items-center gap-2 mb-4">
              <Unlock className="size-4 text-foreground" aria-hidden="true" />
              <h2 id="sevis-checklist-heading" className="text-base font-medium text-foreground">
                SEVIS Transfer Checklist
              </h2>
            </div>
            <ol className="space-y-3">
              {SEVIS_STEPS.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={checkedSteps[i]}
                      onChange={() => toggleStep(i)}
                      className="mt-0.5 size-4 rounded border-border accent-jade cursor-pointer"
                      aria-label={`Step ${i + 1}: ${step.label}`}
                    />
                    <div>
                      <span className={`text-sm ${checkedSteps[i] ? 'line-through text-muted-foreground/60' : 'text-foreground'}`}>
                        {i + 1}. {step.label}
                      </span>
                      {step.detail && (
                        <p className="text-xs text-muted-foreground/60 mt-0.5">{step.detail}</p>
                      )}
                    </div>
                  </label>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[11px] text-muted-foreground/60">
              Checkboxes are for your planning only and are not saved between visits.
            </p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground/60">
          This is not immigration legal advice. School data is from public sources and may be outdated.
          Always verify with the school&apos;s international student office and your immigration attorney.
        </p>
      </footer>
    </div>
  )
}
