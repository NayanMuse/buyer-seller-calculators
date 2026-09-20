# Buyer & Seller Calculators

A mobile-friendly web app with 7 real-estate calculators for home buyers and sellers.
No build step, no dependencies — open `index.html` in a browser and it works.
Host it free with [GitHub Pages](https://pages.github.com/): repo Settings → Pages → Deploy from branch.

## The calculators

| #   | Tool                | What it answers                                            |
| --- | ------------------- | ---------------------------------------------------------- |
| 1   | Monthly Payment     | Full PITI + HOA monthly cost of a home                     |
| 2   | Affordability       | Max home price your income supports (28/36 rule)           |
| 3   | Cash Needed to Buy  | Down payment + closing costs + other upfront cash          |
| 4   | Seller Net Proceeds | What you walk away with after payoff, commissions, closing |
| 5   | Break-Even Price    | Lowest sale price where you owe nothing at closing         |
| 6   | Rent vs Buy         | True monthly cost + a 5-year out-of-pocket scorecard       |
| 7   | Payoff Accelerator  | Time and interest saved by extra monthly payments          |

Every calculator has a **"Show your work"** section that derives the result step by
step with your actual numbers substituted — so the math is auditable, not a black box.

## Project layout

```
index.html   — page structure: sidebar nav, input panel, results panel
styles.css   — light/dark themes, responsive layout (sidebar → top picker on mobile)
app.js       — all logic. Pure `math` functions + a TOOLS table per calculator
```

## The math (spot-checks)

- **Amortization:** `M = P·r(1+r)ⁿ / ((1+r)ⁿ − 1)`. $400,000 at 7% for 30 years →
  **$2,661/mo** P&I. Match that against any bank calculator; if it differs, it's a bug.
- **Affordability:** `allowed = min(income×28%, income×36% − debts)`, then invert the
  amortization formula for the max loan.
- **Break-even:** `price = (payoff + fixed fees) ÷ (1 − commission% − closing%)`.

## Disclaimer

Estimates only — not financial advice. Verify figures with your lender and agent.

## Development

```sh
npm install   # dev tools only (ESLint, Prettier); the app itself has no dependencies
npm run lint          # automated code review: bug classes, dead code, dangerous patterns
npm run format:check  # Prettier formatting
npm test              # unit tests for the math + a smoke test of every tool
```

Every push to `main` runs the same three checks in GitHub Actions, plus a
CodeQL security scan. Keep them green.
