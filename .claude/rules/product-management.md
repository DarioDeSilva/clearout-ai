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
- Landing page + email waitlist
- Upload photo → AI extracts metadata
- Edit extracted data
- Copy listing text to clipboard

**NOT in MVP:**
- Authentication
- CSV export
- Marketplace integration
- Mobile app

## PRD: Product Requirements Document

A PRD defines what you're building.

```markdown
# Clearout AI PRD

## Problem
Users spend 2+ hours manually listing 100 items for sale.

## Solution
Upload photo → AI generates title/description → copy to marketplace

## Target User
- Age: 25–55
- Motivation: Moving, downsizing, decluttering
- Pain: Time-consuming manual listing

## MVP Features
- Landing page
- Email waitlist
- Photo upload
- AI item extraction
- Edit extracted data
- Copy listing to clipboard

## Success Criteria
- 50 waitlist signups
- 10 beta users
- 5+ items per user on average
- 4+ star rating

## Timeline
Week 1: Landing page
Week 2: Photo upload + Gemini integration
Week 3: Edit UI + polish
```

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

## Recruiting Signal

When recruiters see PM skills, they're impressed by:
- User research (you talked to customers)
- Clear PRD (you wrote down what you're building)
- Metrics tracking (users, engagement, not just features)
- Iteration (ship → feedback → improve)
- Tradeoff decisions (MVP vs. nice-to-have)
