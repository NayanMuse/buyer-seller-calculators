/* Math + tool smoke tests — run with: npm test (node --test tests/)
   app.js is a browser script, so we stub the DOM globals it touches,
   load the file, and grab the pure `math` object and TOOLS table. */
/* eslint-disable no-eval -- intentional: the file under test is a plain
   browser script with no module exports, so eval is the honest loader. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// ---- minimal browser stubs so app.js can load under node ----
const stubEl = () => ({
  className: "",
  dataset: {},
  style: {},
  innerHTML: "",
  textContent: "",
  value: "",
  classList: { toggle() {}, add() {}, remove() {} },
  setAttribute() {},
  appendChild() {},
  addEventListener() {},
  querySelector() {
    return stubEl();
  },
  querySelectorAll() {
    return [];
  },
});
global.document = {
  getElementById() {
    return stubEl();
  },
  querySelector() {
    return stubEl();
  },
  querySelectorAll() {
    return [];
  },
  createElement() {
    return stubEl();
  },
  documentElement: { dataset: {} },
};
global.window = {
  matchMedia() {
    return { matches: false };
  },
};
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => {
    store[k] = String(v);
  },
};

// ---- load app.js and expose its internals ----
const src = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
eval(src + "\n;globalThis.__math = math; globalThis.__TOOLS = TOOLS;");
const math = globalThis.__math;
const TOOLS = globalThis.__TOOLS;

test("amortization matches bank math", () => {
  assert.ok(Math.abs(math.monthlyPI(400000, 7, 30) - 2661.21) < 0.01);
});

test("maxLoan inverts monthlyPI exactly", () => {
  const pmt = math.monthlyPI(400000, 7, 30);
  assert.ok(Math.abs(math.maxLoan(pmt, 7, 30) - 400000) < 0.01);
});

test("0% interest rate is handled", () => {
  assert.equal(math.monthlyPI(120000, 0, 10), 1000);
});

test("payoff simulation terminates and extra payments save", () => {
  const base = math.monthlyPI(320000, 7, 27);
  const normal = math.payoffWithExtra(320000, 7, base, 0);
  const fast = math.payoffWithExtra(320000, 7, base, 200);
  assert.ok(normal.months <= 1200, "simulation must terminate");
  assert.ok(fast.months < normal.months, "extra payment shortens the loan");
  assert.ok(fast.totalInterest < normal.totalInterest, "extra payment saves interest");
});

test("every tool computes on defaults without throwing", () => {
  for (const [key, tool] of Object.entries(TOOLS)) {
    const values = {};
    for (const inp of tool.inputs) values[inp.key] = inp.def;
    const out = tool.compute(values);
    assert.ok(out.hero && typeof out.hero.value === "string" && out.hero.value.length > 0, `${key}: hero`);
    assert.ok(Array.isArray(out.rows) && out.rows.length > 0, `${key}: rows`);
    assert.ok(typeof out.formula === "string" && out.formula.length > 0, `${key}: formula`);
  }
});

test("break-even price nets approximately zero", () => {
  const out = TOOLS.breakeven.compute({ payoff: 300000, commPct: 6, closingPct: 1.5, fixed: 1000 });
  const check = out.rows.find((r) => r.k.startsWith("Check:"));
  assert.equal(check.v, "$0");
});
