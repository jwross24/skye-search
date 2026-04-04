#!/usr/bin/env python3
"""
DOL LCA Cap-Exempt Employer Bulk Import

Reads DOL OFLC LCA Disclosure Data (XLSX) and extracts likely cap-exempt
employers based on NAICS codes. Outputs SQL for upsert into cap_exempt_employers.

Usage:
  python3 scripts/import-lca-employers.py /tmp/lca_fy2026_q1.xlsx > /tmp/lca-employers.sql
  psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < /tmp/lca-employers.sql

Bead: wx9m
"""

import sys
import re
import openpyxl
from collections import defaultdict

# NAICS codes that strongly indicate cap-exempt status
# 6113: Colleges, Universities, and Professional Schools → cap_exempt (university)
# 6221: General Medical and Surgical Hospitals → cap_exempt (nonprofit_research)
# 9211: Executive, Legislative, and Government → cap_exempt (government)
# 9219: Other Justice, Public Order, and Safety → cap_exempt (government)
#
# NOT included:
# 5417: Scientific R&D — includes both nonprofits (Battelle, NREL) AND private (OpenAI, Amgen)
#   → Too noisy. Would need ProPublica 501(c)(3) cross-reference (bead l0u scope).
# 6211: Offices of Physicians — mostly private practices, not cap-exempt
#   → Too noisy. Hospitals (6221) are better signal.

NAICS_CAP_EXEMPT = {
    '6113': ('university', 'likely'),
    '6221': ('nonprofit_research', 'likely'),   # hospitals are mostly nonprofit
    '9211': ('government', 'confirmed'),
    '9219': ('government', 'confirmed'),
}

# Known private-sector entities that appear in cap-exempt NAICS codes
# (e.g., for-profit hospitals, for-profit schools)
PRIVATE_SECTOR_KEYWORDS = [
    'LLC', 'Inc.', 'Corporation', 'Corp.', 'Ltd.',
    'Partners', 'LP', 'L.P.', 'Group, Inc',
    # For-profit hospital chains
    'HCA ', 'Tenet Health', 'Community Health Systems',
    # For-profit education
    'DeVry', 'University of Phoenix', 'Strayer',
    'Kaplan', 'Capella', 'Walden University',
]

# Known cap-exempt employers in ambiguous NAICS codes (5417 R&D)
# These are manually verified nonprofits/government labs
KNOWN_CAP_EXEMPT_5417 = {
    'BATTELLE MEMORIAL INSTITUTE': ('nonprofit_research', 'confirmed'),
    'UT-BATTELLE': ('nonprofit_research', 'confirmed'),
    'BROOKHAVEN NATIONAL LABORATORY': ('nonprofit_research', 'confirmed'),
    'BROOKHAVEN SCIENCE ASSOCIATES': ('nonprofit_research', 'confirmed'),
    'DANA-FARBER CANCER INSTITUTE': ('nonprofit_research', 'confirmed'),
    'FRED HUTCHINSON CANCER CENTER': ('nonprofit_research', 'confirmed'),
    'NATIONAL RENEWABLE ENERGY LABORATORY': ('nonprofit_research', 'confirmed'),
    'ALLIANCE FOR SUSTAINABLE ENERGY': ('nonprofit_research', 'confirmed'),  # NREL operator
    'FERMI RESEARCH ALLIANCE': ('nonprofit_research', 'confirmed'),  # Fermilab
    'UNIVERSITIES SPACE RESEARCH ASSOCIATION': ('nonprofit_research', 'confirmed'),
    'SOUTHWEST RESEARCH INSTITUTE': ('nonprofit_research', 'confirmed'),
    'SRI INTERNATIONAL': ('nonprofit_research', 'confirmed'),
    'MITRE': ('nonprofit_research', 'confirmed'),
    'RAND CORPORATION': ('nonprofit_research', 'confirmed'),
    'WOODS HOLE OCEANOGRAPHIC INSTITUTION': ('nonprofit_research', 'confirmed'),
    'SMITHSONIAN': ('government', 'confirmed'),
    'CARNEGIE INSTITUTION': ('nonprofit_research', 'confirmed'),
    'SALK INSTITUTE': ('nonprofit_research', 'confirmed'),
    'COLD SPRING HARBOR LABORATORY': ('nonprofit_research', 'confirmed'),
    'JACKSON LABORATORY': ('nonprofit_research', 'confirmed'),
    'MEMORIAL SLOAN KETTERING': ('nonprofit_research', 'confirmed'),
    'MAYO CLINIC': ('nonprofit_research', 'confirmed'),
    'SCRIPPS RESEARCH': ('nonprofit_research', 'confirmed'),
    'INSTITUTE FOR DEFENSE ANALYSES': ('nonprofit_research', 'confirmed'),
    'AEROSPACE CORPORATION': ('nonprofit_research', 'confirmed'),
    'JOHNS HOPKINS UNIVERSITY APPLIED PHYSICS': ('nonprofit_research', 'confirmed'),
    'LAWRENCE LIVERMORE NATIONAL SECURITY': ('nonprofit_research', 'confirmed'),
    'LOS ALAMOS NATIONAL SECURITY': ('nonprofit_research', 'confirmed'),
    'SANDIA NATIONAL LABORATORIES': ('nonprofit_research', 'confirmed'),
    'NATIONAL TECHNICAL SYSTEMS': ('nonprofit_research', 'likely'),
    'PACIFIC NORTHWEST NATIONAL LABORATORY': ('nonprofit_research', 'confirmed'),
}


