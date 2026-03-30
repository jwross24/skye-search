export const RELATIONSHIP_TYPES = [
  'co-author',
  'advisor',
  'conference contact',
  'referral',
  'O-1A recommender',
  'colleague',
  'recruiter',
  'other',
] as const

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number]

export interface Contact {
  id: string
  name: string
  affiliation: string | null
  relationshipType: string | null
  email: string | null
  phone: string | null
  notes: string | null
  lastContacted: string | null
  linkedJobIds: string[] | null
  createdAt: string
}
