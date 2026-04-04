-- DOL LCA Cap-Exempt Employer Import
-- Source: /tmp/lca_fy2026_q1.xlsx
-- Total cap-exempt employers found: 1049
-- After filtering (≥2 filings): 592
--   university: 372
--   nonprofit_research: 213
--   government: 7
-- DOL LCA Cap-Exempt Employer Bulk Import
-- Generated from /tmp/lca_fy2026_q1.xlsx
-- 592 employers

BEGIN;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Abraham Baldwin Agricultural College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Administrators of the Tulane Educational Fund', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Adventist Health System Sunbelt Healthcare Corp', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Albany Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Albany Medical College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Albert Einstein College of Medicine', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Alegent Creighton Health', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Alegent Health-Bergan Mercy Health', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Allen Institute', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Allen Institute for Artificial Intelligence', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Alliance for Sustainable Energy, LLC', 'nonprofit_research', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Altru Health System', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('American University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Ann & Robert H. Lurie Children''s Hospital of Chicago', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Appalachian State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Arc Research Institute', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Arizona State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Arkansas Health Group', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Arkansas State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Auburn University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Ball State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Banner Health', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Banner Medical Group', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Banner University Medical Group', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Baptist Health', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Barnard College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Baruch College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Baruch S. Blumberg Institute', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Battelle Memorial Institute', 'nonprofit_research', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Bay Area Environmental Research Institute', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Baylor College of Medicine', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Baylor Research Institute', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Baylor University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Beckman Research Institute of the City of Hope', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Bentley University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Berkshire Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Beth Israel Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Bexar County Hospital District', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Board of Regents of the University of Nebraska', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Boise State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('BOR USGA obo Augusta University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Boston College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Bowie State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Brandeis University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Brigham and Women''s Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Brigham Young University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Bronxcare Health System', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Brookdale Hospital Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Brookhaven National Laboratory', 'nonprofit_research', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Brooklyn Hospital Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Brown University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('California Institute of Technology', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('California Institute of Technology/Jet Propulsion Laboratory', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('California Polytechnic State University, San Luis Obispo', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('California State University, Sacramento', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Cambridge Public Health Commission', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Cameron University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Carnegie Mellon University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Case Western Reserve University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Cedars-Sinai Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Center for Strategic and International Studies', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Central Connecticut State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Central Michigan University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Cgh Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Charlotte Mecklenburg Hospital Authority', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Charlotte Mecklenburg Hospital Authority d/b/a Atrium Health', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Children''s Hospital Los Angeles', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Children''s Mercy Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Children''s National Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Choctaw Nation of Oklahoma', 'government', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('CHRISTUS Health', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('CHRISTUS Trinity Clinic Texas', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The City of Detroit', 'government', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('City of Hope National Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Clement J. Zablocki VA Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Clemson University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Cleveland Clinic', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Cleveland Clinic Foundation', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Cleveland State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Coastal Carolina University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Coffeyville Regional Medical Center Inc', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Cold Spring Harbor Laboratory', 'nonprofit_research', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('College of Staten Island of the City University of New York', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The College of William and Mary', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Colorado School of Mines', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Colorado State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Colorado West Healthcare System', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Columbia University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Comanche County Hospital Authority', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Commonwealth of Massachusetts/Office of the Governor', 'government', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Concord Hospital - Laconia', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Corewell Health', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Cornell University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('County of Monterey', 'government', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('CoxHealth', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Creighton University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Cumberland County Hospital System, Inc', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Curators of the University of Missouri', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Curators of the University of Missouri/University of Missouri-Kansas City', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Cuyuna Regional Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Dakota State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Dana-Farber Cancer Institute', 'nonprofit_research', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Dartmouth-Hitchcock Clinic', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Dayton Osteopathic Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Delaware State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('DePaul University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Dignity Community Care', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Dignity Health', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Drexel University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Dubois Regional Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Duke University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Duke University Health System', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('East Carolina University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('East Phillips County Hospital District', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('East Tennessee State University (ETSU)', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('East Texas A&M University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Eastern Illinois University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Eastern Kentucky University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Eastern Maine Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Eastern Michigan University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('El Campo Memorial Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Ellsworth County Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Embry-Riddle Aeronautical University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Emory University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Emporia State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Endeavor Health Clinical Operations', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Excelsior University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Feinstein Institutes for Medical Research', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Fermi Research Alliance, LLC', 'nonprofit_research', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Fisher College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Florida A&M University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Florida Atlantic University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Florida Gulf Coast University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Florida Institute of Technology', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Florida International University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Florida Polytechnic University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Florida State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Fordham University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Fort Hays State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Fort Valley State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Franklin Pierce University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Geisinger Clinic', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Geisinger Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Geisinger System Services', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Genesis Health System', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('George Mason University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Georgetown University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Georgia Institute of Technology', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Georgia State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Golden Gate University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Gonzaga University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Grand Valley State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Guthrie Lourdes Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Hamilton College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Hampton University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Harvard University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Hawai''i Pacific University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Health Care Authority of the City of Huntsville', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Hegg Health Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Henry Ford Health System', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Henry M. Jackson Foundation', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Herbert H. Lehman College of CUNY', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Horizon Institute for Public Service', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Hospital of Central Connecticut', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Howard Hughes Medical Institute', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Howard University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Icahn School of Medicine at Mount Sinai', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Idaho State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Illinois Institute of Technology', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Indiana Regional Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Indiana University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Indiana University Indianapolis', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Indiana University Purdue University Indianapolis', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Inova Health Care Services', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Institute for Musculoskeletal Advancement', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Institute for Women''s Policy Research', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Iowa State University of Science and Technology', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The J David Gladstone Institutes', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The J. David Gladstone Institutes', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Jackson Laboratory', 'nonprofit_research', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Jacksonville State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Jacobson Memorial Hospital Care Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('James Madison University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Johns Hopkins Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Johns Hopkins University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Johns Hopkins University Applied Physics Lab', 'nonprofit_research', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Kansas State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Kennesaw State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Kent State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Kettering Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Kettering Network Services', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Kutztown University of Pennsylvania', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Lamar University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Langston University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Last Frontier Healthcare District', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Lawrence Berkeley National Laboratory', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Lawrence Livermore National Security, LLC', 'nonprofit_research', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Lehigh University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Leland Stanford Jr. Univ/SLAC National Accelerator Lab', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Leland Stanford, Jr University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Lincoln University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Loma Linda - Inland Empire Consortium for Healthcare Education', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Loma Linda University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Long Island University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Louisiana Children''s Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Louisiana State University A&M College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Louisiana State University and A&M College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Louisiana State University Health Sciences Center New Orleans', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Louisiana Tech University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Loyola University Chicago', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('LSU Agricultural Center', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('LSU Health Sciences Center', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Lucile Salter Packard Childrens Hospital at Stanford', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Maharishi International University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Maimonides Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Marquette University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Marshall University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Mary Hitchcock Memorial Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Mary Imogene Bassett Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Mass General Brigham Incorporated', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Massachusetts Eye and Ear Associates', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Massachusetts Eye and Ear Infirmary', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Massachusetts Institute of Technology', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Mayo Clinic', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('MCPHS University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Medical University Hospital Authority', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Medical University of South Carolina & Affiliates', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Medical University of South Carolina and Affiliates', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Memorial Hermann Health System', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Mercy Clinic East Communities', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Mercy Clinic Springfield Communities', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Mercy Hospital, Cedar Rapids, Iowa', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Mercy Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Methodist Hospital Research Institute', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Metrohealth System', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Metropolitan State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Metropolitan State University of Denver', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('MHM Support Services', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Miami University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Michigan State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Michigan Technological University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Middle Tennessee State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Minnesota State Colleges and Universities', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Mississippi County Hospital System', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Mississippi State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Missouri Delta Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Missouri State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Mitchell County Hospital District', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Monongahela Valley Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Montana State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Montclair State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Montefiore Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Montefiore New Rochelle Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Morgan State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Mosaic Health System', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Mother Frances Regional Health Care Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Mount Sinai Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Mount Sinai Medical Center of Florida', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('MultiCare Health System', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Muskingum University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('MyMichigan Medical Center Midland', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Nathan Littauer Hospital & Nursing Home', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('National Institutes of Health, HHS', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Nationwide Children''s Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Nebraska Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Neosho Memorial Regional Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('New Jersey Institute of Technology', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('New Mexico Institute of Mining and Technology', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('New Mexico State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('New York University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('New York University, Courant Institute of Mathematical Sciences', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Norman Regional Hospital Authority (an Oklahoma Public Trust)', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('North Carolina State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('North Dakota State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Northeast Montana Health Services', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Northeast Ohio Medical University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Northeastern University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Northern Arizona University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Northern Illinois University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Northern Kentucky University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Northwell Health', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Northwest Medical Specialties Inc', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Northwestern Memorial HealthCare', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Northwestern University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Nova Southeastern University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('NYU Grossman School of Medicine', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('NYU Langone Health System', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Oberlin College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Ochiltree Hospital District', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Ochsner Clinic Foundation', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Ohio State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Ohio University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Oklahoma Medical Research Foundation', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Oklahoma State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Old Dominion University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Olivet University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Oral Roberts University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Oregon Health & Science University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Oregon State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('OSF Healthcare System', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('OSF Multi-Specialty Group', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Palo Alto Veterans Institute for Research', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Parkland Health Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('PeaceHealth', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Penn State Milton S. Hershey Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Pennsylvania State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Pepperdine University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Physician Affiliate Group of Ny, Pc', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Pittsburg State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Portland State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Prairie View A&M University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Presbyterian Healthcare Services', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('President and Board of Trustees of Santa Clara College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Providence Health & Services', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Providence Health & Services - Washington', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Public Hospital District 1-A of Whitman County', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Purdue University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Reading Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Regents of the University of California at Riverside', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Regents of the University of Minnesota', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Rensselaer Polytechnic Institute', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Research Foundation for SUNY Albany', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Research Foundation for SUNY Upstate Medical University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Research Foundation for the State University of New York', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Research Foundation of CUNY', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Research Institute at Nationwide Children''s Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Research Corporation of the University of Hawaii', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Research Triangle Institute (U.S.)', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Rhode Island Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Robert Packer Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Rochester General Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Rochester Institute of Technology', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Rockefeller University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Rush University Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Rutgers, The State University of New Jersey', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Saint Francis Health System', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Saint Francis University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Saint Louis University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Salina Regional Health Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Salk Institute for Biological Studies', 'nonprofit_research', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Sam Houston State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Sanford', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Sanford Burnham Prebys Medical Discovery Institute', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Sanford Clinic', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Sanford Health', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Sanford Medical Center Fargo', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Savannah College of Art and Design', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Scott & White Hospital - Marble Falls', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Scripps Health', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Scripps Research Institute', 'nonprofit_research', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Seattle Children''S Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Self Regional Healthcare', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Sentara Health', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Simons Foundation', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Skidmore College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Smithsonian Astrophysical Observatory', 'government', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Soka University of America', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('South Dakota School of Mines and Technology', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('South Dakota State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Southern Methodist University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Southwest Research Institute', 'nonprofit_research', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Spaulding Rehabilitation Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Sphere Institute', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Spring Hill College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('St. John''s Episcopal Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('St. John''s University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('St. Jude Children''s Research Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('St. Luke''S-Roosevelt Hospital Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('St. Mary''s University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Stanford Health Care', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('State University of New York at Buffalo', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('State University of New York at Stony Brook', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('State University of New York Downstate Health Sciences University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('State University of New York, Upstate Medical University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Stetson University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Stowers Institute for Medical Research', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Sul Ross State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Sutter Bay Hospitals', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Sutter Coast Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Sutter Health', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Syracuse University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Tarleton State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Teachers College, Columbia University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Temple University--A Commonwealth University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Texas A&M Transportation Institute', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Texas A&M University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Texas A&M University-Central Texas', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Texas A&M University-Corpus Christi', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Texas A&M University-Kingsville', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Texas A&M University-San Antonio', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Texas Biomedical Research Institute', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Texas Children''s Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Texas Health Resources', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Texas State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Texas Tech University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Texas Tech University Health Sciences Center', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Texas Tech University Health Sciences Center El Paso', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Thomas Jefferson University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Touro University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Trinity Health', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Trinity West', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Trustees of Boston University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Trustees of Dartmouth College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Trustees of Princeton University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Trustees of the Smith College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Trustees of the University of Pennsylvania', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Tufts University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Ucsf Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('UMC Health System', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Unity Hospital of Rochester', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Univ of WI System', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Univ of WI System/Eau Claire', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Univ of WI System/La Crosse', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Univ of WI System/Platteville', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Univ of WI System/River Falls', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Univ of WI System/Stout', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Univ of WI System/Superior', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Universal Service Administrative Company', 'government', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University at Albany, State University of New York', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University Corporation for Atmospheric Research', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Alabama', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Alabama at Birmingham', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Alabama in Huntsville', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Alaska', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Arizona', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Arkansas', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Arkansas for Medical Sciences', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Arkansas System Division of Agriculture', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of California at Santa Barbara', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of California, Agriculture and Natural Resources', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of California, Berkeley', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of California, Davis', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of California, Irvine', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of California, Los Angeles', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of California, Merced', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of California, San Diego', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of California, San Francisco', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of California, Santa Cruz', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Central Florida', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Central Missouri', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Chicago', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Chicago Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Cincinnati', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Colorado', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Colorado Denver', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Colorado Denver / Anschutz', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Colorado Health', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Connecticut', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Connecticut Health Center', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Delaware', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Denver', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Florida', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Georgia', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Georgia; OGE', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Guam', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Hawaii', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Houston', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Illinois', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Illinois Chicago', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Iowa', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Kansas', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Kansas Health System', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Kansas Medical Center', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Kentucky', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Louisiana at Lafayette', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Louisville', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Maine', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Maryland Baltimore', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Maryland College Park', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Maryland Eastern Shore', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Maryland Global Campus', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Maryland, Baltimore County', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Maryland, College Park', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Massachusetts Amherst', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Massachusetts Boston', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Massachusetts Chan Medical School', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Massachusetts Lowell', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Massachusetts Office of the President', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Memphis', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Miami', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Michigan', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Minnesota', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Mississippi', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Mississippi Medical Center', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Nebraska Medical Center', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Nevada, Las Vegas', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Nevada, Reno', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of New Hampshire', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of New Mexico', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of New Orleans', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of North Carolina at Asheville', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of North Carolina at Chapel Hill', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of North Carolina at Charlotte', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of North Carolina at Greensboro', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of North Dakota', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of North Georgia', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of North Texas', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of North Texas Health Science Center', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Notre Dame du Lac', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Oklahoma', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Oklahoma Health Sciences Center', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Oregon', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Pittsburgh', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Pittsburgh Physicians', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('UNIVERSITY OF PUERTO RICO-Mayaguez Campus', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Rochester', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of South Alabama', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of South Carolina', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of South Florida', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Southern California', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Southern Indiana', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Tennessee', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Tennessee Health Science Center', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Texas at Arlington', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Texas at Austin', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Texas at Dallas', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Texas at San Antonio', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Texas at Tyler', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Texas El Paso', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Texas Health Science Center at Houston', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Texas Health Science Center at San Antonio', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Texas Health Science Center at Tyler', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Texas M.D. Anderson Cancer Center', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Texas Medical Branch', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Texas Permian Basin', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Texas Rio Grande Valley', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Texas System', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of the Pacific', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of the South', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Toledo', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Utah', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Vermont', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Vermont and State Agricultural College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The University of Virginia', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Washington', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of West Florida', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Wisconsin System', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Wisconsin-Milwaukee', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('University of Wyoming', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('UPCI Cancer Services', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('UPMC Medical Education', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('UPMC Presbyterian Shadyside', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Urban Institute', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('UT Le Bonheur Pediatric Specialists, Inc', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('UT Southwestern Medical Center', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('UT Southwestern Medical Center, Office of International Affairs', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Ut-Battelle, LLC (Oak Ridge National Laboratory)', 'nonprofit_research', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Utah State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Utah System of Higher Education', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Utah Valley University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Van Andel Research Institute', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Vanderbilt University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Vanderbilt University Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('VCU Health System Authority', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Villanova University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Virginia Commonwealth University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Virginia Polytechnic Institute & State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('W.M. Rice University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Wake Forest University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Wake Forest University Baptist Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Wake Forest University Health Sciences', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Wasatch Front Regional Council', 'government', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Washburn University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Washington Adventist University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Washington State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Washington University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Wayne State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Webster County Community Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Weill Cornell Medical College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Welia Health', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Wellspan Medical Group', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('West Chester University of Pennsylvania', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('West Texas A&M University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('West Virginia University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Westchester Medical Center Advanced Physician Services, PC', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Western Illinois University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Western Michigan University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Western Washington University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Whitehead Institute for Biomedical Research', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Wichita State University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('William Beaumont Hospital', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('William Jewell College', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('William Paterson University of New Jersey', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Wishek Hospital Clinic Association', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('The Wistar Institute of Anatomy and Biology', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Woods Hole Oceanographic Institution', 'nonprofit_research', 'confirmed', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Worcester Polytechnic Institute', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Wyckoff Heights Medical Center', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Xavier University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Xavier University of Louisiana', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Yale University', 'university', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;-- Import complete: 592 employers


INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)
VALUES ('Yuma Regional Medical Center dba Onvida Health Medical Group', 'nonprofit_research', 'likely', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)
ON CONFLICT (employer_name) DO UPDATE SET
  confidence_level = CASE
    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'
    ELSE EXCLUDED.confidence_level
  END,
  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),
  verification_date = EXCLUDED.verification_date;

COMMIT;

