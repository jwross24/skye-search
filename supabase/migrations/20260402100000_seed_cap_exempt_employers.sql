-- Seed cap_exempt_employers with known cap-exempt employers relevant to
-- environmental science / ocean remote sensing / earth science.
-- These are injected into the AI scoring prompt so Claude can classify
-- visa_path=cap_exempt with higher confidence.

-- Add unique constraint on employer_name for upsert/dedup
CREATE UNIQUE INDEX IF NOT EXISTS cap_exempt_employers_name_unique
  ON public.cap_exempt_employers (employer_name);

INSERT INTO public.cap_exempt_employers (employer_name, employer_domain, cap_exempt_basis, confidence_level, aliases) VALUES
-- Major research universities
('MIT', 'mit.edu', 'university', 'confirmed', '{"Massachusetts Institute of Technology"}'),
('Stanford University', 'stanford.edu', 'university', 'confirmed', '{}'),
('University of California', 'universityofcalifornia.edu', 'university', 'confirmed', '{"UC Berkeley","UC San Diego","UCLA","UC Santa Cruz","UC Davis","UC Irvine","UCSD","Scripps Institution of Oceanography"}'),
('University of Washington', 'uw.edu', 'university', 'confirmed', '{}'),
('University of Michigan', 'umich.edu', 'university', 'confirmed', '{}'),
('Columbia University', 'columbia.edu', 'university', 'confirmed', '{"Lamont-Doherty Earth Observatory"}'),
('University of Colorado Boulder', 'colorado.edu', 'university', 'confirmed', '{"CU Boulder"}'),
('Oregon State University', 'oregonstate.edu', 'university', 'confirmed', '{}'),
('University of Rhode Island', 'uri.edu', 'university', 'confirmed', '{}'),
('University of Miami', 'miami.edu', 'university', 'confirmed', '{"Rosenstiel School"}'),
('Texas A&M University', 'tamu.edu', 'university', 'confirmed', '{}'),
('University of Hawaii', 'hawaii.edu', 'university', 'confirmed', '{}'),
('University of Maryland', 'umd.edu', 'university', 'confirmed', '{}'),
('Penn State University', 'psu.edu', 'university', 'confirmed', '{"Pennsylvania State University"}'),
('University of Wisconsin', 'wisc.edu', 'university', 'confirmed', '{}'),
('University of Minnesota', 'umn.edu', 'university', 'confirmed', '{}'),
('Boston University', 'bu.edu', 'university', 'confirmed', '{}'),
('Georgia Institute of Technology', 'gatech.edu', 'university', 'confirmed', '{"Georgia Tech"}'),
('University of Virginia', 'virginia.edu', 'university', 'confirmed', '{}'),
('University of Alaska Fairbanks', 'alaska.edu', 'university', 'confirmed', '{}'),

-- Government agencies (direct hire = cap-exempt)
('NOAA', 'noaa.gov', 'government', 'confirmed', '{"National Oceanic and Atmospheric Administration"}'),
('NASA', 'nasa.gov', 'government', 'confirmed', '{"National Aeronautics and Space Administration","Goddard Space Flight Center","GSFC","JPL","Jet Propulsion Laboratory"}'),
('USGS', 'usgs.gov', 'government', 'confirmed', '{"United States Geological Survey","U.S. Geological Survey"}'),
('EPA', 'epa.gov', 'government', 'confirmed', '{"Environmental Protection Agency","U.S. EPA"}'),
('DOE', 'energy.gov', 'government', 'confirmed', '{"Department of Energy","U.S. Department of Energy"}'),
('NIST', 'nist.gov', 'government', 'confirmed', '{"National Institute of Standards and Technology"}'),
('NSF', 'nsf.gov', 'government', 'confirmed', '{"National Science Foundation"}'),
('Smithsonian Institution', 'si.edu', 'government', 'confirmed', '{"Smithsonian Environmental Research Center","SERC"}'),

-- Government labs (national labs = cap-exempt)
('Pacific Northwest National Laboratory', 'pnnl.gov', 'government', 'confirmed', '{"PNNL","Battelle PNNL"}'),
('Oak Ridge National Laboratory', 'ornl.gov', 'government', 'confirmed', '{"ORNL"}'),
('Argonne National Laboratory', 'anl.gov', 'government', 'confirmed', '{"ANL"}'),
('Lawrence Berkeley National Laboratory', 'lbl.gov', 'government', 'confirmed', '{"LBNL","Berkeley Lab"}'),
('Brookhaven National Laboratory', 'bnl.gov', 'government', 'confirmed', '{"BNL"}'),
('Sandia National Laboratories', 'sandia.gov', 'government', 'confirmed', '{"SNL"}'),
('Los Alamos National Laboratory', 'lanl.gov', 'government', 'confirmed', '{"LANL"}'),
('National Renewable Energy Laboratory', 'nrel.gov', 'government', 'confirmed', '{"NREL"}'),

-- Nonprofit research organizations (501(c)(3) = cap-exempt)
('Woods Hole Oceanographic Institution', 'whoi.edu', '501(c)(3) nonprofit', 'confirmed', '{"WHOI"}'),
('Battelle Memorial Institute', 'battelle.org', '501(c)(3) nonprofit', 'confirmed', '{"Battelle"}'),
('RAND Corporation', 'rand.org', '501(c)(3) nonprofit', 'confirmed', '{}'),
('SRI International', 'sri.com', '501(c)(3) nonprofit', 'confirmed', '{}'),
('Monterey Bay Aquarium Research Institute', 'mbari.org', '501(c)(3) nonprofit', 'confirmed', '{"MBARI"}'),
('Schmidt Ocean Institute', 'schmidtocean.org', '501(c)(3) nonprofit', 'confirmed', '{}'),

-- Cooperative institutes (university-government partnerships = cap-exempt)
('CIRES', 'cires.colorado.edu', 'cooperative institute', 'confirmed', '{"Cooperative Institute for Research in Environmental Sciences"}'),
('CIRA', 'cira.colostate.edu', 'cooperative institute', 'confirmed', '{"Cooperative Institute for Research in the Atmosphere"}'),
('JCET', 'jcet.umbc.edu', 'cooperative institute', 'confirmed', '{"Joint Center for Earth Systems Technology"}'),
('ESSIC', 'essic.umd.edu', 'cooperative institute', 'confirmed', '{"Earth System Science Interdisciplinary Center"}'),
('CICOES', 'cicoes.uw.edu', 'cooperative institute', 'confirmed', '{"Cooperative Institute for Climate, Ocean, and Ecosystem Studies"}'),
('CIMAS', 'cimas.earth.miami.edu', 'cooperative institute', 'confirmed', '{"Cooperative Institute for Marine and Atmospheric Studies"}'),
('CISESS', 'cisess.umd.edu', 'cooperative institute', 'confirmed', '{"Cooperative Institute for Satellite Earth System Studies"}'),

-- Research fellowships (government-funded = cap-exempt via host institution)
('ORAU', 'orau.org', '501(c)(3) nonprofit', 'likely', '{"Oak Ridge Associated Universities","ORISE","Zintellect"}'),
('UCAR', 'ucar.edu', '501(c)(3) nonprofit', 'confirmed', '{"University Corporation for Atmospheric Research","NCAR","National Center for Atmospheric Research"}')

ON CONFLICT (employer_name) DO NOTHING;
