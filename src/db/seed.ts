/**
 * Seed Data — Phase 0 static data from the target employer list.
 * No API calls. All jobs manually verified from skye-target-employers.md.
 *
 * Usage: import { seedJobs, seedProfile, seedPlans, seedContacts } from '@/db/seed'
 */

import type {
  VisaPath,
  EmployerType,
  CapExemptConfidence,
  EmploymentType,
  SourceType,
} from '@/lib/urgency-scoring'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SeedJob {
  title: string
  company: string
  company_domain: string | null
  location: string
  url: string | null
  visa_path: VisaPath
  employer_type: EmployerType
  cap_exempt_confidence: CapExemptConfidence
  employment_type: EmploymentType
  source_type: SourceType
  application_deadline: string | null // ISO date
  deadline_source: string | null
  application_complexity: string | null
  h1b_sponsor_count: number | null
  salary: string | null
  remote_status: string | null
  skills_required: string[]
  why_fits: string
  raw_description?: string | null
  /** If true, this job is ineligible for international candidates — excluded from scoring and display. */
  requires_citizenship?: boolean
  requires_security_clearance?: boolean
  /** If true, Skye has already applied (pre-populate Application record) */
  pre_applied?: boolean
  pre_applied_date?: string
}

export interface SeedProfile {
  skills: string[]
  preferences: Record<string, number>
  profile: {
    name: string
    field: string
    degree: string
    institution: string
    graduation_status: string
  }
}

export interface SeedImmigrationStatus {
  visa_type: string
  opt_expiry: string // ISO date
  employment_active: boolean
  initial_days_used: number
  initial_days_source: 'dso_confirmed' | 'user_reported'
  calibration_date: string // ISO date
  postdoc_end_date: string // ISO date
  niw_status: string
  niw_filing_date: string | null
  i140_status: 'not_filed' | 'filed' | 'approved' | 'denied'
  i485_status: 'not_filed' | 'filed' | 'approved' | 'denied'
}

export interface SeedContact {
  name: string
  affiliation: string
  relationship_type: string
  notes: string
}

export interface SeedPlan {
  id: 'plan_a' | 'plan_b' | 'plan_c' | 'plan_d' | 'niw'
  status: 'not_started' | 'active' | 'completed' | 'cancelled'
  next_action: string | null
  notes: string | null
}

// ─── Skye's Profile ──────────────────────────────────────────────────────────

export const seedProfile: SeedProfile = {
  skills: [
    'Python', 'MATLAB', 'R', 'Google Earth Engine', 'ArcGIS',
    'Machine Learning', 'SeaDAS', 'MODIS', 'VIIRS', 'PACE',
    'Satellite Remote Sensing', 'Ocean Color', 'Biogeochemistry',
    'Coastal Ecosystems', 'Data Visualization', 'Statistical Analysis',
    'GIS', 'NetCDF', 'HDF5', 'Geospatial Analysis',
  ],
  preferences: {
    cap_exempt: 0.9,
    boston_metro: 0.7,
    ocean_env_science: 0.8,
    remote_friendly: 0.6,
    academic: 0.7,
    government_research: 0.6,
  },
  profile: {
    name: 'Skye',
    field: 'Environmental Science / Ocean Color Remote Sensing',
    degree: 'PhD',
    institution: 'UMass Boston',
    graduation_status: 'PostDoc (ending April 11, 2026)',
  },
}

export const seedImmigrationStatus: SeedImmigrationStatus = {
  visa_type: 'F-1 STEM OPT',
  opt_expiry: '2026-08-15',
  employment_active: true, // still in PostDoc until April 11
  initial_days_used: 31,
  initial_days_source: 'user_reported',
  calibration_date: '2026-03-24',
  postdoc_end_date: '2026-04-11',
  niw_status: 'filed',
  niw_filing_date: '2025-11-15',
  i140_status: 'filed',
  i485_status: 'not_filed',
}

