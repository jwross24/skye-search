/**
 * Golden set: 22 manually-graded job descriptions for AI scoring regression testing.
 *
 * Each entry has expected values for visa_path, cap_exempt_confidence, employer_type,
 * match_score range, and ineligibility flags.
 *
 * Categories:
 *   5 cap-exempt, 5 cap-subject, 3 ineligible,
 *   3 academic vernacular, 3 industry vernacular, 3 edge cases
 */

export type GoldenSetCategory =
  | 'cap_exempt'
  | 'cap_subject'
  | 'ineligible'
  | 'academic_vernacular'
  | 'industry_vernacular'
  | 'edge_case'

export interface GoldenSetEntry {
  id: string
  category: GoldenSetCategory
  title: string
  company: string
  source_type: 'academic' | 'government' | 'industry' | 'until_filled'
  raw_description: string
  expected: {
    visa_path: string
    cap_exempt_confidence: string
    employer_type: string
    match_score_min: number
    match_score_max: number
    requires_security_clearance: boolean
    requires_citizenship: boolean
    hiring_timeline_estimate: string
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
      hiring_timeline_estimate: 'weeks',
    },
  },
  {
    id: 'GS-CE-03',
    category: 'cap_exempt',
    title: 'Research Associate - NASA Ocean Biology',
    company: 'NASA Goddard Space Flight Center / SSAI',
    source_type: 'government',
    raw_description: `Science Systems and Applications, Inc. (SSAI) is seeking a Research Associate to support NASA's Ocean Biology Processing Group (OBPG) at Goddard Space Flight Center. The position involves processing and distributing satellite ocean color data products from MODIS-Aqua, VIIRS-SNPP/JPSS, and the upcoming PACE mission. Key responsibilities include algorithm development for chlorophyll-a and water quality retrievals, quality assurance of global ocean color datasets, and scientific publication. Requirements: PhD in ocean science, physics, or computational environmental science. Strong programming skills in Python or C. Experience with satellite data processing pipelines.`,
    expected: {
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'likely',
      employer_type: 'government_contractor',
      match_score_min: 0.85,
      match_score_max: 1.0,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'months',
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
      match_score_min: 0.80,
      match_score_max: 1.0,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'months',
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
      match_score_min: 0.75,
      match_score_max: 0.95,
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
      match_score_min: 0.55,
      match_score_max: 0.80,
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
      match_score_min: 0.25,
      match_score_max: 0.50,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'weeks',
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
      match_score_min: 0.45,
      match_score_max: 0.70,
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
      match_score_min: 0.40,
      match_score_max: 0.65,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'weeks',
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
      match_score_max: 0.25,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'weeks',
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
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'confirmed',
      employer_type: 'government_direct',
      match_score_min: 0.50,
      match_score_max: 0.80,
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
      visa_path: 'cap_subject',
      cap_exempt_confidence: 'none',
      employer_type: 'private_sector',
      match_score_min: 0.15,
      match_score_max: 0.40,
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
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'confirmed',
      employer_type: 'government_direct',
      match_score_min: 0.60,
      match_score_max: 0.85,
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
      match_score_min: 0.75,
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
      cap_exempt_confidence: 'likely',
      employer_type: 'government_direct',
      match_score_min: 0.80,
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
      match_score_min: 0.80,
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
    expected: {
      visa_path: 'cap_subject',
      cap_exempt_confidence: 'none',
      employer_type: 'private_sector',
      match_score_min: 0.40,
      match_score_max: 0.65,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'weeks',
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
      match_score_min: 0.35,
      match_score_max: 0.60,
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
      match_score_min: 0.20,
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
      match_score_min: 0.60,
      match_score_max: 0.85,
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
      visa_path: 'canada',
      cap_exempt_confidence: 'none',
      employer_type: 'university',
      match_score_min: 0.80,
      match_score_max: 1.0,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'months',
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
      match_score_min: 0.40,
      match_score_max: 0.65,
      requires_security_clearance: false,
      requires_citizenship: false,
      hiring_timeline_estimate: 'immediate',
    },
  },
]
