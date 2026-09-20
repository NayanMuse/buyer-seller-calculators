/* ============================================================
   Buyer & Seller Calculators — app logic
   ------------------------------------------------------------
   Every calculator is a pure function in `math` (no DOM),
   so the numbers are easy to test and audit. The `TOOLS`
   table wires each one to its inputs, results, and the
   "show your work" derivation.
   ============================================================ */
"use strict";

/* ---------------- formatting ---------------- */
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
const money2 = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const num = (n, d = 0) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n || 0);

/* ---------------- math: pure functions ---------------- */
const math = {
  // Standard fixed-rate amortization: monthly P&I for a loan.
  //   M = P * r(1+r)^n / ((1+r)^n - 1),  r = annualRate/12, n = months
  monthlyPI(principal, annualRatePct, years) {
    const r = annualRatePct / 100 / 12;
    const n = Math.round(years * 12);
    if (r === 0) return principal / n;
    const f = Math.pow(1 + r, n);
    return (principal * r * f) / (f - 1);
  },

  // Inverse: biggest loan a monthly P&I budget supports.
  //   P = M * ((1+r)^n - 1) / (r(1+r)^n)
  maxLoan(monthlyBudget, annualRatePct, years) {
    const r = annualRatePct / 100 / 12;
    const n = Math.round(years * 12);
    if (r === 0) return monthlyBudget * n;
    const f = Math.pow(1 + r, n);
    return (monthlyBudget * (f - 1)) / (r * f);
  },

  // Remaining balance after k payments (for payoff / equity math).
  balanceAfter(principal, annualRatePct, years, paymentsMade) {
    const r = annualRatePct / 100 / 12;
    const n = Math.round(years * 12);
    const pmt = this.monthlyPI(principal, annualRatePct, years);
    if (r === 0) return principal - pmt * paymentsMade;
    const f = Math.pow(1 + r, paymentsMade);
    return principal * f - pmt * ((f - 1) / r);
  },

  // Simulate a loan with an extra monthly payment.
  // Returns { months, totalInterest }.
  payoffWithExtra(principal, annualRatePct, basePayment, extra) {
    const r = annualRatePct / 100 / 12;
    let bal = principal, months = 0, interest = 0;
    const pmt = basePayment + extra;
    while (bal > 0 && months < 1200) {
      const i = bal * r;
      interest += i;
      bal = bal + i - pmt;
      months++;
      if (bal < 0) bal = 0;
    }
    return { months, totalInterest: interest };
  },
};

