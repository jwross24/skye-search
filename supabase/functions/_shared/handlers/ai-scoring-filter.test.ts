/**
 * Tests for pre-scoring URL/title filter.
 * Verifies that non-job URLs and titles are rejected before Claude API call.
 */
import { describe, it, expect } from 'vitest'
import { isNonJobEntry } from '../url-filter'

describe('isNonJobEntry', () => {
  describe('rejects non-job URLs', () => {
    it.each([
      ['https://go.nature.com/3abc123', 'Nature redirect'],
      ['https://nature.com/articles/s41586-024-12345', 'Nature article'],
      ['https://nature.com/subjects/physical-oceanography', 'Nature topic page'],
      ['https://scholar.google.com/citations?id=abc', 'Google Scholar'],
      ['https://www.researchgate.net/publication/123', 'ResearchGate'],
      ['https://www.wikipedia.org/wiki/Remote_sensing', 'Wikipedia'],
      ['https://www.reddit.com/r/remotesensing/post', 'Reddit'],
      ['https://www.youtube.com/watch?v=abc', 'YouTube'],
    ])('rejects %s (%s)', (url, _label) => {
      expect(isNonJobEntry(url, 'Some Job Title')).toBe(true)
    })
  })

  describe('allows job URLs', () => {
    it.each([
      ['https://www.usajobs.gov/job/12345', 'USAJobs'],
      ['https://academicjobsonline.org/ajo/jobs/26789', 'AJO'],
      ['https://higheredjobs.com/details.cfm?JobCode=123', 'HigherEdJobs'],
      ['https://careers.whoi.edu/opportunities/postdoc', 'WHOI'],
      ['https://naturecareers.com/job/12345', 'Nature Careers'],
      ['https://nature.com/naturecareers/job/12345', 'Nature Careers subdirectory'],
      ['https://sciencecareers.org/job/12345', 'Science Careers'],
    ])('allows %s (%s)', (url, _label) => {
      expect(isNonJobEntry(url, 'Research Scientist')).toBe(false)
    })
  })

  describe('rejects non-job titles', () => {
    it('rejects bare "Nature" title', () => {
      expect(isNonJobEntry('https://example.com/page', 'Nature')).toBe(true)
    })

    it('rejects "Physical oceanography" topic page', () => {
      expect(isNonJobEntry('https://example.com/page', 'Physical oceanography | Nature Communications')).toBe(true)
    })
  })

  describe('allows real job titles', () => {
    it.each([
      'Physical Scientist',
      'Postdoc in Satellite Remote Sensing',
      'Environmental Data Scientist',
      'NOAA Research Scientist',
      'Nature Conservation Officer',  // "Nature" as part of a real title
    ])('allows "%s"', (title) => {
      expect(isNonJobEntry('https://usajobs.gov/job/123', title)).toBe(false)
    })
  })
})
