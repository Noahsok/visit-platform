# Features

Build log and roadmap. Updated every time we build something.

---

## Status Key

- 🔴 **Not Started**
- 🟡 **In Progress**
- 🟢 **Complete**
- ⚪ **Future** (not building yet)

---

## Drink Bible

| Feature | Status | Notes |
|---------|--------|-------|
| Recipe list view | 🔴 | Filterable by category, searchable |
| Recipe detail view | 🔴 | Full spec, cost breakdown, method |
| Recipe create/edit | 🔴 | Ingredient picker, amounts, method |
| Ingredient management | 🔴 | CRUD, cost tracking, categories |
| Cost per drink calculation | 🔴 | Auto-calculated from recipe × ingredient costs |
| Batch recipe management | 🔴 | Recipes that produce house-made ingredients |
| Batch tracker (plan/start/complete) | 🔴 | "Mark as made" workflow |
| Ice tracker | 🔴 | Specialized batch tracking for ice program |
| Inventory levels | 🔴 | Per-venue stock view |
| Par level alerts | 🔴 | "What needs to be made/ordered" |
| Batch → inventory auto-update | 🔴 | Completing a batch updates stock |

## P&L Engine

| Feature | Status | Notes |
|---------|--------|-------|
| Square revenue sync | 🔴 | Pull transactions, categorize |
| COGS calculation | 🔴 | Recipes sold × cost per drink |
| Artist compensation calc | 🔴 | Presence-based split (10%/2%) |
| Manual expense entry | 🔴 | Rent, utilities, labor, etc. |
| P&L dashboard | 🔴 | Period view with breakdowns |
| Period comparison | 🔴 | Week over week, month over month |
| Export to spreadsheet | 🔴 | For accountant/bookkeeper |

## Member Check-In

| Feature | Status | Notes |
|---------|--------|-------|
| Member search | 🔴 | By name, with Square sync |
| Check-in flow | 🔴 | Tier display, guest count |
| Guest allowance enforcement | 🔴 | Per tier limits |
| QR self-check-in | 🔴 | Member-facing |
| Visit history | 🔴 | Per member attendance log |

## Venue Management

| Feature | Status | Notes |
|---------|--------|-------|
| Venue CRUD | 🔴 | Create/configure locations |
| Venue selector | 🔴 | Switch between locations |
| Square integration setup | 🔴 | Connect Square location per venue |

## Infrastructure

| Feature | Status | Notes |
|---------|--------|-------|
| Database schema (Prisma) | 🔴 | All tables from data-models.md |
| Authentication | 🔴 | Login, session management |
| User roles & venue access | 🔴 | Owner, manager, bartender, door — scoped per venue |
| Shared UI component library | 🔴 | Buttons, cards, modals, inputs |
| Mobile-responsive layouts | 🔴 | iPad, phone, laptop support |
| Deployment pipeline | 🔴 | TBD |

## Tip Tracking

| Feature | Status | Notes |
|---------|--------|-------|
| Nightly tip entry | 🔴 | Cash + credit per staff member |
| Tip-out tracking | 🔴 | Given/received amounts |
| Tip history per staff | 🔴 | View past earnings |
| Square credit tip sync | 🔴 | Pull tip data from Square if possible |

---

## Build Log

_Each entry records what was built, which files were created/modified, and any decisions made._

### Session 1 — [Date TBD]
**What:** Project scaffolding and documentation
**Files:**
- `README.md` — Project overview
- `docs/data-models.md` — All entity schemas
- `docs/architecture.md` — System design, folder structure, data flow
- `docs/features.md` — This file

**Decisions:**
- Multi-venue from day one via `venue_id` on everything
- Recipes are global by default, venue-specific by override (Bushwick menu TBD)
- Next.js App Router with `[venue]` dynamic route
- Prisma for database ORM
- Components organized by feature domain, not by type
- House-made ingredient costs are calculated, never manually set
- Artist compensation calculated nightly from presence + revenue, not flat fee
- Ingredient categories: `spirit, modifier, syrup, bitter, garnish, juice, dairy, ice, other` — cordials, oleos, etc. all live under `syrup`
- Campari = modifier, Ango/Orange bitters = bitter (matches Visit's mental model)
- Users/Auth and Tip tracking are v1 (not deferred)
- User roles: owner, manager, bartender, door — role is global, venue access is per-user