/* ---------------- tool definitions ---------------- */
const TOOLS = {
  /* ---------- 1. Monthly payment ---------- */
  payment: {
    title: "Monthly Payment",
    sub: "Principal & interest, taxes, insurance, HOA — the full monthly picture.",
    inputs: [
      { key: "price", label: "Home price", unit: "$", def: 400000 },
      { key: "downPct", label: "Down payment", unit: "%", def: 20 },
      { key: "rate", label: "Interest rate", unit: "% APR", def: 7 },
      { key: "years", label: "Loan term", unit: "years", def: 30 },
      { key: "taxAnnual", label: "Property tax", unit: "$ / yr", def: 4800 },
      { key: "insAnnual", label: "Homeowner's insurance", unit: "$ / yr", def: 1800 },
      { key: "hoa", label: "HOA dues", unit: "$ / mo", def: 0 },
    ],
    compute(v) {
      const loan = v.price * (1 - v.downPct / 100);
      const pi = math.monthlyPI(loan, v.rate, v.years);
      const tax = v.taxAnnual / 12, ins = v.insAnnual / 12;
      const total = pi + tax + ins + v.hoa;
      return {
        hero: { label: "Total monthly payment", value: money(total) },
        rows: [
          { k: "Principal & interest", v: money(pi) },
          { k: "Property tax", v: money(tax) },
          { k: "Insurance", v: money(ins) },
          { k: "HOA", v: money(v.hoa) },
          { k: "Loan amount", v: money(loan) },
          { k: "Down payment", v: money(v.price * v.downPct / 100) },
        ],
        formula: `
          <p>Monthly P&amp;I uses the standard amortization formula:</p>
          <code>M = P × r(1+r)ⁿ / ((1+r)ⁿ − 1)</code>
          <ol>
            <li>Loan P = ${money(v.price)} × (1 − ${v.downPct}%) = <b>${money(loan)}</b></li>
            <li>Monthly rate r = ${v.rate}% ÷ 12 = ${(v.rate / 12).toFixed(4)}%</li>
            <li>Payments n = ${v.years} × 12 = ${v.years * 12}</li>
            <li>P&amp;I = <b>${money(pi)}</b>/mo</li>
            <li>Add tax (${money(tax)}), insurance (${money(ins)}), HOA (${money(v.hoa)}) → <b>${money(total)}/mo</b></li>
          </ol>
          <p>Spot-check: a $400,000 loan at 7% for 30 years = ${money(math.monthlyPI(400000, 7, 30))}/mo P&amp;I on any bank calculator.</p>`,
      };
    },
  },

  /* ---------- 2. Affordability ---------- */
  affordability: {
    title: "Affordability",
    sub: "What home price can your income actually carry? Uses the 28/36 rule lenders apply.",
    inputs: [
      { key: "income", label: "Gross annual income", unit: "$", def: 120000 },
      { key: "debts", label: "Monthly debts", unit: "$ / mo", def: 500 },
      { key: "rate", label: "Interest rate", unit: "% APR", def: 7 },
      { key: "years", label: "Loan term", unit: "years", def: 30 },
      { key: "downPct", label: "Down payment", unit: "%", def: 20 },
      { key: "taxRate", label: "Property tax rate", unit: "% / yr", def: 1.1 },
      { key: "insAnnual", label: "Insurance", unit: "$ / yr", def: 1800 },
      { key: "hoa", label: "HOA dues", unit: "$ / mo", def: 0 },
    ],
    compute(v) {
      const monthly = v.income / 12;
      const front = monthly * 0.28;                    // housing ≤ 28% of income
      const back = monthly * 0.36 - v.debts;           // all debts ≤ 36%
      const allowed = Math.min(front, back);
      // Tax scales with price, so solve by fixed-point iteration.
      let price = 0;
      for (let i = 0; i < 40; i++) {
        const piAvail = allowed - (price * v.taxRate) / 100 / 12 - v.insAnnual / 12 - v.hoa;
        const loan = math.maxLoan(Math.max(piAvail, 0), v.rate, v.years);
        price = loan / (1 - v.downPct / 100);
      }
      const loan = price * (1 - v.downPct / 100);
      return {
        hero: { label: "Max affordable home price", value: money(price) },
        rows: [
          { k: "28% housing rule allows", v: money(front) + "/mo" },
          { k: "36% debt rule allows", v: money(back) + "/mo" },
          { k: "Binding limit", v: front <= back ? "Housing (28%)" : "Total debt (36%)" },
          { k: "Loan amount", v: money(loan) },
          { k: "Down payment needed", v: money(price * v.downPct / 100) },
        ],
        formula: `
          <p>Lenders cap housing at <b>28%</b> of gross monthly income and all debts at <b>36%</b>. The lower of the two binds.</p>
          <code>allowed = min(income × 28%, income × 36% − debts)</code>
          <ol>
            <li>Monthly income = ${money(v.income)} ÷ 12 = <b>${money(monthly)}</b></li>
            <li>28% rule → ${money(monthly)} × 0.28 = <b>${money(front)}/mo</b></li>
            <li>36% rule → ${money(monthly)} × 0.36 − ${money(v.debts)} = <b>${money(back)}/mo</b></li>
            <li>Binding budget = <b>${money(allowed)}/mo</b> for PITI + HOA</li>
            <li>Invert the amortization formula to get the max loan, then divide by (1 − down %) → <b>${money(price)}</b></li>
          </ol>`,
      };
    },
  },

  /* ---------- 3. Cash needed to buy ---------- */
  cash: {
    title: "Cash Needed to Buy",
    sub: "Down payment plus closing costs — the check you actually write at the table.",
    inputs: [
      { key: "price", label: "Home price", unit: "$", def: 400000 },
      { key: "downPct", label: "Down payment", unit: "%", def: 20 },
      { key: "closingPct", label: "Closing costs", unit: "% of price", def: 3 },
      { key: "other", label: "Other upfront (moving, etc.)", unit: "$", def: 2000 },
    ],
    compute(v) {
      const down = (v.price * v.downPct) / 100;
      const closing = (v.price * v.closingPct) / 100;
      const total = down + closing + v.other;
      return {
        hero: { label: "Total cash to close", value: money(total) },
        rows: [
          { k: "Down payment", v: money(down) },
          { k: `Closing costs (${v.closingPct}%)`, v: money(closing) },
          { k: "Other upfront", v: money(v.other) },
          { k: "Loan amount", v: money(v.price - down) },
        ],
        formula: `
          <p>Cash to close is simply the parts the loan doesn't cover:</p>
          <code>cash = down payment + closing costs + other</code>
          <ol>
            <li>Down = ${money(v.price)} × ${v.downPct}% = <b>${money(down)}</b></li>
            <li>Closing ≈ ${money(v.price)} × ${v.closingPct}% = <b>${money(closing)}</b> <span class="unit">(typically 2–5%: lender fees, title, escrow, prepaid tax/insurance)</span></li>
            <li>Other = <b>${money(v.other)}</b></li>
            <li>Total = <b>${money(total)}</b></li>
          </ol>`,
      };
    },
  },

  /* ---------- 4. Seller net proceeds ---------- */
  proceeds: {
    title: "Seller Net Proceeds",
    sub: "Sale price minus everything owed — what you actually walk away with.",
    inputs: [
      { key: "price", label: "Sale price", unit: "$", def: 450000 },
      { key: "payoff", label: "Mortgage payoff", unit: "$", def: 300000 },
      { key: "commPct", label: "Agent commissions", unit: "%", def: 6 },
      { key: "closingPct", label: "Seller closing costs", unit: "%", def: 1.5 },
      { key: "other", label: "Other fees (repairs, etc.)", unit: "$", def: 0 },
    ],
    compute(v) {
      const comm = (v.price * v.commPct) / 100;
      const closing = (v.price * v.closingPct) / 100;
      const net = v.price - v.payoff - comm - closing - v.other;
      return {
        hero: { label: "Estimated net proceeds", value: money(net), good: net >= 0 },
        rows: [
          { k: "Sale price", v: money(v.price) },
          { k: "− Mortgage payoff", v: money(v.payoff) },
          { k: `− Commissions (${v.commPct}%)`, v: money(comm) },
          { k: `− Closing costs (${v.closingPct}%)`, v: money(closing) },
          { k: "− Other fees", v: money(v.other) },
        ],
        formula: `
          <p>Subtract every claim on the sale price:</p>
          <code>net = price − payoff − commissions − closing − other</code>
          <ol>
            <li>${money(v.price)} − ${money(v.payoff)} (payoff) = <b>${money(v.price - v.payoff)}</b></li>
            <li>− ${money(comm)} commissions (${v.commPct}%)</li>
            <li>− ${money(closing)} closing (${v.closingPct}%)</li>
            <li>− ${money(v.other)} other</li>
            <li>Net = <b>${money(net)}</b></li>
          </ol>`,
      };
    },
  },

  /* ---------- 5. Break-even sale price ---------- */
  breakeven: {
    title: "Break-Even Sale Price",
    sub: "The lowest price where you sell without bringing cash to closing.",
    inputs: [
      { key: "payoff", label: "Mortgage payoff", unit: "$", def: 300000 },
      { key: "commPct", label: "Agent commissions", unit: "%", def: 6 },
      { key: "closingPct", label: "Variable closing costs", unit: "%", def: 1.5 },
      { key: "fixed", label: "Fixed fees", unit: "$", def: 1000 },
    ],
    compute(v) {
      const varRate = v.commPct / 100 + v.closingPct / 100;
      const price = (v.payoff + v.fixed) / (1 - varRate);
      return {
        hero: { label: "Break-even sale price", value: money(price) },
        rows: [
          { k: "Must cover: payoff + fixed", v: money(v.payoff + v.fixed) },
          { k: "Lost to % fees", v: num(varRate * 100, 1) + "%" },
          { k: "Check: net at this price", v: money(price - v.payoff - price * varRate - v.fixed) },
        ],
        formula: `
          <p>Set net proceeds to zero and solve for price. Fees that scale with price stay on the price side:</p>
          <code>price = (payoff + fixed fees) ÷ (1 − commission% − closing%)</code>
          <ol>
            <li>Fixed obligations = ${money(v.payoff)} + ${money(v.fixed)} = <b>${money(v.payoff + v.fixed)}</b></li>
            <li>Variable bite = ${v.commPct}% + ${v.closingPct}% = <b>${num(varRate * 100, 1)}%</b> of price</li>
            <li>Price = ${money(v.payoff + v.fixed)} ÷ (1 − ${num(varRate, 3)}) = <b>${money(price)}</b></li>
            <li>Verify: ${money(price)} − ${money(v.payoff)} − ${money(price * varRate)} fees − ${money(v.fixed)} ≈ <b>$0</b></li>
          </ol>`,
      };
    },
  },

  /* ---------- 6. Rent vs buy ---------- */
  rentbuy: {
    title: "Rent vs Buy",
    sub: "True monthly cost of owning versus renting — and the 5-year scorecard.",
    inputs: [
      { key: "rent", label: "Monthly rent", unit: "$", def: 2200 },
      { key: "price", label: "Home price", unit: "$", def: 400000 },
      { key: "downPct", label: "Down payment", unit: "%", def: 20 },
      { key: "rate", label: "Interest rate", unit: "% APR", def: 7 },
      { key: "years", label: "Loan term", unit: "years", def: 30 },
      { key: "taxAnnual", label: "Property tax", unit: "$ / yr", def: 4800 },
      { key: "insAnnual", label: "Insurance", unit: "$ / yr", def: 1800 },
      { key: "hoa", label: "HOA dues", unit: "$ / mo", def: 0 },
      { key: "maintPct", label: "Maintenance", unit: "% of price / yr", def: 1 },
      { key: "horizon", label: "Comparison horizon", unit: "years", def: 5 },
    ],
    compute(v) {
      const loan = v.price * (1 - v.downPct / 100);
      const down = v.price - loan;
      const pi = math.monthlyPI(loan, v.rate, v.years);
      const ownMonthly = pi + v.taxAnnual / 12 + v.insAnnual / 12 + v.hoa + (v.price * v.maintPct) / 100 / 12;
      const months = Math.round(v.horizon * 12);
      const rentTotal = v.rent * months;
      const paidTotal = ownMonthly * months;
      const balAfter = math.balanceAfter(loan, v.rate, v.years, months);
      const principalPaid = loan - balAfter;                    // becomes equity
      const buyNetCost = down + paidTotal - principalPaid;       // out of pocket minus equity built
      const buyWins = buyNetCost < rentTotal;
      return {
        hero: {
          label: `Over ${v.horizon} years`,
          value: buyWins ? "Buying wins" : "Renting wins",
          good: buyWins,
        },
        rows: [
          { k: "Monthly rent", v: money(v.rent) },
          { k: "Monthly cost to own", v: money(ownMonthly) },
          { k: `Rent total (${v.horizon} yr)`, v: money(rentTotal) },
          { k: "Buying net cost (minus equity)", v: money(buyNetCost) },
          { k: "Equity built (principal paid)", v: money(principalPaid) },
          { k: "Difference", v: money(Math.abs(rentTotal - buyNetCost)), cls: buyWins ? "good" : "warn" },
        ],
        formula: `
          <p>Monthly ownership cost vs rent, then a ${v.horizon}-year out-of-pocket scorecard. Equity you build counts in your favor.</p>
          <code>own/mo = P&amp;I + tax/12 + ins/12 + HOA + maintenance/12</code>
          <ol>
            <li>Own/mo = ${money(pi)} + ${money(v.taxAnnual / 12)} + ${money(v.insAnnual / 12)} + ${money(v.hoa)} + ${money((v.price * v.maintPct) / 100 / 12)} = <b>${money(ownMonthly)}</b> vs rent <b>${money(v.rent)}</b></li>
            <li>Rent ${v.horizon} yr = ${money(v.rent)} × ${months} = <b>${money(rentTotal)}</b></li>
            <li>Buy out-of-pocket = ${money(down)} down + ${money(paidTotal)} payments = ${money(down + paidTotal)}</li>
            <li>Minus principal repaid (${money(principalPaid)} — that's equity, not cost) → net <b>${money(buyNetCost)}</b></li>
            <li>Verdict: <b>${buyWins ? "buying" : "renting"} wins by ${money(Math.abs(rentTotal - buyNetCost))}</b></li>
          </ol>
          <p>Assumes flat rent and flat home value — appreciation would favor buying, rent hikes would too.</p>`,
      };
    },
  },

  /* ---------- 7. Payoff accelerator ---------- */
  payoff: {
    title: "Payoff Accelerator",
    sub: "What an extra payment each month does to your payoff date and total interest.",
    inputs: [
      { key: "balance", label: "Loan balance", unit: "$", def: 320000 },
      { key: "rate", label: "Interest rate", unit: "% APR", def: 7 },
      { key: "yearsLeft", label: "Years remaining", unit: "years", def: 27 },
      { key: "extra", label: "Extra payment", unit: "$ / mo", def: 200 },
    ],
    compute(v) {
      const base = math.monthlyPI(v.balance, v.rate, v.yearsLeft);
      const normal = math.payoffWithExtra(v.balance, v.rate, base, 0);
      const fast = math.payoffWithExtra(v.balance, v.rate, base, v.extra);
      const monthsSaved = normal.months - fast.months;
      const interestSaved = normal.totalInterest - fast.totalInterest;
      const yrs = (m) => `${Math.floor(m / 12)}y ${m % 12}m`;
      return {
        hero: { label: "Interest saved", value: money(interestSaved), good: true },
        rows: [
          { k: "Standard payment", v: money(base) + "/mo" },
          { k: "With extra", v: money(base + v.extra) + "/mo" },
          { k: "Normal payoff time", v: yrs(normal.months) },
          { k: "Accelerated payoff", v: yrs(fast.months) },
          { k: "Time saved", v: yrs(monthsSaved), cls: "good" },
          { k: "Total interest (normal)", v: money(normal.totalInterest) },
          { k: "Total interest (accelerated)", v: money(fast.totalInterest) },
        ],
        formula: `
          <p>Month by month: <b>interest = balance × r</b>, then <b>balance += interest − payment</b>, until the balance hits zero. No closed form needed — the simulation is the proof.</p>
          <ol>
            <li>Base payment on ${money(v.balance)} at ${v.rate}% over ${v.yearsLeft}y = <b>${money(base)}/mo</b></li>
            <li>Normal schedule: ${normal.months} payments, ${money(normal.totalInterest)} total interest</li>
            <li>With +${money(v.extra)}/mo: ${fast.months} payments, ${money(fast.totalInterest)} total interest</li>
            <li>Saved: <b>${yrs(monthsSaved)}</b> and <b>${money(interestSaved)}</b> in interest</li>
          </ol>`,
      };
    },
  },
};

