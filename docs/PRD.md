# Clearout AI PRD

> Draft. Written before any formal customer interviews, using Dario's own
> assumptions per his call to move fast on 2026-07-08, then substantially
> revised on 2026-07-13 after dropping the waitlist-first approach in
> favor of building the real product. Sections marked **(assumption)** are
> the ones to revisit first once real users show up.

## Problem

People decluttering, downsizing, or moving end up with a pile of items to
sell, but writing a decent listing (photo, title, description, condition,
price) for each one is repetitive and slow — and pricing it right is its
own separate problem, since guessing too high means it never sells and
guessing too low leaves money on the table. A lot of usable stuff either
never gets listed, or gets listed with a lazy description and a
guessed-at price.

## Solution

Sign in, organize items into projects (Bedroom, Garage, an apartment
you're clearing out), and upload a photo of an item. AI (Gemini Vision)
extracts its name, category, condition, brand, and other identifying
details. The user confirms or adds details AI can't see from a photo
(age, defects, accessories, original price), decides whether to keep,
sell, donate, or trash it, and — for anything marked "sell" — gets a
market-grounded price recommendation (not just an AI guess) along with a
copy-ready listing to paste into Facebook Marketplace, eBay, or
Craigslist.

## Target User (assumption)

- Age 25-55
- Currently moving, downsizing, or clearing out a household
- Has somewhere between 20 and 100+ items to deal with and no patience to
  write individual listings, let alone research fair prices, for each one

## MVP Features

- Email/password sign-in, protected dashboard
- Projects (Bedroom, Garage, etc.) to organize items — a default project
  is created automatically on signup
- Upload a photo → AI extracts item details (name, category, condition,
  brand, and other visible attributes)
- Confirm/edit details AI can't see from a photo (age, defects,
  accessories, original price, working status)
- Keep / sell / donate / trash decision per item
- For items marked "sell": a seller-preferences form (selling goal,
  urgency, negotiable, OBO or firm, private minimum price, pickup/delivery,
  etc.) and a comp-grounded price recommendation (quick-sale price,
  expected range, recommended price, confidence level) — see
  `ARCHITECTURE.md` for how pricing actually works and what data it
  realistically has access to
- AI-generated listing title + description, with an explicit "Regenerate"
  button once fields are edited
- Copy-to-clipboard + deep link to Facebook Marketplace's, eBay's, and
  Craigslist's own listing-creation pages

## Explicitly Not in MVP

- Google OAuth (email/password only for now)
- Multiple photos per item (schema supports it; UI is single-photo for v1)
- Real marketplace auto-posting APIs (Facebook Marketplace has none
  available; Craigslist's ToS prohibits automation; eBay's requires a
  restricted partner application) — v1 is copy + deep link, not
  auto-posting
- eBay sold/completed-listing comps (requires eBay's restricted
  Marketplace Insights API — apply once there's traction to point to)
- CSV export
- Mobile app
- Any paid tier (see `product-management.md` for future monetization
  thinking — none of it is built yet)

## Success Criteria (assumption)

- 10 items uploaded and priced by Dario himself across a few real
  household categories, as the first real test of whether the
  extraction + pricing pipeline produces usable output
- 5+ items actually listed on a real marketplace using the generated
  copy
- Qualitative: does the recommended price feel directionally right
  compared to manually checking comps?

Revisit these once there's more than one user — they're placeholders for
proving the core loop works, not growth targets.

## Timeline

- Infra: Supabase + Gemini + eBay Developer accounts set up
- Auth + dashboard shell
- Projects
- Upload + AI extraction
- Seller preferences + pricing engine
- Listing generation
- Marketplace linking
- Profile + polish

See `.claude/plans/` (or ask Claude) for the current build order and
what's done so far — this PRD describes what the product is, not which
milestone is in progress.
