-- Add NRCan (Natural Resources Canada) and Hakai Institute.
-- Found missing during eo2q cross-review: both are relevant for
-- ocean/earth science PhD researcher in Canada pathway.

INSERT INTO public.cap_exempt_employers (employer_name, employer_domain, cap_exempt_basis, confidence_level, aliases) VALUES
('Natural Resources Canada', 'nrcan-rncan.gc.ca', 'canadian_institution', 'confirmed', '{"NRCan","Geological Survey of Canada","GSC"}'),
('Hakai Institute', 'hakai.org', 'canadian_institution', 'confirmed', '{}')
ON CONFLICT (employer_name) DO NOTHING;
