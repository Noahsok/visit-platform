# Data Models

All schemas for the Visit platform. This is the source of truth for how data relates across the system.

---

## Core Principle

**Everything connects to a venue.** Inventory is per-venue. Sales are per-venue. P&L is per-venue. Recipes can be shared or venue-specific. This is what makes multi-location (and future portability) work.

---

## Entity Relationship Overview

```
Venue
 ├── Inventory (per venue)
 ├── Sales/Transactions (per venue, from Square)
 ├── P&L Reports (per venue)
 ├── Members (can span venues)
 ├── Artists/Exhibitions (per venue)
 │
 └── Recipes ←→ Ingredients (many-to-many)
      │              │
      │              └── Inventory tracking
      │
      ├── Batches (house-made production)
      └── Cost calculations → P&L
```

---

## Venues

The top-level entity. Every location is a venue.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `name` | string | Display name (e.g., "Visit Newburgh") |
| `slug` | string | URL-safe identifier (e.g., "newburgh") |
| `address` | string | Physical address |
| `square_location_id` | string | Square POS location ID for API integration |
| `timezone` | string | For correct date handling on reports |
| `is_active` | boolean | Soft disable for locations |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Notes:**
- Square uses `location_id` to scope API calls. Each venue maps to one Square location.
- `slug` is used in URLs: `/newburgh/pnl`, `/bushwick/recipes`

---

## Ingredients

The building blocks. Spirits, modifiers, garnishes, house-made syrups, bitters, etc.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `name` | string | Display name (e.g., "Demerara Syrup", "Rittenhouse Rye") |
| `category` | enum | `spirit`, `modifier`, `syrup`, `bitter`, `garnish`, `juice`, `dairy`, `ice`, `other` |
| `subcategory` | string? | Optional finer grouping (e.g., "bourbon", "amaro") |
| `is_house_made` | boolean | If true, this ingredient has a batch recipe |
| `unit_of_measure` | enum | `oz`, `ml`, `dash`, `piece`, `barspoon`, `drop`, `whole` |
| `cost_per_unit` | decimal | Cost per unit of measure — for purchased ingredients |
| `bottle_size_oz` | decimal? | For spirits/bottles: size in oz for cost-per-oz calculation |
| `bottle_cost` | decimal? | For spirits/bottles: purchase price per bottle |
| `supplier` | string? | Where we buy it |
| `notes` | string? | Prep notes, storage, shelf life |
| `is_active` | boolean | Soft delete — don't show in recipe builder but keep history |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Notes:**
- `cost_per_unit` is calculated from `bottle_cost / bottle_size_oz` for spirits. For house-made ingredients, it's calculated from the batch recipe cost.
- Ingredients are **global** (shared across venues). A bottle of Rittenhouse is the same everywhere. Inventory quantities are per-venue (see Inventory table).

### Calculated Field: House-Made Cost

For house-made ingredients (`is_house_made = true`), `cost_per_unit` is derived:

```
cost_per_unit = total cost of batch recipe ingredients / yield in units
```

This updates whenever the batch recipe or input ingredient costs change.

---

## Recipes

A drink on the menu. Has a list of ingredients with specific amounts.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `name` | string | Drink name (e.g., "Paper Plane") |
| `category` | enum | `cocktail`, `mocktail`, `shot`, `beer`, `wine`, `batch_recipe` |
| `subcategory` | string? | e.g., "stirred", "shaken", "highball" |
| `method` | string? | Preparation method/instructions |
| `glassware` | string? | Glass type |
| `garnish_description` | string? | How to garnish (separate from garnish as ingredient for costing) |
| `menu_price` | decimal | What we sell it for |
| `is_menu_active` | boolean | Currently on the menu |
| `venue_id` | uuid? | NULL = shared across all venues, set = venue-specific |
| `image_url` | string? | Photo |
| `notes` | string? | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Notes:**
- `venue_id = NULL` means the recipe is available at all venues (most drinks). Venue-specific recipes override or supplement the shared menu.
- `category = batch_recipe` is for house-made ingredients (syrups, infusions, etc.) — these are recipes that *produce* an ingredient rather than a menu drink.

### Calculated Fields

```
cost_per_drink = sum of (ingredient.cost_per_unit × recipe_ingredient.amount) for all ingredients
margin = (menu_price - cost_per_drink) / menu_price
```

