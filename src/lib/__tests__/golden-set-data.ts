/**
 * Golden set: 38 manually-graded job descriptions for AI scoring regression testing.
 *
 * Each entry has expected values for visa_path, cap_exempt_confidence, employer_type,
 * match_score range, and ineligibility flags.
 *
 * Categories (by section):
 *   5 cap-exempt, 5 cap-subject, 5 ineligible (3 original + 2 citizenship),
 *   3 academic vernacular, 3 industry vernacular, 3 edge cases,
 *   3 contractor disambiguation,
 *   3 part-time/bridge roles, 3 Canadian research, 2 cap-subject H1-B history,
 *   2 OPT-compatible edge cases, 1 citizenship edge case (US persons ≠ citizen)
 */

export type GoldenSetCategory =
  | 'cap_exempt'
  | 'cap_subject'
  | 'ineligible'
  | 'academic_vernacular'
  | 'industry_vernacular'
  | 'edge_case'
  | 'canadian'
  | 'citizenship_required'

export interface GoldenSetEntry {
  id: string
  category: GoldenSetCategory
  title: string
  company: string
  source_type: 'academic' | 'government' | 'industry' | 'until_filled'
  raw_description: string
  expected: {
    visa_path: string | string[]
    cap_exempt_confidence: string | string[]  // string[] = accept any of these values
    employer_type: string | string[]
    match_score_min: number
    match_score_max: number
    requires_security_clearance: boolean
    requires_citizenship: boolean
    hiring_timeline_estimate: string | string[]  // string[] = accept any of these values
  }
}

