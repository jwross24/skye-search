import { describe, it, expect } from 'vitest'
import { parseRdfFeed, isRelevant, RELEVANCE_KEYWORDS, AJO_FEED_URL } from './ajo-rss'
import type { RdfItem } from './ajo-rss'

// ─── Sample RSS/RDF fixture ────────────────────────────────────────────────

const SAMPLE_FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel rdf:about="https://academicjobsonline.org/ajo">
<title>Academicjobsonline.org Job Listing</title>
<items><rdf:Seq>
  <rdf:li rdf:resource="https://academicjobsonline.org/ajo/UBC/Earth%20Ocean%20Atmospheric/31781?rss" />
  <rdf:li rdf:resource="https://academicjobsonline.org/ajo/MIT/Physics/31800?rss" />
  <rdf:li rdf:resource="https://academicjobsonline.org/ajo/Cornell/Ecology/31867?rss" />
</rdf:Seq></items>
</channel>

<item rdf:about="https://academicjobsonline.org/ajo/UBC/Earth%20Ocean%20Atmospheric/31781?rss">
<title>Postdoctoral Fellow in Satellite Oceanography</title>
<link>https://academicjobsonline.org/ajo/UBC/Earth%20Ocean%20Atmospheric/31781?rss</link>
<description>The Department of Earth, Ocean and Atmospheric Sciences at UBC invites applications for a postdoctoral fellow in satellite remote sensing of ocean color. Experience with MODIS/VIIRS data processing required.</description>
</item>

<item rdf:about="https://academicjobsonline.org/ajo/MIT/Physics/31800?rss">
<title>Postdoc in Quantum Computing</title>
<link>https://academicjobsonline.org/ajo/MIT/Physics/31800?rss</link>
<description>The MIT Physics Department seeks a postdoctoral researcher to work on quantum error correction and fault-tolerant quantum computing.</description>
</item>

<item rdf:about="https://academicjobsonline.org/ajo/Cornell/Ecology/31867?rss">
<title>Research Associate in Freshwater Ecology</title>
<link>https://academicjobsonline.org/ajo/Cornell/Ecology/31867?rss</link>
<description>Cornell&#x27;s Department of Ecology and Evolutionary Biology seeks a research associate to study freshwater ecosystem dynamics and climate change impacts on lake ecosystems.</description>
</item>

</rdf:RDF>`

// ─── parseRdfFeed ──────────────────────────────────────────────────────────

describe('parseRdfFeed', () => {
  it('extracts all items from RDF feed', () => {
    const items = parseRdfFeed(SAMPLE_FEED)
    expect(items).toHaveLength(3)
  })

  it('parses title, description, URL correctly', () => {
    const items = parseRdfFeed(SAMPLE_FEED)
    const ubc = items[0]
    expect(ubc.title).toBe('Postdoctoral Fellow in Satellite Oceanography')
    expect(ubc.description).toContain('satellite remote sensing')
    expect(ubc.url).toBe('https://academicjobsonline.org/ajo/UBC/Earth%20Ocean%20Atmospheric/31781')
  })

  it('strips ?rss suffix from URLs', () => {
    const items = parseRdfFeed(SAMPLE_FEED)
    expect(items.every(i => !i.url.endsWith('?rss'))).toBe(true)
  })

  it('extracts university and department from URL path', () => {
    const items = parseRdfFeed(SAMPLE_FEED)
    expect(items[0].university).toBe('UBC')
    expect(items[0].department).toBe('Earth Ocean Atmospheric')
    expect(items[1].university).toBe('MIT')
    expect(items[1].department).toBe('Physics')
  })

  it('decodes XML entities in description', () => {
    const items = parseRdfFeed(SAMPLE_FEED)
    const cornell = items[2]
    expect(cornell.description).toContain("Cornell's")
  })

  it('handles empty/malformed XML gracefully', () => {
    expect(parseRdfFeed('')).toEqual([])
    expect(parseRdfFeed('<rdf:RDF></rdf:RDF>')).toEqual([])
    expect(parseRdfFeed('not xml at all')).toEqual([])
  })
})

// ─── isRelevant ────────────────────────────────────────────────────────────

describe('isRelevant', () => {
  it('matches oceanography posting', () => {
    const item: RdfItem = {
      url: 'https://ajo.org/test/1',
      title: 'Postdoctoral Fellow in Satellite Oceanography',
      description: 'Ocean color remote sensing research',
      department: 'Earth Ocean Atmospheric',
      university: 'UBC',
    }
    expect(isRelevant(item)).toBe(true)
  })

  it('matches climate/ecology posting', () => {
    const item: RdfItem = {
      url: 'https://ajo.org/test/2',
      title: 'Research Associate in Freshwater Ecology',
      description: 'climate change impacts on lake ecosystems',
      department: 'Ecology',
      university: 'Cornell',
    }
    expect(isRelevant(item)).toBe(true)
  })

  it('rejects quantum computing posting', () => {
    const item: RdfItem = {
      url: 'https://ajo.org/test/3',
      title: 'Postdoc in Quantum Computing',
      description: 'quantum error correction and fault-tolerant quantum computing',
      department: 'Physics',
      university: 'MIT',
    }
    expect(isRelevant(item)).toBe(false)
  })

  it('matches on department name even if title is generic', () => {
    const item: RdfItem = {
      url: 'https://ajo.org/test/4',
      title: 'Postdoctoral Associate',
      description: 'Join our lab.',
      department: 'Natural Resources and the Environment',
      university: 'Cornell',
    }
    expect(isRelevant(item)).toBe(true)
  })

  it('matches on university name containing keywords', () => {
    const item: RdfItem = {
      url: 'https://ajo.org/test/5',
      title: 'Research Scientist',
      description: 'Modeling work.',
      department: 'Science',
      university: 'National Center for Atmospheric Research',
    }
    expect(isRelevant(item)).toBe(true)
  })
})

// ─── Configuration ─────────────────────────────────────────────────────────

describe('AJO RSS configuration', () => {
  it('has a valid feed URL', () => {
    expect(AJO_FEED_URL).toContain('academicjobsonline.org')
    expect(AJO_FEED_URL).toContain('rss')
  })

  it('has relevance keywords covering Skye domain', () => {
    const kws = RELEVANCE_KEYWORDS.join(' ')
    expect(kws).toContain('ocean')
    expect(kws).toContain('remote sensing')
    expect(kws).toContain('climate')
    expect(kws).toContain('ecology')
    expect(kws).toContain('marine')
  })
})
