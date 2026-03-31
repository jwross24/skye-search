import type {
  VisaPath,
  EmployerType,
  CapExemptConfidence,
  EmploymentType,
  SourceType,
} from '@/lib/urgency-scoring'

/** A job from the Supabase jobs table, with required display fields guaranteed non-null. */
export interface Job {
  id: string
  title: string
  company: string
  company_domain: string | null
  location: string
  url: string | null
  visa_path: VisaPath
  employer_type: EmployerType
  cap_exempt_confidence: CapExemptConfidence
  employment_type: EmploymentType
  source_type: SourceType | null
  application_deadline: string | null
  deadline_source: string | null
  application_complexity: string | null
  h1b_sponsor_count: number | null
  salary: string | null
  remote_status: string | null
  skills_required: string[]
  why_fits: string
  indexed_date: string | null
  requires_citizenship: boolean
  requires_security_clearance: boolean
}