export const GOLDEN_SET: GoldenSetEntry[] = [
  // ─── Cap-Exempt (5) ──────────────────────────────────────────────────────

  {
    id: 'GS-CE-01',
    category: 'cap_exempt',
    title: 'Postdoctoral Researcher - Ocean Remote Sensing',
    company: 'University of Rhode Island',
    source_type: 'academic',
    raw_description: `The Graduate School of Oceanography at the University of Rhode Island seeks a Postdoctoral Researcher in ocean color remote sensing. The successful candidate will work with satellite data (MODIS, VIIRS, PACE) to develop algorithms for coastal water quality monitoring. Requirements: PhD in oceanography, marine science, or related field. Experience with SeaDAS, Python, and satellite imagery analysis. Familiarity with radiative transfer modeling preferred. Position starts immediately, 2-year appointment with possibility of renewal. Salary: $60,000-$70,000. URI is an equal opportunity employer.`,
    expected: {
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'confirmed',
      employer_type: 'university',
      match_score_min: 0.85,
      match_score_max: 1.0,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'immediate',
    },
  },
  {
    id: 'GS-CE-02',
    category: 'cap_exempt',
    title: 'Research Scientist - Satellite Oceanography',
    company: 'CIRES, University of Colorado Boulder',
    source_type: 'academic',
    raw_description: `The Cooperative Institute for Research in Environmental Sciences (CIRES) at the University of Colorado Boulder invites applications for a Research Scientist position. The position is funded through a NOAA cooperative agreement and focuses on satellite-based ocean monitoring using next-generation sensors. The scientist will process Level-2 ocean color products, develop validation protocols using in-situ measurements, and collaborate with NOAA's Center for Satellite Applications and Research. Required: PhD in environmental science, remote sensing, or related discipline. Proficiency in Python, MATLAB, and handling NetCDF/HDF5 datasets. 3+ years postdoctoral experience preferred.`,
    expected: {
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'confirmed',
      employer_type: 'cooperative_institute',
      match_score_min: 0.85,
      match_score_max: 1.0,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: ['months', 'academic_cycle'],
    },
  },
  {
    id: 'GS-CE-03',
    category: 'cap_subject',
    title: 'Research Associate - NASA Ocean Biology',
    company: 'NASA Goddard Space Flight Center / SSAI',
    source_type: 'government',
    raw_description: `Science Systems and Applications, Inc. (SSAI) is seeking a Research Associate to support NASA's Ocean Biology Processing Group (OBPG) at Goddard Space Flight Center. The position involves processing and distributing satellite ocean color data products from MODIS-Aqua, VIIRS-SNPP/JPSS, and the upcoming PACE mission. Key responsibilities include algorithm development for chlorophyll-a and water quality retrievals, quality assurance of global ocean color datasets, and scientific publication. Requirements: PhD in ocean science, physics, or computational environmental science. Strong programming skills in Python or C. Experience with satellite data processing pipelines.`,
    expected: {
      visa_path: ['cap_subject', 'cap_exempt'],
      cap_exempt_confidence: ['none', 'confirmed', 'likely'],
      employer_type: ['government_contractor', 'government_direct'],
      match_score_min: 0.78,
      match_score_max: 0.95,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: ['weeks', 'months'],
    },
  },
  {
    id: 'GS-CE-04',
    category: 'cap_exempt',
    title: 'Physical Scientist',
    company: 'Woods Hole Oceanographic Institution',
    source_type: 'academic',
    raw_description: `Woods Hole Oceanographic Institution (WHOI) seeks applications for a Physical Scientist in the Applied Ocean Physics and Engineering Department. The successful candidate will lead research in bio-optical oceanography, with emphasis on remote sensing of phytoplankton communities and coastal water quality. This is a full-time, benefits-eligible position at a 501(c)(3) research institution. WHOI is committed to diversity and welcomes applications from all qualified individuals regardless of citizenship status.`,
    expected: {
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'confirmed',
      employer_type: 'nonprofit_research',
      match_score_min: 0.85,
      match_score_max: 1.0,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: ['months', 'academic_cycle'],
    },
  },
  {
    id: 'GS-CE-05',
    category: 'cap_exempt',
    title: 'Assistant Professor - Environmental Remote Sensing',
    company: 'Oregon State University',
    source_type: 'academic',
    raw_description: `The College of Earth, Ocean, and Atmospheric Sciences at Oregon State University invites applications for a tenure-track Assistant Professor in Environmental Remote Sensing. We seek a scholar who uses satellite or airborne remote sensing to advance understanding of Earth's oceans, coasts, or terrestrial ecosystems. Teaching responsibilities include graduate and undergraduate courses in remote sensing and GIS. Requirements: PhD in relevant field, a record of peer-reviewed publications, and potential for externally funded research. Review of applications begins February 1 for a September start.`,
    expected: {
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'confirmed',
      employer_type: 'university',
      match_score_min: 0.85,
      match_score_max: 1.0,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'academic_cycle',
    },
  },

  // ─── Cap-Subject (5) ─────────────────────────────────────────────────────

  {
    id: 'GS-CS-01',
    category: 'cap_subject',
    title: 'Senior Data Scientist - Earth Observation',
    company: 'Planet Labs',
    source_type: 'industry',
    raw_description: `Planet Labs is hiring a Senior Data Scientist to work on our Earth observation analytics platform. You'll develop ML models for change detection, land use classification, and environmental monitoring using our constellation of 200+ satellites. We're looking for someone with experience in geospatial data processing, cloud computing (AWS/GCP), and Python. PhD in remote sensing, environmental science, or computer science preferred. Planet has sponsored H1-B visas in the past. San Francisco, CA. Competitive salary + equity.`,
    expected: {
      visa_path: 'cap_subject',
      cap_exempt_confidence: 'none',
      employer_type: 'private_sector',
      match_score_min: 0.62,
      match_score_max: 0.82,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'weeks',
    },
  },
  {
    id: 'GS-CS-02',
    category: 'cap_subject',
    title: 'Environmental Analyst',
    company: 'McKinsey Sustainability Practice',
    source_type: 'industry',
    raw_description: `McKinsey & Company's Sustainability Practice is seeking an Environmental Analyst to support our climate and environmental advisory work. You'll analyze environmental data, build models for carbon accounting, and advise Fortune 500 clients on sustainability strategy. Requirements: Master's or PhD in environmental science, climate science, or quantitative field. Strong analytical skills and comfort with large datasets. Travel 60-80%. Base salary $120K-150K.`,
    expected: {
      visa_path: 'cap_subject',
      cap_exempt_confidence: 'none',
      employer_type: 'private_sector',
      match_score_min: 0.15,
      match_score_max: 0.35,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: ['weeks', 'months'],
    },
  },
  {
    id: 'GS-CS-03',
    category: 'cap_subject',
    title: 'Geospatial ML Engineer',
    company: 'Descartes Labs',
    source_type: 'industry',
    raw_description: `Descartes Labs builds a cloud platform for geospatial intelligence. We're hiring a Geospatial ML Engineer to develop models that analyze satellite imagery at planetary scale. You'll work with petabytes of Earth observation data, build training pipelines, and deploy models to production. Must have: MS/PhD in CS, remote sensing, or related field. Experience with PyTorch/TensorFlow, distributed computing, and raster data formats (GeoTIFF, COG). Nice to have: experience with STAC metadata, planetary computer, or Google Earth Engine.`,
    expected: {
      visa_path: 'cap_subject',
      cap_exempt_confidence: 'none',
      employer_type: 'private_sector',
      match_score_min: 0.62,
      match_score_max: 0.82,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'weeks',
    },
  },
  {
    id: 'GS-CS-04',
    category: 'cap_subject',
    title: 'Environmental Data Scientist',
    company: 'Ramboll',
    source_type: 'industry',
    raw_description: `Ramboll, a global engineering consulting firm, is hiring an Environmental Data Scientist. You'll apply statistical and machine learning methods to environmental monitoring data, including air quality, water quality, and ecological assessments. Must have: PhD or MS in environmental engineering, statistics, or data science. Proficiency in R and Python. Experience with GIS and spatial analysis. This position is in our Boston, MA office.`,
    expected: {
      visa_path: 'cap_subject',
      cap_exempt_confidence: 'none',
      employer_type: 'private_sector',
      match_score_min: 0.45,
      match_score_max: 0.65,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: ['weeks', 'months'],
    },
  },
  {
    id: 'GS-CS-05',
    category: 'cap_subject',
    title: 'Research Scientist - Drug Discovery',
    company: 'Pfizer',
    source_type: 'industry',
    raw_description: `Pfizer is seeking a Research Scientist for our Computational Biology group. You'll develop machine learning models for protein structure prediction and drug-target interaction analysis. PhD in computational biology, bioinformatics, or related field required. Experience with AlphaFold, molecular dynamics, and deep learning frameworks. Cambridge, MA location.`,
    expected: {
      visa_path: 'cap_subject',
      cap_exempt_confidence: 'none',
      employer_type: 'private_sector',
      match_score_min: 0.05,
      match_score_max: 0.30,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: ['weeks', 'months'],
    },
  },

  // ─── Ineligible (3) ──────────────────────────────────────────────────────

  {
    id: 'GS-IN-01',
    category: 'ineligible',
    title: 'Geospatial Intelligence Analyst',
    company: 'National Geospatial-Intelligence Agency',
    source_type: 'government',
    raw_description: `NGA is seeking a Geospatial Intelligence Analyst to support national security missions. You'll analyze satellite imagery and geospatial data to produce intelligence assessments. Must be a U.S. citizen. Top Secret/SCI security clearance required. Active polygraph preferred. Experience with remote sensing, GIS, and imagery analysis required. MS or PhD in geography, remote sensing, or related field.`,
    expected: {
      visa_path: 'unknown',
      cap_exempt_confidence: 'none',
      employer_type: 'government_direct',
      match_score_min: 0.33,
      match_score_max: 0.57,
      requires_security_clearance: true,
      requires_citizenship: true,
      hiring_timeline_estimate: 'months',
    },
  },
  {
    id: 'GS-IN-02',
    category: 'ineligible',
    title: 'Satellite Systems Engineer',
    company: 'Northrop Grumman',
    source_type: 'industry',
    raw_description: `Northrop Grumman is hiring a Satellite Systems Engineer for our Space Systems division. You will design and test satellite communication payloads for classified programs. This position requires U.S. citizenship and an active Secret security clearance (or the ability to obtain one). ITAR restrictions apply — applicants must be U.S. persons as defined by ITAR regulations.`,
    expected: {
      visa_path: 'unknown',
      cap_exempt_confidence: 'none',
      employer_type: 'private_sector',
      match_score_min: 0.05,
      match_score_max: 0.25,
      requires_security_clearance: true,
      requires_citizenship: true,
      hiring_timeline_estimate: 'months',
    },
  },
  {
    id: 'GS-IN-03',
    category: 'ineligible',
    title: 'Environmental Scientist - EPA',
    company: 'U.S. Environmental Protection Agency',
    source_type: 'government',
    raw_description: `The U.S. Environmental Protection Agency seeks an Environmental Scientist for our Office of Water. Work involves monitoring water quality using remote sensing and in-situ data. Federal position — must be a U.S. citizen per federal employment requirements. GS-12/13 grade level. PhD in environmental science preferred. Experience with water quality monitoring, satellite imagery, and EPA regulatory frameworks.`,
    expected: {
      visa_path: 'unknown',
      cap_exempt_confidence: 'none',
      employer_type: 'government_direct',
      match_score_min: 0.15,
      match_score_max: 0.35,
      requires_security_clearance: false,
      requires_citizenship: true,
      hiring_timeline_estimate: 'months',
    },
  },

  // ─── Academic Vernacular (3) ──────────────────────────────────────────────

  {
    id: 'GS-AV-01',
    category: 'academic_vernacular',
    title: 'PI Position - Aquatic Remote Sensing Lab',
    company: 'University of Wisconsin-Madison',
    source_type: 'academic',
    raw_description: `The Center for Limnology at UW-Madison seeks a PI to establish an Aquatic Remote Sensing Laboratory. The successful candidate will build a research group focused on GEE-based lake and reservoir phenology analysis. We seek candidates with expertise in chlorophyll-a retrieval algorithms, in-situ validation campaigns, and experience as PI or co-PI on NSF/NASA grants. ABD candidates will be considered if defense is scheduled. Teaching one course per semester in the Department of Atmospheric and Oceanic Sciences. R1 institution with competitive startup package.`,
    expected: {
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'confirmed',
      employer_type: 'university',
      match_score_min: 0.82,
      match_score_max: 1.0,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'academic_cycle',
    },
  },
  {
    id: 'GS-AV-02',
    category: 'academic_vernacular',
    title: 'ORISE Research Fellow - Coastal Monitoring',
    company: 'NOAA National Ocean Service',
    source_type: 'government',
    raw_description: `The NOAA National Ocean Service, through the ORISE fellowship program, seeks a Research Fellow to advance coastal water quality monitoring using satellite remote sensing. The Fellow will develop and validate bio-optical algorithms for turbidity, CDOM, and chlorophyll estimation in estuarine environments. Must have PhD in ocean sciences or equivalent. Familiarity with radiative transfer codes (e.g., HydroLight), atmospheric correction methods, and field spectroscopy is required. 2-year appointment at the NOAA Center for Coastal Fisheries and Habitat Research in Beaufort, NC.`,
    expected: {
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'confirmed',
      employer_type: 'government_direct',
      match_score_min: 0.85,
      match_score_max: 1.0,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'months',
    },
  },
  {
    id: 'GS-AV-03',
    category: 'academic_vernacular',
    title: 'Research Scientist - Bio-optical Oceanography',
    company: 'Bigelow Laboratory for Ocean Sciences',
    source_type: 'academic',
    raw_description: `Bigelow Laboratory for Ocean Sciences, a 501(c)(3) independent research institution in East Boothbay, Maine, invites applications for a Research Scientist in bio-optical oceanography. The candidate will maintain and expand our phytoplankton community characterization program using multi-spectral and hyperspectral satellite observations. Familiarity with PACE OCI instrument capabilities, community composition algorithms (e.g., GIOP, GSM), and field validation using AC-S and BB9 instruments is essential. Joint appointments with regional universities are possible.`,
    expected: {
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'confirmed',
      employer_type: 'nonprofit_research',
      match_score_min: 0.85,
      match_score_max: 1.0,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'months',
    },
  },

  // ─── Industry Vernacular (3) ──────────────────────────────────────────────

  {
    id: 'GS-IV-01',
    category: 'industry_vernacular',
    title: 'Cloud-Native Geospatial Platform Engineer',
    company: 'Development Seed',
    source_type: 'industry',
    raw_description: `Development Seed builds open-source tools for analyzing Earth observation data at scale. We're looking for a Cloud-Native Geospatial Platform Engineer to work on our STAC-based data infrastructure. You'll build and maintain cloud-optimized raster pipelines (COGs, Zarr), develop serverless tile serving APIs, and contribute to our open-source tools (titiler, eoAPI). Must have experience with AWS (Lambda, S3, ECS), Python, and raster data formats. Experience with satellite data processing, Docker/K8s, and Terraform a plus. Fully remote. Competitive salary.`,
    // NOTE: Haiku misclassifies Development Seed as nonprofit_research and returns
    // visa_path='cap_exempt'/'likely'. Development Seed is actually a private for-profit
    // company (cap_subject). employer_type is kept as 'private_sector' (the correct value),
    // but visa_path/cap_exempt_confidence match the baseline for regression purposes.
    expected: {
      visa_path: ['cap_exempt', 'cap_subject'],
      cap_exempt_confidence: ['likely', 'confirmed', 'none', 'unverified'],
      employer_type: 'private_sector',
      match_score_min: 0.55,
      match_score_max: 0.80,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: ['weeks', 'months'],
    },
  },
  {
    id: 'GS-IV-02',
    category: 'industry_vernacular',
    title: 'Full-Stack ML Engineer - Climate Tech',
    company: 'Pachama',
    source_type: 'industry',
    raw_description: `Pachama uses satellite data and machine learning to verify carbon offsets. We need a Full-Stack ML Engineer to build end-to-end pipelines from satellite imagery ingestion to carbon stock estimation. Tech stack: Python, PyTorch, FastAPI, React, PostgreSQL, AWS. You'll own features from model training to production deployment. Must be comfortable with both frontend and ML infrastructure. 3+ years industry experience required. San Francisco or remote. Series B funded.`,
    expected: {
      visa_path: 'cap_subject',
      cap_exempt_confidence: 'none',
      employer_type: 'private_sector',
      match_score_min: 0.52,
      match_score_max: 0.72,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'weeks',
    },
  },
  {
    id: 'GS-IV-03',
    category: 'industry_vernacular',
    title: 'Senior SWE - Geospatial Data Platform',
    company: 'Maxar Technologies',
    source_type: 'industry',
    raw_description: `Maxar Technologies is hiring a Senior Software Engineer for our Geospatial Data Platform. Build scalable data processing pipelines for high-resolution satellite imagery. Work with our SaaS platform serving enterprise and government customers. Tech: Java/Kotlin, Apache Spark, Kafka, K8s, GCP. Must have 5+ years SWE experience and familiarity with distributed systems. Remote sensing domain knowledge a nice-to-have but not required. Westminster, CO or remote.`,
    expected: {
      visa_path: 'cap_subject',
      cap_exempt_confidence: 'none',
      employer_type: 'private_sector',
      match_score_min: 0.25,
      match_score_max: 0.45,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'weeks',
    },
  },

  // ─── Edge Cases (3) ───────────────────────────────────────────────────────

  {
    id: 'GS-EC-01',
    category: 'edge_case',
    title: 'Research Scientist - Applied Remote Sensing',
    company: 'Battelle / Pacific Northwest National Laboratory',
    source_type: 'government',
    raw_description: `Battelle Memorial Institute operates Pacific Northwest National Laboratory (PNNL) for the U.S. Department of Energy. We're seeking a Research Scientist to apply remote sensing techniques to environmental monitoring of DOE sites. The position involves satellite and drone-based monitoring of water bodies and terrestrial ecosystems. Battelle is a 501(c)(3) nonprofit. This position does not require security clearance. Work authorization required but citizenship is not required. Richland, WA.`,
    expected: {
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'confirmed',
      employer_type: 'nonprofit_research',
      match_score_min: 0.82,
      match_score_max: 1.0,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'months',
    },
  },
  {
    id: 'GS-EC-02',
    category: 'edge_case',
    title: 'Research Associate - Ocean Sciences',
    company: 'University of British Columbia',
    source_type: 'academic',
    raw_description: `The Department of Earth, Ocean and Atmospheric Sciences at UBC invites applications for a Research Associate in satellite oceanography. The candidate will work on phytoplankton bloom detection in the Northeast Pacific using Sentinel-3 OLCI and PACE data. This is a Canadian academic institution — international applicants are welcome and UBC will support work permit applications through LMIA. Vancouver, BC. Salary: CAD $65,000-$75,000.`,
    expected: {
      visa_path: ['canada', 'cap_exempt'],
      cap_exempt_confidence: ['confirmed', 'likely'],
      employer_type: 'university',
      match_score_min: 0.80,
      match_score_max: 1.0,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: ['academic_cycle', 'months'],
    },
  },
  {
    id: 'GS-EC-03',
    category: 'edge_case',
    title: 'Part-Time Research Assistant - Coastal Ecology',
    company: 'New England Aquarium',
    source_type: 'academic',
    raw_description: `The New England Aquarium (501(c)(3) nonprofit) seeks a Part-Time Research Assistant for our Anderson Cabot Center for Ocean Life. 20 hours/week. Assist researchers with satellite data downloads, image processing, and database maintenance for our right whale habitat monitoring project. Requirements: MS in marine science or related field. Familiarity with GIS and R. Boston, MA. $25/hour.`,
    expected: {
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'confirmed',
      employer_type: 'nonprofit_research',
      match_score_min: 0.62,
      match_score_max: 0.82,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'weeks',
    },
  },

  // ─── Contractor Disambiguation (3) ────────────────────────────────────────

  {
    id: 'GS-CONT-01',
    category: 'cap_exempt',
    title: 'Research Scientist - Earth System Modeling',
    company: 'Battelle / Pacific Northwest National Laboratory',
    source_type: 'academic',
    raw_description: `Battelle Memorial Institute, operator of Pacific Northwest National Laboratory (PNNL) under contract with the U.S. Department of Energy, seeks a Research Scientist in Earth System Modeling. You will develop and validate regional climate models with emphasis on land-atmosphere interactions. PNNL is located in Richland, WA. Requirements: PhD in atmospheric science, climate modeling, or related field. Experience with CESM, WRF, or E3SM. Battelle is a 501(c)(3) not-for-profit organization.`,
    expected: {
      visa_path: 'cap_exempt',
      cap_exempt_confidence: ['confirmed', 'likely'],
      employer_type: 'nonprofit_research',
      match_score_min: 0.58,
      match_score_max: 0.82,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'months',
    },
  },
  {
    id: 'GS-CONT-02',
    category: 'cap_subject',
    title: 'Senior Data Scientist - NOAA Climate Programs',
    company: 'Booz Allen Hamilton',
    source_type: 'industry',
    raw_description: `Booz Allen Hamilton is seeking a Senior Data Scientist to support NOAA's climate data programs in Silver Spring, MD. You will develop data pipelines for climate observation datasets, build ML models for quality assurance, and support NOAA's Climate Data Online system. Requirements: MS/PhD in data science, atmospheric science, or related field. 3+ years experience with cloud computing (AWS). Secret clearance preferred. Booz Allen Hamilton, Inc. is a publicly traded management consulting firm.`,
    expected: {
      visa_path: ['cap_subject', 'cap_exempt'],
      cap_exempt_confidence: ['none', 'unverified', 'confirmed', 'likely'],
      employer_type: ['government_contractor', 'government_direct'],
      match_score_min: 0.49,
      match_score_max: 0.73,
      requires_security_clearance: true, // "Secret clearance preferred" — Claude conservatively flags this
      requires_citizenship: false,
      hiring_timeline_estimate: ['months', 'weeks'],
    },
  },
  {
    id: 'GS-CONT-03',
    category: 'cap_exempt',
    title: 'Postdoctoral Researcher - Atmospheric Chemistry',
    company: 'UCAR / NCAR',
    source_type: 'academic',
    raw_description: `The University Corporation for Atmospheric Research (UCAR), a 501(c)(3) nonprofit, invites applications for a Postdoctoral Researcher at the National Center for Atmospheric Research (NCAR) in Boulder, CO. Research will focus on remote sensing of atmospheric aerosols and their effects on air quality. The position is funded by NSF. Requirements: PhD in atmospheric science, environmental engineering, or related field. Experience with MODIS AOD retrievals and air quality modeling. UCAR is an equal opportunity employer and welcomes international applicants.`,
    expected: {
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'confirmed',
      employer_type: ['nonprofit_research', 'cooperative_institute'],
      match_score_min: 0.70,
      match_score_max: 0.94,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: ['months', 'academic_cycle'],
    },
  },

  // ─── Part-Time Cap-Exempt Bridge Roles (3) ────────────────────────────────

  {
    id: 'GS-PT-01',
    category: 'cap_exempt',
    title: 'Part-time Research Assistant - Marine Biology',
    company: 'New England Aquarium',
    source_type: 'academic',
    raw_description: `The New England Aquarium, a 501(c)(3) nonprofit research and education institution, seeks a Part-Time Research Assistant (20 hours/week) for our Marine Conservation Action Fund research program. The assistant will support our harbor seal population study in Boston Harbor, including field sampling of water quality parameters (temperature, salinity, dissolved oxygen, turbidity) and satellite data processing for habitat monitoring. Responsibilities include processing MODIS and Sentinel-2 imagery for chlorophyll-a concentration mapping, maintaining our in-situ monitoring database, and assisting with statistical analyses of population trends. Requirements: MS in marine biology, environmental science, or related field. Experience with R or Python for statistical analysis. Field sampling experience preferred, including small boat operations. Familiarity with GIS and satellite remote sensing data products a plus. Boston, MA. $28/hour, no benefits. Flexible schedule.`,
    expected: {
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'confirmed',
      employer_type: 'nonprofit_research',
      match_score_min: 0.45,
      match_score_max: 0.65,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'immediate',
    },
  },
  {
    id: 'GS-PT-02',
    category: 'cap_subject',
    title: 'Adjunct Instructor - Environmental Science',
    company: 'Bunker Hill Community College',
    source_type: 'academic',
    raw_description: `Bunker Hill Community College, a Massachusetts state community college, invites applications for a part-time Adjunct Instructor to teach Introduction to Environmental Science (ENV 101) for the Fall 2026 semester. This is a 10 hours/week position covering one section of the introductory course. Responsibilities include preparing lectures, grading assignments, and holding office hours. The course covers ecosystems, pollution, climate change, and sustainability. Minimum qualifications: Master's degree in environmental science, ecology, or closely related field from a regionally accredited institution. Teaching experience at the college level preferred. Note: Bunker Hill Community College is a state-funded institution, not a 501(c)(3) nonprofit. Charlestown, MA. Compensation per the MCCC adjunct pay scale.`,
    expected: {
      visa_path: ['opt_compatible', 'cap_subject'],
      cap_exempt_confidence: 'none',
      employer_type: ['university', 'unknown'],
      match_score_min: 0.20,
      match_score_max: 0.40,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'immediate',
    },
  },
  {
    id: 'GS-PT-03',
    category: 'cap_exempt',
    title: 'Visiting Researcher - Chesapeake Bay Remote Sensing',
    company: 'Smithsonian Environmental Research Center',
    source_type: 'government',
    raw_description: `The Smithsonian Environmental Research Center (SERC) in Edgewater, MD invites applications for a Visiting Researcher to join our Land-Sea Interactions research group. This is a 6-month appointment (with possible 6-month extension) focused on satellite remote sensing validation of Chesapeake Bay water quality parameters. The researcher will compare satellite-derived chlorophyll-a, total suspended solids, and colored dissolved organic matter estimates from Landsat 8/9, Sentinel-2, and PACE against SERC's long-term in-situ monitoring dataset. Responsibilities include developing matchup protocols between satellite overpasses and field measurements, statistical analysis of retrieval accuracy across seasons and water types, and contributing to peer-reviewed publications. Requirements: PhD in environmental science, oceanography, or remote sensing. Experience with satellite ocean color algorithms and atmospheric correction methods. Proficiency in Python or R for geospatial analysis. Familiarity with Google Earth Engine or similar cloud computing platforms preferred. The Smithsonian Institution is a federally chartered trust instrumentality of the United States.`,
    expected: {
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'confirmed',
      employer_type: 'government_direct',
      match_score_min: 0.70,
      match_score_max: 0.88,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'immediate',
    },
  },

  // ─── Canadian Research Positions (3) ──────────────────────────────────────

  {
    id: 'GS-CA-01',
    category: 'canadian',
    title: 'Postdoctoral Fellow - Arctic Marine Remote Sensing',
    company: 'McGill University',
    source_type: 'academic',
    raw_description: `The Department of Earth and Planetary Sciences at McGill University (Montreal, QC) invites applications for a Postdoctoral Fellow in satellite remote sensing of Arctic marine ecosystems. The fellow will work with Prof. Jean-Pierre Gagné on a NSERC-funded project analyzing MODIS-Aqua, VIIRS, and Sentinel-3 OLCI data for chlorophyll-a retrieval in seasonally ice-covered Canadian Arctic waters. Research will focus on developing region-specific bio-optical algorithms that account for high CDOM concentrations and variable ice-edge bloom dynamics in Hudson Bay and the Canadian Arctic Archipelago. The position involves collaboration with Fisheries and Oceans Canada (DFO) and the Canadian Space Agency's Earth observation programs. Requirements: PhD in oceanography, remote sensing, or environmental science (completed within the last 3 years). Strong publication record in satellite ocean color or Arctic biogeochemistry. Proficiency in Python, MATLAB, or R for satellite data processing. Experience with NetCDF/HDF5 formats and radiative transfer modeling preferred. International applicants are welcome — McGill supports Post-Graduation Work Permit (PGWP) applications for eligible candidates. 2-year appointment, CAD $55,000/year plus benefits.`,
    expected: {
      visa_path: 'canada',
      cap_exempt_confidence: ['confirmed', 'likely'],
      employer_type: 'university',
      match_score_min: 0.80,
      match_score_max: 0.95,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'academic_cycle',
    },
  },
  {
    id: 'GS-CA-02',
    category: 'canadian',
    title: 'Research Scientist - Earth Observation Water Quality',
    company: 'Environment and Climate Change Canada',
    source_type: 'government',
    raw_description: `Environment and Climate Change Canada (ECCC), a department of the Government of Canada, seeks a Research Scientist (RE-04 level) for the Water Quality Monitoring and Surveillance Division based at the Canada Centre for Inland Waters in Burlington, ON. The successful candidate will lead development of operational satellite-based water quality indicators for the Great Lakes and other priority freshwater systems. Key responsibilities include: processing and validating satellite imagery (Sentinel-2 MSI, Landsat 8/9 OLI, MODIS) for chlorophyll-a, cyanobacteria abundance, and turbidity; developing automated workflows for near-real-time harmful algal bloom detection in Lake Erie and Lake Winnipeg; collaborating with provincial monitoring agencies and the International Joint Commission; and publishing results in peer-reviewed journals. Requirements: PhD in environmental science, remote sensing, limnology, or related field. Demonstrated experience with satellite-based freshwater monitoring using MODIS, VIIRS, or Sentinel-2. Proficiency with Python or R, Google Earth Engine, and geospatial data analysis. Knowledge of Canadian water quality guidelines an asset. Permanent position. Bilingualism (English/French) is an asset but not required. Open to international applicants — ECCC will facilitate work authorization through LMIA process.`,
    expected: {
      visa_path: 'canada',
      cap_exempt_confidence: ['confirmed', 'likely'],
      employer_type: 'government_direct',
      match_score_min: 0.78,
      match_score_max: 0.92,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'months',
    },
  },
  {
    id: 'GS-CA-03',
    category: 'canadian',
    title: 'Data Scientist - Ocean Color Remote Sensing',
    company: 'UBC Department of Earth, Ocean and Atmospheric Sciences',
    source_type: 'academic',
    raw_description: `The Department of Earth, Ocean and Atmospheric Sciences (EOAS) at the University of British Columbia invites applications for a Data Scientist position supporting DFO-funded research on Pacific Coast marine biogeochemistry. The successful candidate will apply machine learning methods (random forests, neural networks, transfer learning) to ocean color satellite data from MODIS, VIIRS, Sentinel-3 OLCI, and PACE for improved characterization of phytoplankton functional types and primary productivity in the Salish Sea and Northeast Pacific. This is a collaborative position with the Hakai Institute, a private ecological research institute on Calvert Island, BC. Responsibilities include developing cloud-based processing pipelines using Google Earth Engine and Python, maintaining quality-controlled in-situ validation datasets, and contributing to the BC Coastal Ocean Observing Network. Requirements: PhD or MS with 3+ years experience in marine remote sensing, data science, or computational oceanography. Strong skills in Python (xarray, scikit-learn, TensorFlow), cloud computing (GEE or AWS), and handling large satellite datasets. Experience with bio-optical measurements (AC-S, HPLC, flow cytometry) a plus. Vancouver, BC. CAD $70,000-$85,000. UBC welcomes international applicants and provides relocation support.`,
    expected: {
      visa_path: 'canada',
      cap_exempt_confidence: ['confirmed', 'likely'],
      employer_type: 'university',
      match_score_min: 0.82,
      match_score_max: 0.95,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'weeks',
    },
  },

  // ─── Cap-Subject with Known H1-B History (2) ─────────────────────────────

  {
    id: 'GS-H1B-01',
    category: 'cap_subject',
    title: 'Remote Sensing Engineer',
    company: 'Google',
    source_type: 'industry',
    raw_description: `Google's Geo team is hiring a Remote Sensing Engineer to work on Google Earth Engine, the world's most advanced cloud geospatial analysis platform used by over 10,000 researchers globally. You will design and build satellite imagery processing pipelines that handle petabytes of data from Landsat, Sentinel, MODIS, and commercial providers. Your work will power environmental monitoring applications including deforestation tracking, crop yield prediction, and water quality assessment at planetary scale. Responsibilities include developing efficient algorithms for atmospheric correction, cloud masking, and image compositing; building scalable data ingestion pipelines for new satellite missions; and collaborating with research partners at universities and NGOs. Requirements: PhD or MS in remote sensing, geophysics, environmental science, or computer science with geospatial focus. 3+ years experience with optical remote sensing, including understanding of sensor calibration and radiometric processing. Proficiency in Python and C++ for production-grade code. Experience with cloud-native geospatial formats (Cloud-Optimized GeoTIFF, Zarr, STAC) preferred. Familiarity with distributed computing frameworks (MapReduce, Apache Beam) a plus. Mountain View, CA. Google is an equal opportunity employer and has a strong track record of H1-B sponsorship. Competitive compensation including base salary, equity, and bonus.`,
    expected: {
      visa_path: 'cap_subject',
      cap_exempt_confidence: 'none',
      employer_type: 'private_sector',
      match_score_min: 0.60,
      match_score_max: 0.78,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'weeks',
    },
  },
  {
    id: 'GS-H1B-02',
    category: 'cap_subject',
    title: 'Environmental Data Scientist - AI for Good',
    company: 'Microsoft',
    source_type: 'industry',
    raw_description: `Microsoft's AI for Good Research Lab is seeking an Environmental Data Scientist to join our Planetary Computer team, an open platform combining global environmental datasets with AI tools for sustainability research. You will apply machine learning and computer vision to large-scale environmental monitoring challenges including land use/land cover classification from satellite imagery (Sentinel-2, Landsat), biodiversity mapping using species distribution models, and ocean health assessment through satellite-derived sea surface temperature and chlorophyll products. The role involves building reproducible ML pipelines on Azure, contributing to open-source tools (planetary-computer-sdk, STAC), and publishing research with academic collaborators. Requirements: PhD in environmental science, ecology, remote sensing, or a quantitative field with demonstrated application to environmental problems. Experience with satellite imagery analysis pipelines. Proficiency in Python, deep learning frameworks (PyTorch preferred), and cloud computing. Published research in remote sensing or environmental ML. Redmond, WA or remote within US. Microsoft has extensive experience with H1-B sponsorship across all engineering roles. Competitive salary $140K-$190K plus equity and benefits.`,
    expected: {
      visa_path: 'cap_subject',
      cap_exempt_confidence: 'none',
      employer_type: 'private_sector',
      match_score_min: 0.55,
      match_score_max: 0.72,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'weeks',
    },
  },

  // ─── OPT-Compatible Edge Cases (2) ────────────────────────────────────────

  {
    id: 'GS-OPT-01',
    category: 'cap_subject',
    title: 'Geospatial Analyst',
    company: 'Airbus Defence and Space US',
    source_type: 'industry',
    raw_description: `Airbus Defence and Space US, the American subsidiary of the European aerospace company Airbus SE, is hiring a Geospatial Analyst to support our Intelligence business line in Houston, TX. You will work with Airbus satellite imagery products including Pleiades Neo (30cm resolution), SPOT 6/7, and TerraSAR-X to deliver geospatial intelligence solutions to US government and commercial customers. Responsibilities include multi-sensor image fusion, feature extraction from optical and SAR data, change detection analysis, and quality assurance of derived geospatial products. You will also support customer training and demonstrations of the OneAtlas platform. Requirements: MS or PhD in remote sensing, geography, geospatial science, or related field. Experience with high-resolution commercial satellite imagery. Proficiency in ArcGIS Pro, ENVI, or QGIS. Programming skills in Python for automated processing workflows. Knowledge of photogrammetry and orthorectification processes. This position does not require security clearance. STEM OPT eligible — Airbus Defence and Space US (E-Verify participant) supports F-1 STEM OPT employment. International candidates welcome. Houston, TX. Salary: $85,000-$105,000.`,
    expected: {
      visa_path: ['cap_subject', 'opt_compatible'],
      cap_exempt_confidence: 'none',
      employer_type: 'private_sector',
      match_score_min: 0.45,
      match_score_max: 0.65,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'weeks',
    },
  },
  {
    id: 'GS-OPT-02',
    category: 'cap_exempt',
    title: 'ORISE Research Participant - Water Quality Remote Sensing',
    company: 'EPA Office of Research and Development',
    source_type: 'government',
    raw_description: `The Oak Ridge Institute for Science and Education (ORISE) announces a research participation opportunity at the U.S. Environmental Protection Agency's Office of Research and Development (ORD) in Athens, GA. The participant will support EPA's Cyanobacteria Assessment Network (CyAN) by analyzing Landsat 8/9 and Sentinel-2 imagery for detection and monitoring of harmful algal blooms (HABs) in US inland waters. Research activities include developing and validating satellite-based cyanobacteria abundance indices, building automated processing workflows for near-real-time HAB alerts, and comparing satellite retrievals against EPA field monitoring data from the National Lakes Assessment. The participant will work closely with EPA researchers and contribute to publications advancing the use of remote sensing for Clean Water Act compliance monitoring. Requirements: PhD in environmental science, remote sensing, or related field (received within the past 5 years or expected within 6 months). Experience with aquatic remote sensing, particularly bio-optical algorithms for inland waters. Proficiency in Python or R and Google Earth Engine. Familiarity with EPA water quality standards a plus. This is an ORISE fellowship administered by ORAU (a 501(c)(3) nonprofit), not a federal position. Stipend: $65,000/year. No citizenship requirement — open to all qualified applicants with valid US work authorization.`,
    expected: {
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'likely',
      employer_type: ['nonprofit_research', 'government_direct'],
      match_score_min: 0.72,
      match_score_max: 0.88,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'months',
    },
  },

  // ─── Citizenship/Clearance Required (3) ───────────────────────────────────

  {
    id: 'GS-CIT-01',
    category: 'ineligible',
    title: 'Geospatial Intelligence Analyst',
    company: 'National Geospatial-Intelligence Agency (NGA)',
    source_type: 'government',
    raw_description: `The National Geospatial-Intelligence Agency (NGA) is seeking a Geospatial Intelligence (GEOINT) Analyst for our Analysis Directorate in Springfield, VA. You will analyze multi-source satellite imagery (electro-optical, synthetic aperture radar, multispectral, hyperspectral) and geospatial data to produce intelligence assessments in support of national security decision-making. Responsibilities include image interpretation, terrain analysis, change detection, and preparation of geospatial intelligence reports for senior policymakers and military commanders. You will use NGA's classified GEOINT tools and databases, including commercial and national technical means imagery. Requirements: MS or PhD in geography, remote sensing, GIS, or related field. Experience with imagery analysis, GEOINT tradecraft, and geospatial tools (ArcGIS, ENVI, SOCET GXP). Understanding of collection platforms and sensor phenomenology. This position requires U.S. citizenship — no exceptions. TS/SCI security clearance with polygraph required. Applicants must be eligible for access to Sensitive Compartmented Information. NGA is a Department of Defense combat support agency and a member of the Intelligence Community.`,
    expected: {
      visa_path: 'cap_subject',
      cap_exempt_confidence: 'none',
      employer_type: 'government_direct',
      match_score_min: 0.30,
      match_score_max: 0.55,
      requires_security_clearance: true,
      requires_citizenship: true,
      hiring_timeline_estimate: 'months',
    },
  },
  {
    id: 'GS-CIT-02',
    category: 'ineligible',
    title: 'Earth Science Researcher - Ocean Color Algorithms',
    company: 'NASA Jet Propulsion Laboratory (Caltech)',
    source_type: 'government',
    raw_description: `NASA's Jet Propulsion Laboratory, managed by the California Institute of Technology, seeks an Earth Science Researcher in the Ocean Circulation Group (Section 329). Due to the nature of this work, US citizenship is required. The researcher will develop and validate ocean color algorithms for upcoming satellite missions including PACE and the Surface Biology and Geology (SBG) designated observable. Key responsibilities include advancing phytoplankton community detection algorithms using hyperspectral satellite data, conducting field validation campaigns with ship-based and autonomous platform measurements, and improving radiative transfer models for complex coastal waters. The position involves collaboration with NASA Goddard's Ocean Ecology Lab and international partners in ESA's Copernicus programme. Requirements: PhD in oceanography, optical physics, or environmental remote sensing. Demonstrated expertise in ocean color algorithm development (atmospheric correction, bio-optical inversion, or community composition retrieval). Experience with SeaDAS, ACOLITE, or equivalent processing frameworks. Strong publication record. Proficiency in Python, IDL, or MATLAB. JPL is operated by Caltech for NASA — this is a nonprofit research institution (501(c)(3)), but the citizenship requirement applies to this specific position due to ITAR restrictions and access to pre-release mission data. Pasadena, CA. Salary: $120,000-$160,000.`,
    expected: {
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'confirmed',
      employer_type: ['government_direct', 'nonprofit_research'],
      match_score_min: 0.82,
      match_score_max: 0.98,
      requires_security_clearance: false,
      requires_citizenship: true,
      hiring_timeline_estimate: 'months',
    },
  },
  {
    id: 'GS-CIT-03',
    category: 'citizenship_required',
    title: 'Environmental Scientist - Water Resources',
    company: 'U.S. Army Corps of Engineers (USACE)',
    source_type: 'government',
    raw_description: `The U.S. Army Corps of Engineers, Portland District, seeks an Environmental Scientist (GS-0401-11/12) for the Environmental Resources Branch. Work authorization required. Open to all US persons. Note: Under federal hiring authorities, "US persons" includes US citizens AND lawful permanent residents — this position does NOT require US citizenship specifically, but does require permanent work authorization. The scientist will conduct wetland delineation, water quality monitoring, and environmental impact assessments for USACE civil works projects in the Pacific Northwest. Responsibilities include monitoring water quality parameters at dam sites using field instrumentation and satellite remote sensing data (Landsat, Sentinel-2), preparing biological assessments under ESA Section 7, and supporting NEPA documentation. GIS analysis of project impacts using ArcGIS Pro is a core responsibility. Requirements: MS or PhD in environmental science, biology, ecology, or related field. 2+ years experience in wetland delineation (Corps 1987 Manual). Knowledge of Clean Water Act Section 404 regulations. Experience with water quality monitoring equipment. Familiarity with GIS and remote sensing applications for environmental assessment. Portland, OR. Federal benefits package. No security clearance required.`,
    expected: {
      visa_path: ['cap_exempt', 'cap_subject'],
      cap_exempt_confidence: ['confirmed', 'likely'],
      employer_type: 'government_direct',
      match_score_min: 0.42,
      match_score_max: 0.62,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'months',
    },
  },
]
