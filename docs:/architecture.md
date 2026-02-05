# Architecture

How the Visit platform is designed and why.

---

## Design Principles

1. **Venue-scoped everything.** All data queries filter by venue. No global views unless explicitly built for multi-venue owners.
2. **Recipes are the source of truth for costs.** Every cost calculation traces back to recipe specs × ingredient costs. If the numbers are wrong, fix the recipe or the ingredient cost — never override the math.
3. **Square is the source of truth for revenue.** We sync from Square, never duplicate entry. Manual overrides only for corrections.
4. **Components over pages.** UI is built from composable components that can be rearranged per context (iPad at the bar vs phone at the door vs laptop for owner).
5. **Document as you build.** Every feature gets a docs entry. Future sessions start by reading docs.

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                   Next.js App                    │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Drink   │  │   P&L    │  │ Check-In │      │
│  │  Bible   │  │ Dashboard│  │  System  │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │              │              │             │
│  ┌────┴──────────────┴──────────────┴──────┐    │
│  │         Shared Component Library         │    │
│  │    (ui primitives, layouts, patterns)    │    │
│  └────┬──────────────┬──────────────┬──────┘    │
│       │              │              │             │
│  ┌────┴──────────────┴──────────────┴──────┐    │
│  │           Business Logic Layer           │    │
│  │   (cost calc, P&L assembly, comp math)  │    │
│  └────┬──────────────┬──────────────────────┘    │
│       │              │                           │
│  ┌────┴─────┐  ┌────┴─────┐                     │
│  │ Database │  │ Square   │                      │
│  │ (Prisma) │  │   API    │                      │
│  └──────────┘  └──────────┘                      │
└─────────────────────────────────────────────────┘
```

---

## Folder Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (nav, venue selector)
│   ├── page.tsx                  # Landing / venue dashboard
│   ├── [venue]/                  # Venue-scoped routes
│   │   ├── layout.tsx            # Venue context provider
│   │   ├── recipes/              # Drink Bible pages
│   │   │   ├── page.tsx          # Recipe list
│   │   │   ├── [id]/page.tsx     # Single recipe view
│   │   │   └── new/page.tsx      # Create recipe
│   │   ├── inventory/            # Inventory pages
│   │   │   ├── page.tsx          # Stock levels
│   │   │   └── batches/page.tsx  # Batch tracker
│   │   ├── pnl/                  # P&L pages
│   │   │   ├── page.tsx          # P&L dashboard
│   │   │   └── [period]/page.tsx # Specific period report
│   │   ├── check-in/             # Door management
│   │   │   └── page.tsx          # Check-in interface
│   │   └── settings/             # Venue settings
│   │       └── page.tsx
│   └── api/                      # API routes
│       ├── recipes/
│       ├── ingredients/
│       ├── batches/
│       ├── inventory/
│       ├── pnl/
│       ├── members/
│       └── square/               # Square webhook + sync endpoints
│
├── components/
│   ├── ui/                       # Design system primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Table.tsx
│   │   ├── Badge.tsx
│   │   └── StatusIndicator.tsx
│   ├── drink-bible/              # Drink Bible feature components
│   │   ├── RecipeCard.tsx
│   │   ├── RecipeDetail.tsx
│   │   ├── RecipeForm.tsx
│   │   ├── IngredientList.tsx
│   │   ├── IngredientForm.tsx
│   │   ├── BatchTracker.tsx
│   │   ├── BatchForm.tsx
│   │   ├── IceTracker.tsx
│   │   ├── CostBreakdown.tsx
│   │   └── InventoryGrid.tsx
│   ├── pnl/                      # P&L feature components
│   │   ├── PnlDashboard.tsx
│   │   ├── RevenueBreakdown.tsx
│   │   ├── CostBreakdown.tsx
│   │   ├── ArtistCompensation.tsx
│   │   ├── PeriodSelector.tsx
│   │   └── PnlLineItem.tsx
│   ├── check-in/                 # Check-in feature components
│   │   ├── MemberSearch.tsx
│   │   ├── CheckInCard.tsx
│   │   ├── GuestCounter.tsx
│   │   └── QrScanner.tsx
│   └── layout/                   # Shared layout components
│       ├── VenueSelector.tsx
│       ├── Navigation.tsx
│       └── PageHeader.tsx
│
├── lib/
│   ├── db/
│   │   ├── client.ts             # Prisma client singleton
│   │   └── queries/              # Typed query functions
│   │       ├── recipes.ts
│   │       ├── ingredients.ts
│   │       ├── batches.ts
│   │       ├── inventory.ts
│   │       ├── pnl.ts
│   │       └── members.ts
│   ├── square/
│   │   ├── client.ts             # Square SDK setup
│   │   ├── sync.ts               # Data sync logic
│   │   └── transforms.ts         # Square data → our schema
│   ├── calculations/
│   │   ├── drink-cost.ts         # Recipe cost calculation
│   │   ├── pnl-assembly.ts       # P&L report generation
│   │   ├── artist-compensation.ts # Artist pay math
│   │   └── inventory-deduction.ts # Sales → inventory updates
│   └── utils/
│       ├── currency.ts           # Money formatting
│       ├── dates.ts              # Date helpers
│       └── units.ts              # Unit conversion
│
└── types/
    ├── venue.ts
    ├── recipe.ts
    ├── ingredient.ts
    ├── batch.ts
    ├── inventory.ts
    ├── pnl.ts
    ├── member.ts
    ├── artist.ts
    └── square.ts
```

---

## Data Flow: How Things Connect

### Recipe → Cost → P&L Pipeline

```
1. Ingredient costs are set (manual or calculated from bottle price)
2. Recipe links ingredients with amounts
3. Cost per drink = sum of (ingredient cost × amount)
4. Square reports drinks sold per night
5. COGS = sum of (drinks sold × cost per drink)
6. COGS feeds into P&L as expense line
```

### Batch → Inventory Pipeline

```
1. Staff sees a batch is needed (ice tracker, low inventory alert)
2. Creates/starts a batch from the batch recipe
3. Marks batch as completed with actual yield
4. Inventory for that ingredient at that venue is updated
5. House-made ingredient cost recalculates from batch inputs
```

### Square → P&L Pipeline

```
1. Nightly sync pulls transactions from Square API
2. Transactions are categorized (cocktails, beer, wine, food, etc.)
3. Revenue line items created per category
4. Combined with calculated COGS and expenses
5. P&L report assembled for any date range
```

### Artist Compensation Pipeline

```
1. Exhibition is created (artist, venue, dates)
2. Each operating night, presence is logged (present/absent)
3. Night's bar revenue comes from Square sync
4. Compensation = revenue × (10% if present, 2% if absent)
5. Total owed = sum across all nights in exhibition
6. Shows up as expense line in P&L
```

---

## Multi-Venue Strategy

- URL structure: `/newburgh/recipes`, `/bushwick/pnl`
- Venue context provided via layout at `[venue]` route level
- All API calls include `venue_id`
- Recipes default to shared; can be overridden per venue
- Owner view can see cross-venue summaries

---

## Device Strategy

The app needs to work on:
- **iPad at the bar** — Batch tracker, ice tracker, recipe lookup
- **Phone at the door** — Member check-in, QR scanning
- **Laptop for owner** — P&L dashboard, recipe management, full admin

All same codebase, responsive components, with role-based visibility where needed.