// ─── Plans ───────────────────────────────────────────────────────────────────

export const seedPlans: SeedPlan[] = [
  {
    id: 'plan_a',
    status: 'active',
    next_action: 'Apply to cap-exempt positions from target employer list',
    notes: 'Cap-Exempt H1-B + O-1A: universities, nonprofits, gov contractors can sponsor year-round',
  },
  {
    id: 'plan_b',
    status: 'not_started',
    next_action: 'Identify part-time bridge opportunities after PostDoc ends',
    notes: 'Bridge: 20+ hrs/week at cap-exempt employer stops unemployment clock',
  },
  {
    id: 'plan_c',
    status: 'not_started',
    next_action: 'Research Day 1 CPT MBA programs',
    notes: 'Day 1 CPT resets F-1 status, enables work via CPT for any employer',
  },
  {
    id: 'plan_d',
    status: 'not_started',
    next_action: 'Calculate CRS score for Express Entry',
    notes: 'Canada Express Entry: highly viable with PhD + STEM, no OPT pressure',
  },
  {
    id: 'niw',
    status: 'active',
    next_action: 'Wait for I-140 receipt/approval',
    notes: 'EB-2 NIW self-petitioned, filed Nov 2025. China backlog 3-7+ years.',
  },
]

// ─── Network Contacts ────────────────────────────────────────────────────────

export const seedContacts: SeedContact[] = [
  {
    name: 'Jianwei Wei',
    affiliation: 'GST / NOAA (College Park, MD)',
    relationship_type: 'co-author',
    notes: 'Remote sensing scientist at GST. Warm lead for contractor positions at NOAA.',
  },
  {
    name: 'Chris Justice',
    affiliation: 'University of Maryland',
    relationship_type: 'co-author',
    notes: 'Strong RS program at UMD. MODIS/VIIRS expertise. Can refer to UMD positions.',
  },
  {
    name: 'Miguel O. Roman',
    affiliation: 'NASA Goddard',
    relationship_type: 'co-author',
    notes: 'MODIS/VIIRS paper co-author. Can connect to Zintellect/ORISE postdocs.',
  },
  {
    name: 'Michael Ondrusek',
    affiliation: 'NOAA',
    relationship_type: 'co-author',
    notes: 'NOAA ocean color scientist. Can inform about contractor openings.',
  },
  {
    name: 'Ian Paynter',
    affiliation: 'NASA Goddard',
    relationship_type: 'co-author',
    notes: 'NASA ecosystem contact. Contractor network awareness.',
  },
  {
    name: 'Robert Wolfe',
    affiliation: 'NASA Goddard',
    relationship_type: 'co-author',
    notes: 'Senior NASA contact with wide network. MODIS team.',
  },
  {
    name: 'Zhongping Lee',
    affiliation: 'UMass Boston',
    relationship_type: 'former advisor',
    notes: 'PhD advisor — ocean color remote sensing pioneer (QAA, HOPE algorithms). Strong reference and collaborator.',
  },
  {
    name: 'Crystal Schaaf',
    affiliation: 'UMass Boston — SpectralMass Lab',
    relationship_type: 'advisor',
    notes: 'Current postdoc supervisor. MODIS/VIIRS albedo and vegetation monitoring. Potential bridge role through SpectralMass lab.',
  },
]

// ─── Jobs (30+) from Target Employer List ────────────────────────────────────