/* ---------------- UI wiring ---------------- */
const state = { tool: "payment", values: {} };

function getTool() { return TOOLS[state.tool]; }

function renderInputs() {
  const tool = getTool();
  const box = document.getElementById("inputFields");
  box.innerHTML = "";
  tool.inputs.forEach((inp) => {
    if (!(inp.key in state.values)) state.values[inp.key] = inp.def;
    const wrap = document.createElement("div");
    wrap.className = "field";
    wrap.innerHTML = `<label>${inp.label} <span class="unit">${inp.unit}</span></label>`;
    const el = document.createElement("input");
    el.type = "number";
    el.min = "0";
    el.step = "any";
    el.value = state.values[inp.key];
    el.setAttribute("aria-label", inp.label);
    el.addEventListener("input", () => {
      state.values[inp.key] = parseFloat(el.value) || 0;
      renderResults();
    });
    wrap.appendChild(el);
    box.appendChild(wrap);
  });
}

function renderResults() {
  const tool = getTool();
  const out = tool.compute(state.values);
  const res = document.getElementById("resultFields");
  res.innerHTML = "";

  const hero = document.createElement("div");
  hero.className = "result-hero";
  hero.innerHTML = `<div class="hero-label"></div><div class="hero-value"></div>`;
  hero.querySelector(".hero-label").textContent = out.hero.label;
  hero.querySelector(".hero-value").textContent = out.hero.value;
  res.appendChild(hero);

  const rows = document.createElement("div");
  rows.className = "result-rows";
  out.rows.forEach((r) => {
    const row = document.createElement("div");
    row.className = "result-row";
    const cls = r.cls || (r.good === false ? "warn" : r.good ? "good" : "");
    row.innerHTML = `<span class="k"></span><span class="v ${cls}"></span>`;
    row.querySelector(".k").textContent = r.k;
    row.querySelector(".v").textContent = r.v;
    rows.appendChild(row);
  });
  res.appendChild(rows);

  document.getElementById("formulaBox").innerHTML = out.formula;
}

function selectTool(key) {
  state.tool = key;
  state.values = {};
  const tool = getTool();
  document.getElementById("toolTitle").textContent = tool.title;
  document.getElementById("toolSub").textContent = tool.sub;
  document.querySelectorAll(".nav-item").forEach((b) =>
    b.classList.toggle("active", b.dataset.tool === key)
  );
  renderInputs();
  renderResults();
}

/* theme: persist choice */
function initTheme() {
  const saved = localStorage.getItem("dm-theme");
  const dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = dark ? "dark" : "";
  const btn = document.getElementById("themeToggle");
  const paint = () => { btn.innerHTML = document.documentElement.dataset.theme === "dark" ? "&#9788; Light" : "&#9790; Dark"; };
  paint();
  btn.addEventListener("click", () => {
    const isDark = document.documentElement.dataset.theme === "dark";
    document.documentElement.dataset.theme = isDark ? "" : "dark";
    localStorage.setItem("dm-theme", isDark ? "light" : "dark");
    paint();
  });
}

document.querySelectorAll(".nav-item").forEach((b) =>
  b.addEventListener("click", () => selectTool(b.dataset.tool))
);

initTheme();
selectTool("payment");
