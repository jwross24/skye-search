-- One-time cleanup of bad data in prod.
-- Run after P1.1-P1.5 deployed to prevent re-accumulation.
-- Safe: jobs FK to applications is ON DELETE SET NULL, FK to votes is ON DELETE CASCADE.

-- 1. Delete career page / info page jobs (not actual postings)
DELETE FROM public.jobs
WHERE title ILIKE 'Why Work at%'
   OR title ILIKE 'Careers at%'
   OR title ILIKE 'Life at%'
   OR title ILIKE 'About Us%'
   OR title ILIKE 'Join Our Team%'
   OR title ILIKE 'Work With Us%';

-- 2. Delete European/international jobs (scoring gate prevents new ones)
DELETE FROM public.jobs
WHERE location ILIKE '%Denmark%'
   OR location ILIKE '%Germany%'
   OR location ILIKE '%Netherlands%'
   OR location ILIKE '%Sweden%'
   OR location ILIKE '%Norway%'
   OR location ILIKE '%Finland%'
   OR location ILIKE '%Switzerland%'
   OR location ILIKE '%France%'
   OR location ILIKE '%United Kingdom%'
   OR location ILIKE '%UK%'
   OR location ILIKE '%Italy%'
   OR location ILIKE '%Spain%'
   OR location ILIKE '%Australia%'
   OR location ILIKE '%Japan%'
   OR location ILIKE '%China%'
   OR location ILIKE '%South Korea%'
   OR location ILIKE '%India%'
   OR location ILIKE '%Singapore%'
   OR location ILIKE '%Brazil%';

-- 3. Delete seed application data (identified by known seed job titles)
-- These are demo entries from seed-to-supabase.ts that shouldn't be in prod
DELETE FROM public.applications
WHERE job_id IN (
  SELECT id FROM public.jobs
  WHERE source = 'seed'
);

-- Also delete the seed jobs themselves
DELETE FROM public.jobs WHERE source = 'seed';

-- 4. Dedup: delete lower-scored duplicates of same company+title
-- Keep the row with the highest match_score
DELETE FROM public.jobs
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, lower(company), lower(title)
             ORDER BY match_score DESC NULLS LAST, created_at DESC
           ) AS rn
    FROM public.jobs
    WHERE company IS NOT NULL AND title IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Also clean discovered_jobs that produced career pages
DELETE FROM public.discovered_jobs
WHERE title ILIKE 'Why Work at%'
   OR title ILIKE 'Careers at%'
   OR title ILIKE 'Life at%'
   OR title ILIKE 'About Us%';
