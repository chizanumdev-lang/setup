# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Prototype: standalone static HTML/CSS/JS. Production stack (Next.js + Supabase + Vercel) suggested in SPEC.md, not yet confirmed.

## Users
A solo intraday trader (the owner) who trades the Daily -> 4H -> 15m fractal model (candle 2 / candle 3 closures). Opens the app on a phone, often one-handed, right before an entry. Other traders may sign up later.

## Product Purpose
Candle Three is a journaling and education tool. It walks the trader through a pre-trade checklist, logs every trade (including skipped ones), and shows which checklist conditions lead to winning trades. It never places trades and never gives buy/sell signals.

## Positioning
The checklist is the model itself: a go / no-go gate with required, optional and no-go items, whose wording flips with the bull/bear bias. The journal then measures which items actually mattered (item impact, compliance vs. non-compliance).

## Operating Context
Used pre-trade (checklist), post-trade (log, notes, R result) and in review (history, calendar, stats). Phone first at 375px, installable PWA, light and dark.

## Capabilities and Constraints
Checklist with Required/Optional/No-go items and {bull|bear} wording swap; sticky status (x / y required, Setup valid, No trade); trade log; history with calendar; stats (win rate, avg R, equity curve in R, compliance, item impact); risk calculator; daily guardrails. Out of scope: AI chart review, broker connections, live prices, signals, social, payments. Footer disclaimer required.

## Brand Commitments
Keep checklist content and the {bull|bear} wording swap, the sticky go / no-go status with progress meter, and green = bullish / red = bearish semantics. Type and visual world are free to change. App name undecided ("Candle Three" working title).

## Evidence on Hand
Working prototype: /Users/chizanumidemili/Downloads/candle-three-checklist.html. SPEC.md in Downloads. No real trade data: any history/stats shown are synthetic and must be labelled as sample data.

## Product Principles
1. The checklist is a gate, not a form: the verdict (valid / no trade) is always visible.
2. Skipped trades are first-class data.
3. Warn, never block.
4. Every number earns its place: stats answer "which conditions matter".
5. One-handed, glanceable, honest.

## Accessibility & Inclusion
Keyboard navigable, visible focus, labelled controls, respects reduced motion, WCAG AA contrast in both themes. No horizontal scroll at 375px.
