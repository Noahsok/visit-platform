# Visit — Operations Platform

A multi-location operations platform for **Visit**, a contemporary art gallery and cocktail bar. Built to manage recipes, inventory, batch production, cost tracking, P&L automation, member check-ins, and artist compensation across venues.

## What Visit Is

Visit combines contemporary art exhibitions, high-end cocktails, and curated music programming. The business runs on a membership model (Classic and Enthusiast tiers) with a unique artist compensation structure tied to bar revenue.

Currently operating in **Newburgh, NY** with a second location planned for **Bushwick, Brooklyn**.

## What This Platform Does

Two core systems that feed into each other:

1. **Drink Bible** — Recipe management, ingredient inventory, batch tracking for house-made ingredients, cost-per-drink calculations
2. **P&L Engine** — Automated profit & loss reporting pulling from Square POS sales data, recipe costs, artist compensation, and operational expenses

Supporting systems:
- **Member Check-In** — Tier-based door management with guest privileges, integrated with Square customer data
- **Venue Management** — Multi-location configuration, per-venue settings

## Tech Stack

- **Framework:** Next.js (App Router)
- **Database:** PostgreSQL
- **POS Integration:** Square API
- **Auth:** TBD (needs multi-venue role support)
- **Deployment:** TBD

## Project Structure

```
visit-app/
├── README.md
├── docs/
│   ├── architecture.md      # System design, folder structure, data flow
│   ├── data-models.md       # All schemas with field descriptions
│   └── features.md          # Feature log — what's built, what's planned
├── src/
│   ├── app/                  # Next.js app router pages
│   ├── components/           # Shared UI component library
│   │   ├── ui/               # Primitives (buttons, cards, modals, inputs)
│   │   ├── drink-bible/      # Recipe, batch, inventory components
│   │   ├── pnl/              # P&L dashboard components
│   │   ├── check-in/         # Member check-in components
│   │   └── venue/            # Venue management components
│   ├── lib/                  # Business logic, utilities, API helpers
│   │   ├── db/               # Database client, migrations, queries
│   │   ├── square/           # Square API integration layer
│   │   └── calculations/     # Cost, P&L, compensation math
│   └── types/                # TypeScript type definitions
├── prisma/                   # Database schema and migrations
└── public/                   # Static assets
```

## Multi-Location Design

Every data entity ties back to a `venue_id`. Recipes can be shared across venues or venue-specific. Inventory, sales, and P&L are always per-venue. This supports Newburgh + Bushwick now, and makes the platform portable to other hospitality businesses in the future.

## Getting Started

_TBD — will be updated as we build_

## Docs

- [Architecture](docs/architecture.md) — How the system is designed
- [Data Models](docs/data-models.md) — Every table and relationship
- [Features](docs/features.md) — Build log and roadmap
