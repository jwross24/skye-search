import { z } from 'zod/v4'

// ─── User Profile (stored in users.profile jsonb) ───────────────────────────

export interface UserProfile {
  name?: string
  field?: string
  degree?: string
  institution?: string
  graduation_status?: string
  research_areas?: string[]
  publications?: ExtractedPublication[]
  education?: ExtractedEducation[]
  employment_history?: ExtractedEmployment[]
}

// ─── Extracted Data Types ───────────────────────────────────────────────────

export interface ExtractedEducation {
  degree: string
  field: string
  institution: string
  year: string | null
}

export interface ExtractedEmployment {
  title: string
  organization: string
  start_date: string | null
  end_date: string | null
  description: string | null
}

export interface ExtractedPublication {
  title: string
  authors: string
  venue: string | null
  year: string | null
}

export interface CvExtraction {
  name: string | null
  field: string | null
  skills: string[]
  research_areas: string[]
  publications: ExtractedPublication[]
  education: ExtractedEducation[]
  employment_history: ExtractedEmployment[]
}

// ─── Zod Schemas (validate Claude's unstructured output) ────────────────────

export const educationSchema = z.object({
  degree: z.string(),
  field: z.string(),
  institution: z.string(),
  year: z.string().nullable(),
})

export const employmentSchema = z.object({
  title: z.string(),
  organization: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  description: z.string().nullable(),
})

export const publicationSchema = z.object({
  title: z.string(),
  authors: z.string(),
  venue: z.string().nullable(),
  year: z.string().nullable(),
})

export const cvExtractionSchema = z.object({
  name: z.string().nullable(),
  field: z.string().nullable(),
  skills: z.array(z.string()),
  research_areas: z.array(z.string()),
  publications: z.array(publicationSchema),
  education: z.array(educationSchema),
  employment_history: z.array(employmentSchema),
})