def normalize_name(name: str) -> str:
    """Normalize employer name for dedup and matching."""
    n = name.upper().strip()
    # Remove common suffixes
    for suffix in [', INC.', ', INC', ', LLC', ', LTD.', ', LTD',
                   ' INC.', ' INC', ' LLC', ' LTD.', ' LTD',
                   ', L.L.C.', ', L.P.', ' L.P.', ' LP',
                   ', CORPORATION', ' CORPORATION', ', CORP.', ' CORP.']:
        n = n.replace(suffix, '')
    # Remove "THE " prefix
    if n.startswith('THE '):
        n = n[4:]
    return n.strip()


def is_likely_private(name: str) -> bool:
    """Check if employer name suggests private sector."""
    upper = name.upper()
    for kw in PRIVATE_SECTOR_KEYWORDS:
        if kw.upper() in upper:
            return True
    return False


def check_known_5417(normalized: str) -> tuple[str, str] | None:
    """Check if a NAICS 5417 employer is in the known cap-exempt list."""
    for known, classification in KNOWN_CAP_EXEMPT_5417.items():
        if known in normalized or normalized in known:
            return classification
    return None


def main(xlsx_path: str):
    print(f"-- DOL LCA Cap-Exempt Employer Import", file=sys.stderr)
    print(f"-- Source: {xlsx_path}", file=sys.stderr)

    wb = openpyxl.load_workbook(xlsx_path, read_only=True)
    ws = wb.active

    headers = None
    employers: dict[str, dict] = {}  # normalized_name → info

    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            headers = list(row)
            name_idx = headers.index('EMPLOYER_NAME')
            naics_idx = headers.index('NAICS_CODE')
            visa_idx = headers.index('VISA_CLASS')
            status_idx = headers.index('CASE_STATUS')
            state_idx = headers.index('EMPLOYER_STATE')
            continue

        visa = str(row[visa_idx] or '')
        case_status = str(row[status_idx] or '')
        if 'H-1B' not in visa or 'Certified' not in case_status:
            continue

        name = str(row[name_idx] or '').strip()
        if not name:
            continue

        naics = str(row[naics_idx] or '')[:4]
        normalized = normalize_name(name)
        state = str(row[state_idx] or '').strip()

        # Check NAICS-based classification
        classification = None
        if naics in NAICS_CAP_EXEMPT:
            if is_likely_private(name):
                continue  # Skip known private-sector in cap-exempt NAICS
            classification = NAICS_CAP_EXEMPT[naics]
        elif naics == '5417':
            # NAICS 5417 (Scientific R&D) includes both nonprofits and private.
            # Systematic filter: include if name matches nonprofit patterns,
            # exclude if name has private-sector markers.
            classification = check_known_5417(normalized)
            if classification is None:
                # Check name patterns for university-affiliated or research institute
                has_private = is_likely_private(name)
                has_university = any(kw in normalized for kw in [
                    'UNIVERSITY', 'COLLEGE', 'ÉCOLE', 'UNIVERSIDAD'])
                has_lab = any(kw in normalized for kw in [
                    'NATIONAL LABORATORY', 'NATIONAL LAB', 'NATL LAB'])
                has_institute = any(kw in normalized for kw in [
                    'INSTITUTE', 'FOUNDATION', 'CENTER FOR', 'CENTRE FOR',
                    'MEDICAL CENTER', 'HOSPITAL', 'CLINIC'])

                if has_university:
                    classification = ('university', 'likely')
                elif has_lab:
                    classification = ('nonprofit_research', 'likely')
                elif has_institute and not has_private:
                    classification = ('nonprofit_research', 'likely')
                else:
                    continue  # Private sector or ambiguous — skip
        else:
            continue  # Not a cap-exempt NAICS code

        basis, confidence = classification

        if normalized not in employers:
            employers[normalized] = {
                'name': name,           # Original casing
                'basis': basis,
                'confidence': confidence,
                'filings': 0,
                'states': set(),
            }
        employers[normalized]['filings'] += 1
        if state:
            employers[normalized]['states'].add(state)
        # Upgrade confidence if we see more filings
        if confidence == 'confirmed':
            employers[normalized]['confidence'] = 'confirmed'

    wb.close()

    # Filter: require at least 2 filings to reduce noise
    filtered = {k: v for k, v in employers.items() if v['filings'] >= 2}

    print(f"-- Total cap-exempt employers found: {len(employers)}", file=sys.stderr)
    print(f"-- After filtering (≥2 filings): {len(filtered)}", file=sys.stderr)
    by_basis = defaultdict(int)
    for e in filtered.values():
        by_basis[e['basis']] += 1
    for basis, count in sorted(by_basis.items(), key=lambda x: -x[1]):
        print(f"--   {basis}: {count}", file=sys.stderr)

    # Output SQL
    print("-- DOL LCA Cap-Exempt Employer Bulk Import")
    print(f"-- Generated from {xlsx_path}")
    print(f"-- {len(filtered)} employers")
    print()
    print("BEGIN;")
    print()

    for normalized, info in sorted(filtered.items()):
        # Escape single quotes in employer name
        safe_name = info['name'].replace("'", "''")
        print(f"INSERT INTO cap_exempt_employers (employer_name, cap_exempt_basis, confidence_level, source_url, verification_date)")
        print(f"VALUES ('{safe_name}', '{info['basis']}', '{info['confidence']}', 'DOL OFLC LCA FY2026 Q1', CURRENT_DATE)")
        print(f"ON CONFLICT (employer_name) DO UPDATE SET")
        print(f"  confidence_level = CASE")
        print(f"    WHEN cap_exempt_employers.confidence_level = 'confirmed' THEN 'confirmed'")
        print(f"    ELSE EXCLUDED.confidence_level")
        print(f"  END,")
        print(f"  source_url = COALESCE(cap_exempt_employers.source_url, EXCLUDED.source_url),")
        print(f"  verification_date = EXCLUDED.verification_date;")
        print()

    print("COMMIT;")
    print()
    print(f"-- Import complete: {len(filtered)} employers", file=sys.stderr)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 import-lca-employers.py <path-to-lca-xlsx>", file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1])
