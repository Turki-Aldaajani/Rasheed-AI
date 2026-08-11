# Rasheed AI — Entity Relationship Diagram

> **Issue G1 · سكيما Supabase (بوابة)**
>
> This document describes the database schema powering Rasheed AI.
> All diagrams are Mermaid and stay in sync with `supabase/migrations/00001_create_schema.sql`.

## Ownership Model

Every piece of user data traces back to a single authenticated user through this chain:

```
auth.users  ──1:1──▸  public.users  ──1:N──▸  households
                                                  │
                                    ┌─────────────┼─────────────┐
                                    ▼             ▼             ▼
                                  bills    recommendations  simulations
                                    │
                                    ▼
                              bill_readings
```

**Row Level Security** enforces this chain: every query resolves to `auth.uid()` via the household's `user_id` column. Two SECURITY DEFINER helper functions in the **`private` schema** (`private.get_user_household_ids()`, `private.get_user_bill_ids()`) efficiently resolve the ownership chain without nested RLS evaluation. They live in `private` — not the API-exposed `public` schema — so they cannot be called directly via the Data API. Each uses `SET search_path = ''` and fully qualified object references to prevent search_path injection.

**Tariffs** are global reference data with no user ownership — authenticated users can read them, but only administrators (service_role) can modify them.

## ERD

```mermaid
erDiagram
    auth_users {
        uuid id PK
        text email
        text encrypted_password
    }

    users {
        uuid id PK,FK
        text display_name
        text avatar_url
        text locale
        timestamptz created_at
        timestamptz updated_at
    }

    households {
        uuid id PK
        uuid user_id FK
        text city
        text region
        text house_type
        integer residents
        integer ac_units
        timestamptz created_at
        timestamptz updated_at
    }

    bills {
        uuid id PK
        uuid household_id FK
        text bill_type
        numeric amount_sar
        date period_start
        date period_end
        text period_label
        text meter_number
        text invoice_image_url
        timestamptz created_at
    }

    bill_readings {
        uuid id PK
        uuid bill_id FK
        text reading_type
        numeric consumption
        numeric previous_consumption
        numeric previous_amount_sar
        timestamptz created_at
    }

    tariffs {
        uuid id PK
        text utility_type
        text customer_category
        text name
        numeric min_consumption
        numeric max_consumption
        numeric sar_per_unit
        numeric fixed_fee_sar
        date effective_from
        date effective_to
        boolean is_active
        timestamptz created_at
    }

    recommendations {
        uuid id PK
        uuid household_id FK
        uuid bill_id FK
        text category
        text title
        text description
        text detail
        text setting_from
        text setting_to
        numeric estimated_saving_sar
        boolean is_applied
        timestamptz created_at
    }

    simulations {
        uuid id PK
        uuid household_id FK
        uuid bill_id FK
        numeric ac_hours
        numeric ac_temp
        numeric heater_hours
        numeric cooling_kwh
        numeric water_heating_kwh
        numeric baseload_kwh
        numeric total_kwh
        numeric bill_sar
        numeric saving_sar
        numeric saving_percent
        timestamptz created_at
    }

    auth_users        ||--|| users             : "extends (id = id)"
    users             ||--o{ households        : "owns (user_id)"
    households        ||--o{ bills             : "has (household_id)"
    households        ||--o{ recommendations   : "has (household_id)"
    households        ||--o{ simulations       : "has (household_id)"
    bills             ||--o{ bill_readings     : "has (bill_id)"
    bills             ||--o{ recommendations   : "linked (bill_id, optional)"
    bills             ||--o{ simulations       : "linked (bill_id, optional)"
```

## Table Details

### 1. `public.users`

Profile table extending `auth.users`. Linked 1:1 via shared UUID primary key. Does **not** store authentication secrets (email, password) — those live exclusively in `auth.users`.

| RLS | Rule |
|-----|------|
| SELECT | `id = auth.uid()` |
| INSERT | `id = auth.uid()` |
| UPDATE | `id = auth.uid()` (USING + WITH CHECK) |
| DELETE | No policy — cascades from `auth.users` deletion |

### 2. `public.households`

Household profiles. One user can own **multiple** households (1:N). This is the ownership root — bills, recommendations, and simulations all reference a household.

| RLS | Rule |
|-----|------|
| SELECT | `user_id = auth.uid()` |
| INSERT | `user_id = auth.uid()` |
| UPDATE | `user_id = auth.uid()` (USING + WITH CHECK prevents reassignment) |
| DELETE | `user_id = auth.uid()` |

### 3. `public.bills`

Electricity and water bills linked to a household. Supports both utility types via a `bill_type` check constraint.

| RLS | Rule |
|-----|------|
| All ops | `household_id IN (SELECT private.get_user_household_ids())` |

### 4. `public.bill_readings`

Per-bill consumption readings (kWh or m³) with optional previous-period comparison data.

| RLS | Rule |
|-----|------|
| All ops | `bill_id IN (SELECT private.get_user_bill_ids())` |

### 5. `public.tariffs`

Global reference data for tiered utility pricing. Multiple rows represent consumption bands (e.g., 0–2000 kWh @ rate A, 2001+ kWh @ rate B). `max_consumption` is NULL for open-ended top tiers.

**Not user-owned.** Managed by service_role/admin only.

| RLS | Rule |
|-----|------|
| SELECT | `true` (all authenticated users) |
| INSERT/UPDATE/DELETE | No policies — only service_role can modify |

### 6. `public.recommendations`

Personalized saving recommendations per household. Optionally linked to a specific bill.

| RLS | Rule |
|-----|------|
| All ops | `household_id IN (SELECT private.get_user_household_ids())` |

### 7. `public.simulations`

"What-if" simulation result snapshots storing both inputs (ac_hours, ac_temp, heater_hours) and computed outputs.

| RLS | Rule |
|-----|------|
| All ops | `household_id IN (SELECT private.get_user_household_ids())` |

## Indexes

| Table | Index | Columns |
|-------|-------|---------|
| households | `idx_households_user_id` | `user_id` |
| bills | `idx_bills_household_id` | `household_id` |
| bills | `idx_bills_household_type_period` | `household_id, bill_type, period_start` |
| bill_readings | `idx_bill_readings_bill_id` | `bill_id` |
| tariffs | `idx_tariffs_utility_active` | `utility_type, customer_category, is_active` |
| recommendations | `idx_recommendations_household_id` | `household_id` |
| simulations | `idx_simulations_household_id` | `household_id` |

## Helper Functions

| Function | Schema | Purpose | Security |
|----------|--------|---------|----------|
| `handle_updated_at()` | `public` | Auto-sets `updated_at` on row modification (trigger) | INVOKER |
| `get_user_household_ids()` | **`private`** | Returns household UUIDs owned by `auth.uid()` | SECURITY DEFINER, `SET search_path = ''` |
| `get_user_bill_ids()` | **`private`** | Returns bill UUIDs belonging to user's households | SECURITY DEFINER, `SET search_path = ''` |

The SECURITY DEFINER helpers live in the **`private` schema** (not API-exposed) and bypass RLS on intermediate tables to avoid nested policy evaluation. They are used in RLS policies for `bills`, `bill_readings`, `recommendations`, and `simulations`.

**Privilege model:** `EXECUTE` is revoked from `PUBLIC` and `anon`; granted only to `authenticated`. Functions accept no caller-supplied user ID — ownership is always derived from `auth.uid()`.