export const seedJobs: SeedJob[] = [
  // ── TIER 1A: Cap-Exempt Full-Time ──────────────────────────────────────

  // Boston-Area Universities
  {
    title: 'Postdoctoral Research Fellow — SIF + Carbon Cycling',
    company: 'Boston University — Hutyra Lab',
    company_domain: 'bu.edu',
    location: 'Boston, MA',
    url: 'https://sites.bu.edu/hutyra/post-doctoral-research-fellow-positions/',
    visa_path: 'cap_exempt',
    employer_type: 'university',
    cap_exempt_confidence: 'confirmed',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Remote Sensing', 'Python', 'Satellite Data'],
    why_fits: 'Direct fit: remote sensing, Python, satellite data. Boston location.',
    raw_description: 'The Hutyra Lab in the Department of Earth & Environment at Boston University seeks a Postdoctoral Research Fellow to work on solar-induced fluorescence (SIF) remote sensing and carbon cycling in urban ecosystems. The position involves satellite data analysis (MODIS, VIIRS, PACE), field validation campaigns, and integration of remote sensing products with ecosystem models. Requirements: PhD in environmental science, remote sensing, or related field; experience with Python/R for satellite data processing; familiarity with radiative transfer modeling; strong publication record. The lab studies urban biogeochemistry and land-atmosphere interactions using a combination of eddy covariance towers, satellite remote sensing, and ecosystem modeling. Position is for 2 years with possibility of extension.',
  },
  {
    title: 'Postdoctoral Research Fellow — Urban Climate Modeling',
    company: 'Boston University — Hutyra Lab',
    company_domain: 'bu.edu',
    location: 'Boston, MA',
    url: 'https://sites.bu.edu/hutyra/post-doctoral-research-fellow-positions/',
    visa_path: 'cap_exempt',
    employer_type: 'university',
    cap_exempt_confidence: 'confirmed',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Remote Sensing', 'Modeling', 'Urban Environment'],
    why_fits: 'Adjacent: remote sensing, modeling, urban environment. Same lab as SIF postdoc.',
  },
  {
    title: 'Postdoctoral Research Scholar — Land Value + Hurricane Damage Risk',
    company: 'Boston University — PLACES Lab',
    company_domain: 'bu.edu',
    location: 'Boston, MA',
    url: null,
    visa_path: 'cap_exempt',
    employer_type: 'university',
    cap_exempt_confidence: 'confirmed',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Geospatial Analysis', 'Machine Learning', 'Python'],
    why_fits: 'Adjacent: geospatial analysis, ML, Python. NSF-funded. Boston.',
  },
  {
    title: 'Postdoc — Global Land Surface Remote Sensing',
    company: 'Brown University — IBES',
    company_domain: 'brown.edu',
    location: 'Providence, RI',
    url: 'https://www.ihirechemists.com/jobs/view/512094518',
    visa_path: 'cap_exempt',
    employer_type: 'university',
    cap_exempt_confidence: 'confirmed',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Remote Sensing', 'Landsat', 'GEDI', 'Satellite Data'],
    why_fits: 'Direct fit: remote sensing, Landsat, satellite data. NASA-funded.',
    raw_description: 'The Institute at Brown for Environment and Society (IBES) seeks a Postdoctoral Research Fellow for a NASA-funded project studying global land surface dynamics using multi-sensor satellite remote sensing. The fellow will analyze vegetation structure and biomass using Landsat, GEDI lidar, and ICESat-2 data; develop novel algorithms for land cover change detection; and contribute to regional carbon budgets. Requirements: PhD in remote sensing, geography, or environmental science; strong programming skills (Python, R, or MATLAB); experience with satellite imagery processing (Google Earth Engine preferred); peer-reviewed publications. The position offers competitive salary and benefits through Brown University.',
    pre_applied: true,
    pre_applied_date: '2026-03-24',
  },

  // Nonprofit Research Organizations
  {
    title: 'Temporary Research Assistant — Geospatial Data Scientist',
    company: 'Woodwell Climate Research Center',
    company_domain: 'woodwellclimate.org',
    location: 'Falmouth, MA',
    url: 'https://www.woodwellclimate.org/careers/',
    visa_path: 'cap_exempt',
    employer_type: 'nonprofit_research',
    cap_exempt_confidence: 'confirmed',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Geospatial', 'Python', 'Climate Data', 'Data Science'],
    why_fits: 'Strong fit: geospatial + climate + data science + Python. 3-month Arctic project.',
    raw_description: 'Woodwell Climate Research Center seeks a Temporary Research Assistant / Geospatial Data Scientist for a 3-month project focused on Arctic permafrost mapping. Responsibilities include processing satellite imagery (Landsat, Sentinel-2) to detect permafrost thaw features; developing geospatial analysis pipelines in Python (GeoPandas, Rasterio, xarray); creating visualizations for scientific publications; and supporting field campaign data integration. Requirements: MS or PhD in geospatial science, environmental science, or related field; proficiency in Python for geospatial analysis; experience with cloud computing platforms (GEE, AWS); ability to work independently. Woodwell is a 501(c)(3) nonprofit research institution focused on understanding climate change through science.',
    pre_applied: true,
    pre_applied_date: '2026-03-23',
  },
  {
    title: 'Project Coordinator — EVOME',
    company: 'Woodwell Climate Research Center',
    company_domain: 'woodwellclimate.org',
    location: 'Falmouth, MA',
    url: 'https://www.woodwellclimate.org/careers/',
    visa_path: 'cap_exempt',
    employer_type: 'nonprofit_research',
    cap_exempt_confidence: 'confirmed',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Project Coordination', 'Research Support'],
    why_fits: 'Same organization. Coordination role at climate nonprofit.',
  },
  {
    title: 'Assistant Lab Research Scientist',
    company: 'New England Aquarium',
    company_domain: 'neaq.org',
    location: 'Boston, MA',
    url: 'https://www.neaq.org/engage/join-our-team/',
    visa_path: 'cap_exempt',
    employer_type: 'nonprofit_research',
    cap_exempt_confidence: 'confirmed',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Marine Science', 'Lab Research'],
    why_fits: 'Marine science, coastal ecosystems. Boston location. Posted March 18.',
  },

  // Government-Affiliated (Cap-Exempt via contractors/cooperative institutes)
  {
    title: 'Ocean Color Remote Sensing Specialist',
    company: 'IBSS (NOAA/NEFSC contractor)',
    company_domain: 'ibsscorp.com',
    location: 'Woods Hole, MA',
    url: 'https://www.geoaquawatch.org/ocean-color-remote-sensing-specialist-job-usa/',
    visa_path: 'cap_exempt',
    employer_type: 'government_contractor',
    cap_exempt_confidence: 'likely',
    employment_type: 'full_time',
    source_type: 'until_filled',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Ocean Color', 'PACE', 'Algorithm Development', 'Remote Sensing'],
    why_fits: 'PERFECT fit: ocean color, PACE mission, algorithm development. Her exact research area.',
  },
  {
    title: 'Earth System AI Scientist',
    company: 'CIRES — CU Boulder',
    company_domain: 'colorado.edu',
    location: 'Boulder, CO',
    url: 'https://jobs.colorado.edu/jobs/JobDetail/70475',
    visa_path: 'cap_exempt',
    employer_type: 'cooperative_institute',
    cap_exempt_confidence: 'confirmed',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: '2026-03-24',
    deadline_source: 'posting',
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Machine Learning', 'Earth Science', 'Python'],
    why_fits: 'ML + earth science + NOAA affiliation. Cooperative institute = cap-exempt.',
    raw_description: 'CIRES (Cooperative Institute for Research in Environmental Sciences) at the University of Colorado Boulder, in partnership with NOAA, is seeking an Earth System AI Scientist. The role involves applying machine learning and deep learning techniques to Earth system data (satellite observations, reanalysis products, climate model outputs); developing AI-powered tools for weather prediction, ocean monitoring, and environmental forecasting; and publishing research in peer-reviewed journals. Requirements: PhD in atmospheric science, computer science, or related field; demonstrated experience applying ML/DL to geophysical data; proficiency in Python (PyTorch/TensorFlow, xarray, NumPy); track record of publications. CIRES is a NOAA cooperative institute and a cap-exempt H1-B employer.',
    pre_applied: true,
    pre_applied_date: '2026-03-24',
  },

  // Beyond Boston (Remote or Relocatable, Cap-Exempt)
  {
    title: 'Assistant Project Scientist — Climate Hazard Center',
    company: 'UCSB — Climate Hazard Center',
    company_domain: 'ucsb.edu',
    location: 'Santa Barbara, CA',
    url: 'https://recruit.ap.ucsb.edu/JPF03066',
    visa_path: 'cap_exempt',
    employer_type: 'university',
    cap_exempt_confidence: 'confirmed',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: '2026-07-01',
    deadline_source: 'posting',
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Climate Data', 'Remote Sensing', 'Python', 'Crop Models'],
    why_fits: 'Climate + RS + data + Python. Long deadline allows careful application.',
  },
  {
    title: 'Postdoc — Remote Sensing + Ecosystem Science',
    company: 'UCSB — Photon Informed Ecology Lab',
    company_domain: 'ucsb.edu',
    location: 'Santa Barbara, CA',
    url: 'https://recruit.ap.ucsb.edu/JPF03063',
    visa_path: 'cap_exempt',
    employer_type: 'university',
    cap_exempt_confidence: 'confirmed',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: '2026-05-01',
    deadline_source: 'posting',
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Remote Sensing', 'Ecosystem Science', 'Carbon Fluxes'],
    why_fits: 'Direct fit: remote sensing + ecology, carbon/water fluxes. 2-year position.',
    raw_description: 'The Photon Informed Ecology Lab at UC Santa Barbara seeks a Postdoctoral Scholar in remote sensing and ecosystem science. The researcher will use optical and lidar remote sensing data from satellite (Landsat, GEDI, ECOSTRESS) and airborne (AVIRIS-NG) platforms to study carbon and water fluxes in terrestrial ecosystems. Key responsibilities include developing and validating remote sensing products for ecosystem function; analyzing multi-scale datasets from leaf to landscape; contributing to NASA-funded research on vegetation dynamics; and mentoring graduate students. Requirements: PhD in ecology, remote sensing, geography, or related field; experience with satellite data processing (Python, GEE); knowledge of radiative transfer modeling and vegetation indices; at least 2 first-author publications. 2-year appointment with possibility of renewal.',
    pre_applied: true,
    pre_applied_date: '2026-03-25',
  },
  {
    title: 'Remote Sensing Lab Specialist',
    company: 'NAU — Radiant Center for Remote Sensing',
    company_domain: 'nau.edu',
    location: 'Flagstaff, AZ',
    url: null,
    visa_path: 'cap_exempt',
    employer_type: 'university',
    cap_exempt_confidence: 'confirmed',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Remote Sensing'],
    why_fits: 'Direct remote sensing fit. Posted March 2026.',
  },
  {
    title: 'Senior AI Researcher — Remote Sensing',
    company: 'Johns Hopkins APL',
    company_domain: 'jhuapl.edu',
    location: 'Laurel, MD',
    url: null,
    visa_path: 'cap_exempt',
    employer_type: 'university',
    cap_exempt_confidence: 'likely',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Machine Learning', 'Remote Sensing'],
    why_fits: 'ML + remote sensing. APL is university-affiliated = cap-exempt.',
  },
  {
    title: 'Research Positions — Remote Sensing Program',
    company: 'University of Maryland',
    company_domain: 'umd.edu',
    location: 'College Park, MD',
    url: null,
    visa_path: 'cap_exempt',
    employer_type: 'university',
    cap_exempt_confidence: 'confirmed',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['MODIS', 'VIIRS', 'Remote Sensing'],
    why_fits: 'Strong RS program. Co-author Chris Justice works here. Warm lead.',
  },
  {
    title: 'Remote Sensing Scientist (NASA Goddard contractor)',
    company: 'SSAI — Science Systems and Applications',
    company_domain: 'ssaihq.com',
    location: 'Greenbelt, MD',
    url: null,
    visa_path: 'cap_exempt',
    employer_type: 'government_contractor',
    cap_exempt_confidence: 'likely',
    employment_type: 'full_time',
    source_type: 'until_filled',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Satellite Data', 'Algorithm Development', 'Remote Sensing'],
    why_fits: 'NASA contractor. Satellite data, algorithm development. Co-authors work here.',
  },
  {
    title: 'Remote Sensing Scientist (NOAA contractor)',
    company: 'GST — Global Science & Technology',
    company_domain: 'gst.com',
    location: 'College Park, MD',
    url: null,
    visa_path: 'cap_exempt',
    employer_type: 'government_contractor',
    cap_exempt_confidence: 'likely',
    employment_type: 'full_time',
    source_type: 'until_filled',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Ocean Color', 'VIIRS', 'Remote Sensing'],
    why_fits: 'Co-author Jianwei Wei works here. Ocean color, VIIRS. Warm lead.',
  },
  {
    title: 'NASA Postdoctoral Program — Ocean Color',
    company: 'Zintellect / ORISE',
    company_domain: 'zintellect.com',
    location: 'Greenbelt, MD',
    url: 'https://www.zintellect.com/',
    visa_path: 'cap_exempt',
    employer_type: 'government_contractor',
    cap_exempt_confidence: 'likely',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Ocean Color', 'Satellite Remote Sensing'],
    why_fits: 'Direct fit: her exact research area at NASA. Postdoc program.',
  },
  {
    title: 'Research Scientist — Satellite Remote Sensing',
    company: 'JCET — UMBC',
    company_domain: 'umbc.edu',
    location: 'Baltimore, MD',
    url: null,
    visa_path: 'cap_exempt',
    employer_type: 'cooperative_institute',
    cap_exempt_confidence: 'confirmed',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Satellite Remote Sensing', 'Ocean Color'],
    why_fits: 'Cooperative institute for NASA. Satellite RS, ocean color.',
  },
  {
    title: 'Research Positions — Environmental Monitoring',
    company: 'CIRA — Colorado State',
    company_domain: 'colostate.edu',
    location: 'Fort Collins, CO',
    url: null,
    visa_path: 'cap_exempt',
    employer_type: 'cooperative_institute',
    cap_exempt_confidence: 'confirmed',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Satellite Data', 'Environmental Monitoring'],
    why_fits: 'NOAA cooperative institute. Satellite data, environmental monitoring.',
  },

  // ── TIER 2: OPT-Compatible ─────────────────────────────────────────────

  {
    title: 'Environmental Scientist — GIS Analyst',
    company: 'ERM (Environmental Resources Management)',
    company_domain: 'erm.com',
    location: 'Boston, MA',
    url: null,
    visa_path: 'opt_compatible',
    employer_type: 'private_sector',
    cap_exempt_confidence: 'none',
    employment_type: 'full_time',
    source_type: 'industry',
    application_deadline: null,
    deadline_source: null,
    application_complexity: 'quick_apply',
    h1b_sponsor_count: 15,
    salary: null,
    remote_status: 'hybrid',
    skills_required: ['GIS', 'Environmental Science', 'Python'],
    why_fits: 'E-Verify employer. Stops unemployment clock. Boston. GIS fit.',
  },
  {
    title: 'Environmental Data Analyst',
    company: 'WSP',
    company_domain: 'wsp.com',
    location: 'Boston, MA',
    url: null,
    visa_path: 'opt_compatible',
    employer_type: 'private_sector',
    cap_exempt_confidence: 'none',
    employment_type: 'full_time',
    source_type: 'industry',
    application_deadline: null,
    deadline_source: null,
    application_complexity: 'quick_apply',
    h1b_sponsor_count: 30,
    salary: null,
    remote_status: 'hybrid',
    skills_required: ['Data Analysis', 'Environmental Science', 'Python'],
    why_fits: 'E-Verify, high H1-B filer (>25). Environmental consulting. Boston.',
  },
  {
    title: 'GIS Analyst',
    company: 'MA Department of Fish & Game',
    company_domain: 'mass.gov',
    location: 'Boston, MA',
    url: null,
    visa_path: 'opt_compatible',
    employer_type: 'government_direct',
    cap_exempt_confidence: 'none',
    employment_type: 'full_time',
    source_type: 'government',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['GIS', 'ArcGIS', 'Environmental Data'],
    why_fits: 'State government. OPT-compatible. GIS skills match. Boston.',
  },

  // ── TIER 3: Cap-Subject ────────────────────────────────────────────────

  {
    title: 'Remote Sensing Data Scientist',
    company: 'Planet Labs',
    company_domain: 'planet.com',
    location: 'San Francisco, CA',
    url: null,
    visa_path: 'cap_subject',
    employer_type: 'private_sector',
    cap_exempt_confidence: 'none',
    employment_type: 'full_time',
    source_type: 'industry',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: 40,
    salary: '$120K-$180K',
    remote_status: 'hybrid',
    skills_required: ['Remote Sensing', 'Python', 'Machine Learning', 'Satellite Data'],
    why_fits: 'Leader in satellite imagery. Strong H1-B sponsor history. Direct technical fit.',
  },
  {
    title: 'Satellite Imagery Analyst',
    company: 'Maxar Technologies',
    company_domain: 'maxar.com',
    location: 'Westminster, CO',
    url: null,
    visa_path: 'cap_subject',
    employer_type: 'private_sector',
    cap_exempt_confidence: 'none',
    employment_type: 'full_time',
    source_type: 'industry',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: 35,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Satellite Imagery', 'Remote Sensing', 'GIS'],
    why_fits: 'Major satellite company. Sponsors H1-B. Remote sensing fit.',
  },
  {
    title: 'Geospatial Data Scientist',
    company: 'Descartes Labs',
    company_domain: 'descarteslabs.com',
    location: 'Santa Fe, NM',
    url: null,
    visa_path: 'cap_subject',
    employer_type: 'private_sector',
    cap_exempt_confidence: 'none',
    employment_type: 'full_time',
    source_type: 'industry',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: 10,
    salary: null,
    remote_status: 'remote',
    skills_required: ['Geospatial', 'Machine Learning', 'Python', 'Satellite Data'],
    why_fits: 'Geospatial analytics + ML. Remote-friendly.',
  },
  {
    title: 'Remote Sensing Data Scientist',
    company: 'Muon Space',
    company_domain: 'muonspace.com',
    location: 'Mountain View, CA',
    url: null,
    visa_path: 'cap_subject',
    employer_type: 'private_sector',
    cap_exempt_confidence: 'none',
    employment_type: 'full_time',
    source_type: 'industry',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: 5,
    salary: null,
    remote_status: 'hybrid',
    skills_required: ['Remote Sensing', 'Satellites', 'Machine Learning'],
    why_fits: 'Satellites + ML. Actively hiring in RS space.',
  },
  {
    title: 'Product Engineer — Spatial Analytics',
    company: 'Esri',
    company_domain: 'esri.com',
    location: 'Redlands, CA',
    url: null,
    visa_path: 'cap_subject',
    employer_type: 'private_sector',
    cap_exempt_confidence: 'none',
    employment_type: 'full_time',
    source_type: 'industry',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: 50,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['GIS', 'Python', 'Spatial Analytics'],
    why_fits: 'GIS leader. Python integration. High H1-B filer. ArcGIS expertise match.',
  },

  // ── TIER 4: Canada ─────────────────────────────────────────────────────

  {
    title: 'Physical Scientist — Marine Data Scientist',
    company: 'DFO — Fisheries and Oceans Canada',
    company_domain: 'dfo-mpo.gc.ca',
    location: 'Halifax, NS, Canada',
    url: null,
    visa_path: 'canada',
    employer_type: 'government_direct',
    cap_exempt_confidence: 'none',
    employment_type: 'full_time',
    source_type: 'government',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Ocean Science', 'Remote Sensing', 'Data Science'],
    why_fits: 'Strong fit: ocean science + remote sensing. Canadian gov, Express Entry pathway.',
  },
  {
    title: 'Research Scientist — Remote Sensing',
    company: 'Environment and Climate Change Canada',
    company_domain: 'ec.gc.ca',
    location: 'Various, Canada',
    url: null,
    visa_path: 'canada',
    employer_type: 'government_direct',
    cap_exempt_confidence: 'none',
    employment_type: 'full_time',
    source_type: 'government',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Remote Sensing', 'Satellite Monitoring', 'Climate Data'],
    why_fits: 'Satellite monitoring, climate data. Canadian government research.',
  },
  {
    title: 'Earth Observation Data Scientist',
    company: 'C-CORE',
    company_domain: 'c-core.ca',
    location: "St. John's, NL, Canada",
    url: null,
    visa_path: 'canada',
    employer_type: 'nonprofit_research',
    cap_exempt_confidence: 'none',
    employment_type: 'full_time',
    source_type: 'industry',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Earth Observation', 'Satellite RS', 'Data Science'],
    why_fits: 'Direct fit: satellite RS + data science. Canadian.',
  },
  {
    title: 'Marine Optics and Acoustics Research Scientist',
    company: 'FORCE — Fundy Ocean Research Centre',
    company_domain: 'fundyforce.ca',
    location: 'Nova Scotia, Canada',
    url: null,
    visa_path: 'canada',
    employer_type: 'nonprofit_research',
    cap_exempt_confidence: 'none',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Marine Optics', 'Ocean Science'],
    why_fits: 'Optics background is a direct fit. Marine science.',
  },
  {
    title: 'Research Positions — Ocean Science / Remote Sensing',
    company: 'Dalhousie University',
    company_domain: 'dal.ca',
    location: 'Halifax, NS, Canada',
    url: null,
    visa_path: 'canada',
    employer_type: 'university',
    cap_exempt_confidence: 'none',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Ocean Science', 'Remote Sensing'],
    why_fits: 'Strong oceanography program. Canadian university.',
  },
  {
    title: 'Research Positions — Institute for Oceans and Fisheries',
    company: 'UBC — University of British Columbia',
    company_domain: 'ubc.ca',
    location: 'Vancouver, BC, Canada',
    url: null,
    visa_path: 'canada',
    employer_type: 'university',
    cap_exempt_confidence: 'none',
    employment_type: 'full_time',
    source_type: 'academic',
    application_deadline: null,
    deadline_source: null,
    application_complexity: null,
    h1b_sponsor_count: null,
    salary: null,
    remote_status: 'on_site',
    skills_required: ['Ocean Science', 'Fisheries', 'Remote Sensing'],
    why_fits: 'Ocean science, fisheries. Top Canadian university.',
  },
]

// ─── Validation Helpers ──────────────────────────────────────────────────────

export function validateSeedJobs(jobs: SeedJob[]): string[] {
  const errors: string[] = []
  for (const job of jobs) {
    if (!job.visa_path) errors.push(`${job.title}: missing visa_path`)
    if (!job.employer_type) errors.push(`${job.title}: missing employer_type`)
    if (!job.employment_type) errors.push(`${job.title}: missing employment_type`)
    if (!job.cap_exempt_confidence) errors.push(`${job.title}: missing cap_exempt_confidence`)
    if (!job.source_type) errors.push(`${job.title}: missing source_type`)
    if (job.application_deadline) {
      const d = new Date(job.application_deadline)
      if (isNaN(d.getTime())) errors.push(`${job.title}: invalid application_deadline`)
    }
  }
  return errors
}