---

## Recipe Ingredients (Join Table)

Links recipes to ingredients with specific amounts.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `recipe_id` | uuid | FK → Recipes |
| `ingredient_id` | uuid | FK → Ingredients |
| `amount` | decimal | How much of this ingredient |
| `unit` | enum | Unit for this usage (may differ from ingredient's base unit) |
| `is_optional` | boolean | Optional ingredient (e.g., "absinthe rinse") |
| `sort_order` | integer | Display order in recipe |

---

## Batches

Production tracking for house-made ingredients. When staff makes a batch of demerara syrup, this tracks it.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `recipe_id` | uuid | FK → Recipes (the batch recipe) |
| `ingredient_id` | uuid | FK → Ingredients (what this batch produces) |
| `venue_id` | uuid | FK → Venues (where it was made) |
| `status` | enum | `planned`, `in_progress`, `completed` |
| `yield_amount` | decimal | How much was produced |
| `yield_unit` | enum | Unit of the yield |
| `batch_cost` | decimal | Total cost of inputs for this batch (calculated) |
| `made_by` | string? | Staff member who made it |
| `notes` | string? | Any issues, adjustments |
| `planned_date` | date? | When it should be made |
| `completed_at` | timestamp? | When it was actually completed |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Notes:**
- When a batch is marked `completed`, it should add to the venue's inventory for that ingredient.
- `batch_cost` is calculated from the batch recipe's ingredients at current costs.
- This is the "mark as made" flow: planned → in_progress → completed → inventory updated.

---

## Inventory

Per-venue stock levels. Tracks what's on hand at each location.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `venue_id` | uuid | FK → Venues |
| `ingredient_id` | uuid | FK → Ingredients |
| `quantity_on_hand` | decimal | Current stock level |
| `unit` | enum | Unit of measure |
| `par_level` | decimal? | Minimum desired stock (for reorder alerts) |
| `last_counted_at` | timestamp? | Last physical inventory count |
| `updated_at` | timestamp | |

**Notes:**
- Updated by: batch completion (adds), manual counts (sets), and optionally by sales deduction (subtracts based on recipes sold).
- Par levels enable a "what needs to be made/ordered" view.

---

## Artists

Artists who exhibit at Visit. Tied to the compensation model.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `name` | string | Artist name |
| `email` | string? | Contact |
| `payment_info` | string? | How they get paid (Venmo, check, etc.) |
| `notes` | string? | |
| `created_at` | timestamp | |

---

## Exhibitions

An artist's show at a specific venue for a specific time period.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `artist_id` | uuid | FK → Artists |
| `venue_id` | uuid | FK → Venues |
| `title` | string | Exhibition name |
| `start_date` | date | Opening date |
| `end_date` | date | Closing date |
| `is_active` | boolean | Currently showing |
| `created_at` | timestamp | |

---

## Artist Presence

Tracks which nights an artist was physically present. This drives the compensation split.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `exhibition_id` | uuid | FK → Exhibitions |
| `date` | date | The specific date |
| `was_present` | boolean | Was the artist there |
| `notes` | string? | |

**Compensation Logic:**
```
For each operating night during an exhibition:
  if artist was present: artist gets 10% of that night's bar revenue
  if artist was absent:  artist gets 2% of that night's bar revenue
```

---

## Members

Membership management. Syncs with Square customer data.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `square_customer_id` | string | FK to Square's customer system |
| `name` | string | Display name |
| `email` | string? | |
| `phone` | string? | |
| `tier` | enum | `classic`, `enthusiast` |
| `is_active` | boolean | Current member |
| `guest_allowance` | integer | How many guests per visit (tier-based default, can override) |
| `notes` | string? | |
| `joined_at` | date | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Tier Defaults:**
- Classic: 1 guest
- Enthusiast: 2 guests (plus other perks TBD)

---

## Check-Ins

Log of member visits. Used for door management and attendance analytics.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `member_id` | uuid | FK → Members |
| `venue_id` | uuid | FK → Venues |
| `checked_in_at` | timestamp | When they arrived |
| `guest_count` | integer | How many guests they brought |
| `checked_in_by` | string? | Staff member or "self" for QR |
| `notes` | string? | |

---

## P&L Line Items

The financial layer. Combines Square sales data with recipe costs, artist compensation, and operational expenses.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `venue_id` | uuid | FK → Venues |
| `period_start` | date | Start of reporting period |
| `period_end` | date | End of reporting period |
| `category` | enum | `revenue`, `cogs`, `artist_compensation`, `labor`, `rent`, `utilities`, `supplies`, `marketing`, `other_expense` |
| `subcategory` | string? | Finer detail (e.g., "cocktail_sales", "beer_sales", "food_sales") |
| `description` | string | Human-readable description |
| `amount` | decimal | Dollar amount (positive for revenue, negative for expenses) |
| `source` | enum | `square_sync`, `calculated`, `manual` |
| `source_reference` | string? | Square transaction IDs, calculation method, etc. |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Notes:**
- Revenue lines are pulled from Square API (synced daily or on-demand).
- COGS is calculated: drinks sold × cost per drink from recipe data.
- Artist compensation is calculated from exhibitions + presence + nightly revenue.
- Some expenses are manual entry (rent, utilities) until we have more integrations.

### P&L Report Assembly

A P&L report for a venue + period is assembled by querying all line items:

```
Revenue
  - Cocktail Sales (from Square)
  - Beer/Wine Sales (from Square)
  - Other Revenue

- Cost of Goods Sold
  - Drink Costs (calculated from recipes × units sold)
  - Garnish/Supplies

= Gross Profit

- Operating Expenses
  - Artist Compensation (calculated from presence model)
  - Labor
  - Rent
  - Utilities
  - Supplies
  - Marketing

= Net Profit
```

---

## Square Sync Log

Tracks data pulls from Square to avoid duplicates and enable debugging.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `venue_id` | uuid | FK → Venues |
| `sync_type` | enum | `transactions`, `customers`, `catalog` |
| `period_start` | timestamp | What time range was synced |
| `period_end` | timestamp | |
| `records_synced` | integer | How many records |
| `status` | enum | `success`, `partial`, `failed` |
| `error_message` | string? | If failed |
| `synced_at` | timestamp | |

---

## Users

Staff accounts with role-based access. Controls who can do what at which venue.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `name` | string | Display name |
| `email` | string | Login email (unique) |
| `role` | enum | `owner`, `manager`, `bartender`, `door` |
| `is_active` | boolean | Soft disable for former staff |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

## User Venue Access (Join Table)

Which venues a user can access. An owner sees all; a bartender might only work one location.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → Users |
| `venue_id` | uuid | FK → Venues |

**Role Permissions:**
- `owner` — Full access to everything across all venues
- `manager` — Full access within assigned venues (recipes, inventory, P&L, check-in, tips)
- `bartender` — Recipe lookup, batch tracking, inventory updates, tip entry at assigned venues
- `door` — Check-in system only at assigned venues

**Notes:**
- Owner role bypasses venue access table (sees everything)
- Roles are global to the user, not per-venue. A person is a bartender everywhere they work, not a bartender at one venue and manager at another. If this needs to change later, we move `role` into the join table.

---

## Tips

Nightly tip tracking per staff member per venue.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `venue_id` | uuid | FK → Venues |
| `user_id` | uuid | FK → Users (the staff member) |
| `date` | date | The shift date |
| `cash_tips` | decimal | Cash tips received |
| `credit_tips` | decimal | Credit card tips (from Square) |
| `tip_out_given` | decimal | Amount tipped out to support staff |
| `tip_out_received` | decimal | Amount received as tip-out (for support staff) |
| `net_tips` | decimal | Calculated: cash + credit - tip_out_given + tip_out_received |
| `entered_by` | uuid? | FK → Users (who entered this record) |
| `notes` | string? | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Notes:**
- `credit_tips` can potentially be synced from Square, but may need manual entry depending on how Square breaks out tips per employee.
- `net_tips` is a calculated field for convenience.
- Tip-out structure (who tips out whom, what percentage) will vary — keeping it as raw amounts for now rather than trying to automate the split logic. Can revisit if there's a consistent formula.
- Tips also feed into labor cost tracking in P&L.

---

## What's Not Modeled Yet

Things we know we'll need but aren't building yet:

- **Music Programming** — DJ schedules, playlists, event calendar
- **Art Sales** — Payment plans, collector management, sales tracking
- **Purchase Orders** — Ordering from suppliers, receiving inventory
- **Waste/Spillage Tracking** — For inventory accuracy

These will get their own schemas when we build them.
