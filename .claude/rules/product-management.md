# Product Management Rules — Clearout AI

## What You're Learning

Product Management = defining WHAT to build and WHY, before you build it.

A PM answers:
- **What problem are we solving?** (User research, interviews)
- **Who has this problem?** (Target customer)
- **How do we know they want it?** (Validation)
- **What's the simplest version that solves it?** (MVP)
- **How do we measure success?** (Metrics)

## MVP: Minimum Viable Product

**MVP** = smallest version that solves the core problem and validates your hypothesis.

NOT: "Fully featured app with all bells and whistles"
YES: "Simplest thing that shows whether users will use it"

### Clearout AI MVP

**Must have:**
- Email/password sign-in, protected dashboard
- Projects to organize items (default project auto-created on signup)
- Upload photo → AI extracts item details
- Confirm/edit details AI can't see (age, defects, accessories, original
  price)
- Keep / sell / donate / trash decision per item
- Seller preferences + comp-grounded price recommendation for items
  marked "sell"
- AI-generated listing with an explicit "Regenerate" button
- Copy-to-clipboard + deep link to Facebook Marketplace, eBay, Craigslist

**NOT in MVP:**
- Google OAuth (email/password only)
- Multiple photos per item
- Real marketplace auto-posting APIs (none are realistically available —
  see `ARCHITECTURE.md`)
- CSV export
- Mobile app
- Any paid tier

(Revised 2026-07-13 after dropping the original waitlist-first plan — see
`docs/PRD.md` for the full current picture.)

## PRD: Product Requirements Document

A PRD defines what you're building — structured as Problem, Solution,
Target User, MVP Features, Explicitly Not in MVP, Success Criteria, and
Timeline.

Clearout AI's actual current PRD lives at `docs/PRD.md` — read that for
the real, up-to-date version instead of a stale copy here.

## Customer Research

Before you build, talk to 5 people who have the problem.

**Script:**
```
Hi [name], I'm building an app to help people list household items
for sale more quickly. Have you ever tried selling items on Marketplace
or eBay?

(Listen)

What was hardest about it?
How long did it take?
Would you use an app that cut that time in half?
```

**Document:**
- Name, age, context
- Problem they experienced
- How they solved it
- Likelihood to use your app (1-10)

## Metrics to Track

Every week, log:
- Signups
- Active users (people who actually used the app)
- Items processed
- User satisfaction (rating/NPS)
- Key feedback

## Weekly PM Workflow

**Monday:** Review last week's metrics + feedback. Decide what to build.
**Tuesday–Thursday:** Build feature + gather user feedback.
**Friday:** Plan next week based on learnings.

## Future Monetization Ideas (not built, noted for later)

Discussed 2026-07-13 while deciding photo/listing scope. Core listing
quality (photos, listing regeneration) should stay free — gating it would
make the free tier feel deliberately broken, which drives churn instead
of upgrades. Better premium levers, if it ever comes to that:

- **Item/month volume caps** — scales with actual usage, not with a
  feature that's core to listing quality.
- **Listing regeneration caps** (e.g. 1 free regen/item, unlimited paid)
  — ties the paywall to real marginal cost (Gemini calls).
- **Real eBay auto-posting** (actual API integration instead of copy +
  deep link) — genuinely more expensive to build (developer partnership,
  OAuth), delivers a real step-change in time saved.
- **Bulk/batch upload** — power-user behavior, real infra cost (this is
  where the deferred async-worker architecture would actually earn its
  keep), doesn't cripple a casual user doing a handful of items.

## Recruiting Signal

When recruiters see PM skills, they're impressed by:
- User research (you talked to customers)
- Clear PRD (you wrote down what you're building)
- Metrics tracking (users, engagement, not just features)
- Iteration (ship → feedback → improve)
- Tradeoff decisions (MVP vs. nice-to-have)
