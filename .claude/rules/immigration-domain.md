---
paths:
  - src/components/immigration/**
  - src/lib/immigration/**
  - src/db/**/immigration*
description: Immigration data accuracy rules for Immigration HQ features
---

# Immigration Domain Rules

- Unemployment day calculations: 150 total allowed (90 OPT + 60 STEM),
  paused when employed 20+ hrs/week at E-Verify employer, resumed when unemployed.
- STEM OPT expiration is a fixed date that never changes regardless of employment.
- Cap-exempt employers: universities, nonprofit research orgs, government research
  orgs, nonprofits affiliated with universities. All can sponsor H1-B year-round.
- EB-2 China backlog: priority dates move unpredictably. Never display estimated wait
  as a precise date — always show as a range (e.g., "estimated 3-7 years").
- Visa bulletin data changes monthly. Display "as of [month/year]" with every cutoff.
- Always include disclaimer: "This is not immigration legal advice."
