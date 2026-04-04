/**
 * Tests for pre-scoring URL/title filter.
 * Test cases derived from production zero-score jobs (2026-03-25 through 2026-04-04).
 */
import { describe, it, expect } from 'vitest'
import { isNonJobEntry } from '../url-filter'

describe('isNonJobEntry', () => {
  describe('rejects nature.com non-job pages (31 of 70 zero-score in prod)', () => {
    it.each([
      ['https://go.nature.com/3abc123', 'Nature redirect'],
      ['https://nature.com/articles/s41586-024-12345', 'Nature article'],
      ['https://nature.com/subjects/physical-oceanography', 'Nature subject page'],
      ['https://www.nature.com/articles/s41598-026-42245-0', 'Nature Scientific Reports article'],
      ['https://www.nature.com/search?author=Sean+Molesky', 'Nature author search'],
      ['https://www.nature.com/subjects/physical-oceanography/ncomms', 'Nature Comms subject page'],
      ['http://www.npg.nature.com/articles/s41467-026-70228-2', 'NPG article'],
      ['http://www.npg.nature.com/subjects/biogeochemistry', 'NPG subject page'],
      ['https://go.nature.com/climate-data/ocean', 'Nature climate data'],
      ['https://nature.com/articles/d41586-026-00401-6', 'Nature news article'],
    ])('rejects %s (%s)', (url, _label) => {
      expect(isNonJobEntry(url, 'Some Job Title')).toBe(true)
    })
  })

  describe('allows nature careers (job board)', () => {
    it.each([
      ['https://naturecareers.com/job/12345', 'Nature Careers'],
      ['https://nature.com/naturecareers/job/12345', 'Nature Careers subdirectory'],
    ])('allows %s (%s)', (url, _label) => {
      expect(isNonJobEntry(url, 'Research Scientist')).toBe(false)
    })
  })

  describe('rejects career landing pages (12 of 70 zero-score in prod)', () => {
    it.each([
      ['http://www.gsn.com/careers', 'Bare careers page'],
      ['https://gcsp-solutions.com/careers/', 'Careers with trailing slash'],
      // careers.whoi.edu/contact-us/ and /news/ are caught by TITLE patterns
      // ("Contact Us" and "News | ..."), not URL patterns — "careers" is the subdomain
      ['http://www.umbc.edu/hr/employment/index.html', 'HR employment index'],
      ['https://insidecires.colorado.edu/hr', 'HR page'],
      ['https://campuslife.umbc.edu/about/student-employment/', 'Student employment overview'],
      ['https://foundation.colostate.edu/job-opportunities/', 'Job opportunities landing'],
      ['https://jobs.colostate.edu/user/new', 'Account creation page'],
      ['https://whoi.edu/who-we-are/work-with-whoi', 'Work with us page'],
      ['https://science.nasa.gov/about-us/job-opportunities/', 'NASA job opportunities landing'],
      ['https://nasa.gov/general/jobs-and-internships-at-nasa-goddard', 'NASA jobs/internships landing'],
      ['https://jobs.umbc.edu/faq/nonexempt-employment-tips/', 'FAQ page on jobs site'],
      ['https://www.ioccp.org/index.php/jobs', 'Jobs index page'],
      ['https://science.gsfc.nasa.gov/sed/', 'GSFC department page'],
    ])('rejects %s (%s)', (url, _label) => {
      expect(isNonJobEntry(url, 'Some Title')).toBe(true)
    })
  })

  describe('allows career pages with specific job postings', () => {
    it.each([
      ['https://careers.whoi.edu/opportunities/postdoc-12345', 'WHOI specific postdoc'],
      ['https://careers.noaa.gov/opportunities/postdoc-ocean-color', 'NOAA specific opportunity'],
      ['https://gst.applicantpool.com/jobs/1037873.html', 'Applicant pool job listing'],
      ['https://www.pnnl.gov/careers/scientist-position-2024', 'PNNL specific position'],
    ])('allows %s (%s)', (url, _label) => {
      expect(isNonJobEntry(url, 'Research Scientist')).toBe(false)
    })
  })

  describe('rejects blog/news/docs pages (5 of 70 zero-score in prod)', () => {
    it.each([
      ['https://www.geowgs84.com/post/processing-massive-geospatial-datasets-with-apache-sedona', 'Blog post'],
      ['https://www.axisspatial.com/blog/geospatial-in-cloud-snowflake', 'Blog post'],
      ['https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/spatial-ai.html', 'Oracle docs'],
      ['https://docs.planet.com/data/', 'Planet docs'],
      ['https://cires1.colorado.edu/news/announcements/index.html', 'News page'],
    ])('rejects %s (%s)', (url, _label) => {
      expect(isNonJobEntry(url, 'Some Title')).toBe(true)
    })
  })

  describe('rejects other non-job URLs from prod data', () => {
    it.each([
      ['http://bit.ly/1WqKHhe', 'URL shortener'],
      ['https://www.linkedin.com/jobs/view/12345', 'LinkedIn (login wall)'],
      ['https://ibs.colorado.edu/people/lauren-herwehe/', 'Faculty profile page'],
    ])('rejects %s (%s)', (url, _label) => {
      expect(isNonJobEntry(url, 'Some Title')).toBe(true)
    })
  })

  describe('rejects non-job titles from prod data', () => {
    it.each([
      'Nature',
      'Nature Search',
      'Physical oceanography | Nature Communications',
      'Physical oceanography - Latest research and news | Nature',
      'News | CIRES',
      'Welcome | CIRES',
      'Page Not Found',
      'HOME - Jack Atkinson\'s Website',
      'Careers',
      'Student Employment',
      'Contact Us - Careers@WHOI',
      '',
    ])('rejects title "%s"', (title) => {
      expect(isNonJobEntry('https://example.com/page', title)).toBe(true)
    })
  })

  describe('allows real job URLs', () => {
    it.each([
      ['https://www.usajobs.gov/job/12345', 'USAJobs'],
      ['https://academicjobsonline.org/ajo/jobs/26789', 'AJO'],
      ['https://higheredjobs.com/details.cfm?JobCode=123', 'HigherEdJobs'],
      ['https://sciencecareers.org/job/12345', 'Science Careers'],
      ['https://www.ubc.ca/jobs/scientist', 'UBC Canada'],
      ['https://emploisfp-psjobs.cfp-psc.gc.ca/job-1', 'GC Jobs Canada'],
      ['https://apply.interfolio.com/12345', 'Interfolio'],
      ['https://environmentaljobs.com/job/postdoc-hydrology/', 'EnvironmentalJobs'],
    ])('allows %s (%s)', (url, _label) => {
      expect(isNonJobEntry(url, 'Research Scientist')).toBe(false)
    })
  })

  describe('allows real job titles', () => {
    it.each([
      'Physical Scientist',
      'Postdoc in Satellite Remote Sensing',
      'Environmental Data Scientist',
      'NOAA Research Scientist',
      'Nature Conservation Officer',
      'Post-Doctoral Research Associate: Department of Ecology',
      'Postdoctoral Associate - Water Resources Research Group',
      'Program Analyst - College Park, MD',
    ])('allows "%s"', (title) => {
      expect(isNonJobEntry('https://usajobs.gov/job/123', title)).toBe(false)
    })
  })
})
