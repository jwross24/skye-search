-- Seed Canadian research institutions into cap_exempt_employers.
-- These are NOT "cap-exempt" in the US legal sense, but serve the same
-- strategic function: reliable visa sponsorship for researchers without
-- lottery risk. Canada has LMIA work permits and PGWP for PhD holders.
--
-- basis='canadian_institution' distinguishes from US cap-exempt.

INSERT INTO public.cap_exempt_employers (employer_name, employer_domain, cap_exempt_basis, confidence_level, aliases) VALUES
-- Major Canadian research universities (ocean/earth/environmental science)
('University of British Columbia', 'ubc.ca', 'canadian_institution', 'confirmed', '{"UBC"}'),
('McGill University', 'mcgill.ca', 'canadian_institution', 'confirmed', '{}'),
('University of Toronto', 'utoronto.ca', 'canadian_institution', 'confirmed', '{"UofT","U of T"}'),
('University of Alberta', 'ualberta.ca', 'canadian_institution', 'confirmed', '{"UAlberta"}'),
('Dalhousie University', 'dal.ca', 'canadian_institution', 'confirmed', '{}'),
('Memorial University of Newfoundland', 'mun.ca', 'canadian_institution', 'confirmed', '{"MUN","Memorial University"}'),
('University of Victoria', 'uvic.ca', 'canadian_institution', 'confirmed', '{"UVic"}'),
('Université Laval', 'ulaval.ca', 'canadian_institution', 'confirmed', '{}'),
('University of Waterloo', 'uwaterloo.ca', 'canadian_institution', 'confirmed', '{}'),
('Simon Fraser University', 'sfu.ca', 'canadian_institution', 'confirmed', '{"SFU"}'),
-- Canadian federal research organizations
('Environment and Climate Change Canada', 'ec.gc.ca', 'canadian_institution', 'confirmed', '{"ECCC"}'),
('Fisheries and Oceans Canada', 'dfo-mpo.gc.ca', 'canadian_institution', 'confirmed', '{"DFO"}'),
('National Research Council Canada', 'nrc-cnrc.gc.ca', 'canadian_institution', 'confirmed', '{"NRC Canada"}')
ON CONFLICT (employer_name) DO NOTHING;
