-- Fix mis-cased acronyms from wx9m LCA bulk import (bead skye-search-8pf3).
-- Python title() normalization mangled 4 well-known acronyms. This migration
-- updates them in place so case-sensitive job-posting lookups match correctly.
--
-- Affected rows (confirmed by querying local cap_exempt_employers, 645 total):
--   1. "Cgh Medical Center"                              → "CGH Medical Center"
--   2. "Ucsf Medical Center"                             → "UCSF Medical Center"
--   3. "Ut-Battelle, LLC (Oak Ridge National Laboratory)"→ "UT-Battelle, LLC (Oak Ridge National Laboratory)"
--   4. "Physician Affiliate Group of Ny, Pc"             → "Physician Affiliate Group of NY, PC"
--
-- The original fix list used trailing-space patterns ('Ut ', 'Uc ') that missed
-- hyphenated and punctuation-adjacent forms. See also: scripts/import-lca-employers.py.

BEGIN;

UPDATE public.cap_exempt_employers
  SET employer_name = 'CGH Medical Center'
  WHERE employer_name = 'Cgh Medical Center';

UPDATE public.cap_exempt_employers
  SET employer_name = 'UCSF Medical Center'
  WHERE employer_name = 'Ucsf Medical Center';

UPDATE public.cap_exempt_employers
  SET employer_name = 'UT-Battelle, LLC (Oak Ridge National Laboratory)'
  WHERE employer_name = 'Ut-Battelle, LLC (Oak Ridge National Laboratory)';

UPDATE public.cap_exempt_employers
  SET employer_name = 'Physician Affiliate Group of NY, PC'
  WHERE employer_name = 'Physician Affiliate Group of Ny, Pc';

COMMIT;
