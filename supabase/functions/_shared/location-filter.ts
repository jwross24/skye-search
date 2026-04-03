/**
 * Geographic location filter for scoring safety net.
 * No external dependencies — works in both Deno and Node/Vitest.
 */

const INTERNATIONAL_PATTERNS = [
  // European countries and cities (not city names shared with US/Canada)
  /\b(?:UK|United Kingdom|England|Scotland|Wales|Germany|France|Italy|Spain|Netherlands|Sweden|Norway|Denmark|Finland|Switzerland|Austria|Belgium|Ireland|Portugal|Poland|Czech|Greece|Hungary|Romania|Bulgaria|Croatia|Estonia|Latvia|Lithuania|Luxembourg|Slovenia|Slovakia)\b/i,
  /\b(?:London|Berlin|Munich|Paris|Lyon|Amsterdam|Stockholm|Copenhagen|Oslo|Helsinki|Zurich|Vienna|Brussels|Lisbon|Warsaw|Prague|Budapest|Bucharest)\b/i,
  // Note: Oxford, Cambridge, Edinburgh, Manchester, Dublin, Athens, Sydney, Melbourne removed from city-only
  // patterns — they have US/Canadian namesakes. Matched only via country/province context below.
  /\b(?:ETH|Aarhus|Uppsala|Lund|Wageningen|Delft|Leiden|Groningen)\b/i,
  // Asia, Oceania, South America, Africa — country names (not ambiguous city names)
  /\b(?:China|Japan|South Korea|India|Singapore|Taiwan|Hong Kong|Australia|New Zealand)\b/i,
  /\b(?:Tokyo|Beijing|Shanghai|Seoul|Mumbai|Auckland)\b/i,
  /\b(?:Brazil|Argentina|Chile|Colombia|South Africa|Nigeria|Kenya|Egypt)\b/i,
]

// US state abbreviations (2-letter, uppercase). Used to detect "City, ST" patterns.
const US_STATE_ABBREVS = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
])

// Canadian province abbreviations
const CA_PROVINCE_ABBREVS = new Set([
  'AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT',
])

// Full US state names (for "City, StateName" patterns)
const US_STATE_NAMES = /\b(?:Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|District of Columbia)\b/i

// Canadian province names
const CA_PROVINCE_NAMES = /\b(?:Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland|Nova Scotia|Ontario|Prince Edward Island|Quebec|Saskatchewan)\b/i

/**
 * Returns true if the location string appears to be in the US or Canada.
 * Used to short-circuit international detection for "City, ST" patterns
 * where the city name has a famous international namesake (Cambridge, Oxford, etc.).
 */
function isLikelyNorthAmerica(location: string): boolean {
  // Check for ", ST" or ", Province" suffix patterns
  const parts = location.split(',').map(p => p.trim())
  if (parts.length >= 2) {
    const regionPart = parts[parts.length - 1].trim()
    if (US_STATE_ABBREVS.has(regionPart) || CA_PROVINCE_ABBREVS.has(regionPart)) return true
  }
  if (US_STATE_NAMES.test(location)) return true
  if (CA_PROVINCE_NAMES.test(location)) return true
  // Explicit USA/Canada markers
  if (/\b(?:USA|United States|U\.S\.A?\.?|Canada)\b/i.test(location)) return true
  return false
}

/**
 * Code-level safety net for international locations.
 * Claude is the primary gate (geographic instruction in rubric);
 * this catches cases where Claude misses.
 */
export function isInternationalLocation(location: string | null): boolean {
  if (!location) return false
  if (location.toLowerCase().includes('remote') || location.toLowerCase().includes('tbd')) return false
  // If the location clearly anchors to North America, skip international matching.
  // This prevents false positives like "Cambridge, MA", "Oxford, MS", "Dublin, OH", "Athens, GA".
  if (isLikelyNorthAmerica(location)) return false
  return INTERNATIONAL_PATTERNS.some(re => re.test(location))
}
