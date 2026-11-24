const env = import.meta.env || {} // empty under plain Node (unit tests)
const rawApi = env.VITE_API_URL
// In Vite dev server, use relative proxy paths so /api and /shots avoid CORS issues;
// in static builds or Node unit tests, fall back to http://localhost:8000.
export const API =
  rawApi != null && rawApi !== ''
    ? String(rawApi).replace(/\/+$/, '')
    : env.DEV
      ? ''
      : 'http://localhost:8000'

export const DEFAULT_RECALL = env.VITE_RECALL_REF || '26419'
export const DEFAULT_SHOP = env.VITE_SHOP_URL || 'http://localhost:8001'

export const TIERS = ['CONFIRMED', 'LIKELY', 'RELATED', 'CONFLICT', 'NO_MATCH', 'UNRESOLVED']

// Fixed Case File / War Room palette. Zero green anywhere.
// Colour is never the only signal: every verdict stamp carries explicit text.
// `inkOnPaper` tokens are tuned for >= 4.5:1 WCAG AA contrast on aged paper (#EFE8D8).
// `accent` tokens are tuned for legibility on dark ink/board (#0E0F12 / #15171C).
export const TIER_STYLE = {
  CONFIRMED: {
    label: 'Confirmed',
    stamp: 'CONFIRMED',
    long: 'Confirmed match',
    bg: '#E5383B',
    fg: '#FFFFFF',
    accent: '#E5383B',
    inkOnPaper: '#B51F24',
    paperTint: 'rgba(229, 56, 59, 0.08)',
  },
  LIKELY: {
    label: 'Likely',
    stamp: 'LIKELY',
    long: 'Likely match',
    bg: '#D95D1E',
    fg: '#FFFFFF',
    accent: '#E06B2E',
    inkOnPaper: '#A63D0A',
    paperTint: 'rgba(217, 93, 30, 0.09)',
  },
  RELATED: {
    label: 'Related',
    stamp: 'RELATED',
    long: 'Related, not confirmed',
    bg: '#D49B1A',
    fg: '#14120F',
    accent: '#D9A426',
    inkOnPaper: '#805A00',
    paperTint: 'rgba(212, 155, 26, 0.11)',
  },
  CONFLICT: {
    label: 'Conflict',
    stamp: 'CONFLICT',
    long: 'Conflict between official sources',
    bg: '#8B5CF6',
    fg: '#FFFFFF',
    accent: '#9F75FF',
    inkOnPaper: '#5B21B6',
    paperTint: 'rgba(139, 92, 246, 0.09)',
  },
  NO_MATCH: {
    label: 'No match found',
    stamp: 'NO MATCH',
    long: 'No match found in checked sources',
    bg: '#64748B',
    fg: '#FFFFFF',
    accent: '#8596AC',
    inkOnPaper: '#3E4B5E',
    paperTint: 'rgba(100, 116, 139, 0.09)',
  },
  UNRESOLVED: {
    label: 'Unresolved',
    stamp: 'UNRESOLVED',
    long: 'Unresolved',
    bg: '#9CA3AF',
    fg: '#14120F',
    accent: '#A8AFB9',
    inkOnPaper: '#4B525C',
    paperTint: 'rgba(156, 163, 175, 0.14)',
  },
}

// Evidence board pin & card colors — strictly zero green.
export const NODE_COLOR = {
  Recall: '#E5383B',
  Listing: '#EFE8D8',
  ProductModel: '#C9A45C',
  Identifier: '#8B5CF6',
  Seller: '#D95D1E',
  Brand: '#64748B',
  Hazard: '#B51F24',
  Remedy: '#7C6F64',
}

export const REASON_TEXT = {
  ID_MODEL_EXACT: 'The model number matches the recall exactly, ignoring spaces, hyphens and capitals.',
  ID_GTIN_EXACT: 'The barcode (GTIN) is valid and matches one named in the recall.',
  BRAND_EQ: 'The brand agrees with the recall.',
  BRAND_DIFF: 'The brand differs from the recalled brand, so this cannot be matched.',
  SCOPE_ALL_UNITS: 'The notice covers all units of this model.',
  SCOPE_IN_RANGE: 'The listing shows a date or lot inside the recall range.',
  SCOPE_UNVERIFIED: 'The notice limits scope by date or lot and the listing does not show enough to check. A person needs to check the label.',
  SCOPE_OUTSIDE: 'The listing shows a date or lot outside the recall range.',
  NAME_ONLY: 'Only the name or brand looks similar. No identifier overlaps.',
  SRC_TIER_NOT_A: 'The recall record is not from an official authority, so the result is capped at Likely.',
  QUOTE_UNVERIFIED: 'A quote could not be found in the page text, so that field was dropped.',
  CONFLICT_MODELS: 'Official sources list different models.',
  CONFLICT_SCOPE: 'Official sources give different date or lot ranges.',
  CONFLICT_HAZARD: 'Official sources describe the hazard differently.',
  CONFLICT_REMEDY: 'Official sources give different remedies.',
  CONFLICT_STATUS: 'Official sources disagree on the status of the notice.',
  BLOCKED: 'The page blocked the agent with a bot check. Redthread does not try to get around blocks.',
  EXTRACT_FAIL: 'Extraction failed or found nothing it could verify.',
}

export const STAGES = [
  ['official', 'Official record'],
  ['harvest', 'Notice'],
  ['discover', 'Discover'],
  ['inspect', 'Inspect'],
  ['extract', 'Extract'],
  ['match', 'Match'],
  ['report', 'Report'],
]

// Fallback only. The API sends the authoritative disclaimer in ReportJSON.
export const DISCLAIMER =
  "Redthread reports what was matched in the sources it checked. 'No match found in checked sources' is not a statement about product safety. Always follow the official notice and remedy."
