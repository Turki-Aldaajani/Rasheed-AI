# Rasheed AI - Demo Scenario (Issue #30)

## Overview
This document outlines the official step-by-step presentation scenario for Rasheed AI. This demo is designed to be reliable and can be run completely offline, as it uses embedded mock data instead of live APIs (which are pending in future issues).

## Pre-Demo Checklist
- [ ] Application builds successfully (`npm run build`).
- [ ] Development server is running (`npm run dev`).
- [ ] Browser is opened to `http://localhost:3000`.
- [ ] (Optional) Sample bill images are available on the desktop for the drag-and-drop step (e.g. `public/demo/electricity-normal.svg`, `public/demo/electricity-high.svg`, or `public/demo/water.svg`). If not, the UI provides a fallback button.

## Presenter Script & Scenario Flow

### 1. Landing Page
- **Presenter says:** "Welcome to Rasheed AI. Our goal is to help households understand their utility bills and provide actionable insights to save money."
- **Action:** Open the home page (`/`).
- **Result:** The user sees the main landing page. Click the primary call-to-action button to start (e.g., "ابدأ الآن").

### 2. Upload Screen
- **Presenter says:** "Users can easily upload their electricity or water bills. For this demo, we'll use a sample bill."
- **Action:** 
  - *Option A:* Drag and drop a sample bill into the dropzone. You can use:
    - `public/demo/electricity-normal.svg` for a standard electricity demo.
    - `public/demo/electricity-high.svg` to show extreme consumption alerts.
    - `public/demo/water.svg` for a water bill demo.
  - *Option B (Fallback):* Click the "استخدم فاتورة تجريبية" (Use demo bill) button.
- **Result:** The application transitions to the "Analyzing" screen.

### 3. Analyzing State
- **Presenter says:** "In the background, Rasheed uses AI vision to extract data from the bill and analyzes the consumption patterns."
- **Action:** Just wait (the screen is automatic).
- **Result:** After a brief simulated delay, the app automatically routes to the Dashboard Overview.
- *Note for Presenter:* Do not claim the AI is actually running live OCR in this specific offline demo prototype. It is a simulation of the intended UX.

### 4. Dashboard - Overview
- **Presenter says:** "Once analyzed, Rasheed presents a clear overview. Here we can see our current consumption—2450 kWh costing 620 SAR for electricity."
- **Action:** Scroll through the overview page.
- **Result:** The interface displays static mock data originating from `data/mock-bill.ts` and `data/mock-analysis.ts`.

### 5. Detailed Analysis
- **Presenter says:** "Let's dive deeper into where this electricity is going."
- **Action:** Click on "تحليل الاستهلاك" (Analysis) in the sidebar.
- **Result:** The interface shows the consumption breakdown (AC, Appliances, Lighting, etc.).

### 6. Savings Plan & Recommendations
- **Presenter says:** "Rasheed isn't just about data; it's about action. Here is our customized savings plan."
- **Action:** Click on "خطة التوفير" (Plan) in the sidebar.
- **Result:** The UI presents actionable recommendations. Click on the "تطبيق خطة التوفير" (Apply Plan) button.

### 7. Simulation (What-If)
- **Presenter says:** "Now we can see the expected financial impact if we follow these recommendations."
- **Action:** The app automatically switches to the "ماذا لو" (What-If) simulator section.
- **Result:** The user can tweak the AC temperature or usage hours. The UI recalculates the projected cost dynamically (using the simplified local tariff logic in `data/mock-bill.ts`).

## Demo Data & State (Technical Notes)
- **Prepared Demo Persona / Account State:** We have created a mock user fixture (`data/demo-account.ts`) to represent a user who has been using the app for months. This "مستخدم تجريبي" (Demo User) has historical data for 3 previous billing periods (April, May, June) for both electricity and water.
- **UI vs Fixture Status:** Currently, the UI is driven by `data/mock-bill.ts` and `data/mock-analysis.ts`. The `data/demo-account.ts` fixture is prepared as data-only and will be wired up to the UI in future issues (e.g., when the Historical Comparison UI or Auth is built).
- **Authentication:** Currently, there is no real login or authentication. The app operates as a single-session guest prototype.
- **Privacy:** No real customer information or real meter numbers are used.

## Offline/Failure Fallback Strategy
Because the current application state does not rely on external services (Supabase or Gemini are not yet fully integrated for this flow), the demo is inherently robust. 
- **Internet Failure:** The app will function perfectly if run locally via `npm run dev`.
- **API Failure:** There are no live API calls in the demo path, preventing timeout or data-fetching errors during the presentation.

## What is NOT yet functional
- **Live AI Bill Reading:** The OCR extraction via Gemini is mocked.
- **Authentication/Accounts:** Real user accounts and historic data persistence are not implemented.
- **Official API Tariffs:** The cost calculation uses a simplified local formula, not the live SEC/NWC API.
