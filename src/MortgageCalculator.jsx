import { useState, useEffect, useRef } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcMonthly(principal, annualRate, years) {
  if (annualRate === 0) return principal / (years * 12);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function calcTotal(principal, annualRate, years) {
  return calcMonthly(principal, annualRate, years) * years * 12;
}

function fmtCurrency(n, decimals = 0) {
  return "$" + n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtK(n) {
  if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return "$" + (n / 1000).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}

function buildAmortization(principal, annualRate, years) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const payment = calcMonthly(principal, annualRate, years);
  let balance = principal;
  const rows = [];
  for (let i = 1; i <= n; i++) {
    const interest = balance * r;
    const princ = payment - interest;
    balance -= princ;
    rows.push({ month: i, payment, principal: princ, interest, balance: Math.max(0, balance) });
  }
  return rows;
}

const FAQ = [
  { q: "What is a mortgage calculator?", a: "A mortgage calculator estimates your monthly payment based on the loan amount, interest rate, and loan term. Our calculator includes all real costs — principal, interest, property taxes, home insurance, and PMI — so you see your true monthly obligation, not just the bare minimum." },
  { q: "What is PMI and when do I need it?", a: "Private Mortgage Insurance (PMI) is required when your down payment is less than 20% of the home price. It protects the lender if you default. PMI typically costs 0.5%–1.5% of your loan amount per year and is removed automatically once you reach 20% equity." },
  { q: "What is an amortization schedule?", a: "An amortization schedule shows how each payment is split between principal (reducing your debt) and interest (the lender's profit) over the life of the loan. In early years, most of your payment goes to interest. Over time, more goes to principal." },
  { q: "How does the interest rate affect my payment?", a: "Even small rate changes have a huge impact. On a $400,000 mortgage over 30 years: at 6% you pay $2,398/mo; at 7% you pay $2,661/mo — a $263 difference every month, or $94,680 extra over the loan term. Use our rate slider to see the impact instantly." },
  { q: "What is debt-to-income ratio (DTI)?", a: "DTI is your total monthly debt payments divided by your gross monthly income. Most lenders require a DTI below 43%. Front-end DTI (housing costs only) should typically be below 28%. Our DTI checker tells you instantly whether a lender is likely to approve you." },
  { q: "Should I get a 15-year or 30-year mortgage?", a: "A 30-year mortgage has lower monthly payments but you pay far more interest overall. A 15-year mortgage builds equity faster and saves tens of thousands in interest, but monthly payments are higher. Our comparison tool shows you the exact difference for your numbers." },
  { q: "What is the difference between rent and buy?", a: "Buying builds equity over time but has higher upfront costs and ongoing expenses. Renting is more flexible with lower upfront costs. The rent vs buy breakeven point — when buying becomes cheaper — depends heavily on how long you stay in the home. Our timeline shows you exactly when." },
  { q: "How much do I need for a down payment?", a: "The minimum down payment is typically 3%–5% for conventional loans, 3.5% for FHA loans, and 0% for VA or USDA loans. A 20% down payment eliminates PMI and gives you immediate equity. Our calculator shows how different down payment amounts affect your monthly cost." },
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MortgageCalculator({ onPrivacy, onAbout }) {
  // Inputs
  const [homePrice, setHomePrice] = useState(500000);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(6.5);
  const [years, setYears] = useState(30);
  const [taxes, setTaxes] = useState(300);
  const [insurance, setInsurance] = useState(150);
  const [hoa, setHoa] = useState(0);
  const [income, setIncome] = useState(120000);
  const [otherDebts, setOtherDebts] = useState(500);

  // UI state
  const [activeTab, setActiveTab] = useState("calculator");
  const [compareRate, setCompareRate] = useState(7.0);
  const [compareYears, setCompareYears] = useState(15);
  const [rentAmount, setRentAmount] = useState(2500);
  const [appreciation, setAppreciation] = useState(3);
  const [openFaq, setOpenFaq] = useState(null);
  const [lightMode, setLightMode] = useState(() => localStorage.getItem("mc_theme") === "light");
  const [showAmort, setShowAmort] = useState(false);
  const [amortView, setAmortView] = useState("annual");
  const [copied, setCopied] = useState(false);

  useEffect(() => { localStorage.setItem("mc_theme", lightMode ? "light" : "dark"); }, [lightMode]);

  // Calculations
  const downAmt = homePrice * (downPct / 100);
  const loanAmt = homePrice - downAmt;
  const loanPct = loanAmt / homePrice;
  const pmi = loanPct > 0.8 ? (loanAmt * 0.01) / 12 : 0;
  const pi = calcMonthly(loanAmt, rate, years);
  const totalMonthly = pi + taxes + insurance + hoa + pmi;
  const totalPaid = pi * years * 12;
  const totalInterest = totalPaid - loanAmt;
  const monthlyIncome = income / 12;
  const frontDTI = ((pi + taxes + insurance + hoa + pmi) / monthlyIncome) * 100;
  const backDTI = ((pi + taxes + insurance + hoa + pmi + otherDebts) / monthlyIncome) * 100;

  // Comparison
  const comparePI = calcMonthly(loanAmt, compareRate, compareYears);
  const compareTotalInterest = comparePI * compareYears * 12 - loanAmt;

  // Amortization
  const amortRows = buildAmortization(loanAmt, rate, years);
  const annualRows = Array.from({ length: years }, (_, i) => {
    const yearRows = amortRows.slice(i * 12, (i + 1) * 12);
    return {
      year: i + 1,
      principal: yearRows.reduce((s, r) => s + r.principal, 0),
      interest: yearRows.reduce((s, r) => s + r.interest, 0),
      balance: yearRows[yearRows.length - 1]?.balance || 0,
    };
  });

  // Rent vs Buy breakeven
  const breakeven = (() => {
    let equity = downAmt;
    let rentTotal = 0;
    let buyTotal = 0;
    for (let m = 1; m <= years * 12; m++) {
      const row = amortRows[m - 1];
      if (!row) break;
      equity += row.principal + (homePrice * Math.pow(1 + appreciation / 100, m / 12) - homePrice) / (years * 12);
      rentTotal += rentAmount;
      buyTotal += totalMonthly;
      if (equity > buyTotal - rentTotal && m > 12) return m;
    }
    return null;
  })();

  const dtiColor = backDTI < 36 ? "#22c55e" : backDTI < 43 ? "#f59e0b" : "#ef4444";
  const dtiLabel = backDTI < 36 ? "Excellent" : backDTI < 43 ? "Acceptable" : "Too High";

  const copy = () => {
    const text = `Mortgage Summary\nHome Price: ${fmtCurrency(homePrice)}\nDown Payment: ${fmtCurrency(downAmt)} (${downPct}%)\nLoan Amount: ${fmtCurrency(loanAmt)}\nRate: ${rate}% · ${years} years\n\nMonthly Payment Breakdown:\nPrincipal & Interest: ${fmtCurrency(pi)}\nProperty Taxes: ${fmtCurrency(taxes)}\nHome Insurance: ${fmtCurrency(insurance)}\nHOA: ${fmtCurrency(hoa)}\n${pmi > 0 ? `PMI: ${fmtCurrency(pmi)}\n` : ""}Total Monthly: ${fmtCurrency(totalMonthly)}\nTotal Interest Paid: ${fmtCurrency(totalInterest)}\n\nCalculated at MortgageHive.app`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lm = lightMode;

  return (
    <div style={{ fontFamily: "'DM Sans', 'Plus Jakarta Sans', system-ui, sans-serif", background: lm ? "#f8f9f5" : "#0d1a0f", color: lm ? "#1a2e1c" : "#e8f5e9", minHeight: "100vh", overflowX: "hidden", transition: "background 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        :root {
          --bg: ${lm ? "#f8f9f5" : "#0d1a0f"};
          --bg2: ${lm ? "#ffffff" : "#132216"};
          --bg3: ${lm ? "#f0f4ed" : "#1a2e1d"};
          --border: ${lm ? "rgba(34,100,46,0.15)" : "rgba(74,222,128,0.15)"};
          --border2: ${lm ? "rgba(34,100,46,0.08)" : "rgba(74,222,128,0.08)"};
          --green: ${lm ? "#16a34a" : "#4ade80"};
          --green-dim: ${lm ? "rgba(22,163,74,0.1)" : "rgba(74,222,128,0.1)"};
          --gold: ${lm ? "#b45309" : "#fbbf24"};
          --gold-dim: ${lm ? "rgba(180,83,9,0.1)" : "rgba(251,191,36,0.1)"};
          --text: ${lm ? "#1a2e1c" : "#e8f5e9"};
          --text2: ${lm ? "#4a6741" : "#86a887"};
          --text3: ${lm ? "#8aa882" : "#4a6741"};
          --red: #ef4444;
          --amber: #f59e0b;
          --radius: 14px;
        }
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg);font-family:'DM Sans','Plus Jakarta Sans',system-ui,sans-serif}
        input,button,select{font-family:'DM Sans','Plus Jakarta Sans',system-ui,sans-serif}
        button{cursor:pointer;border:none;background:none;color:inherit}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:var(--bg2)}
        ::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
        .fade-in{animation:fadeIn 0.3s ease}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .tab-btn{padding:10px 18px;border-radius:10px;font-size:13px;font-weight:600;transition:all 0.2s;color:var(--text2);border:1px solid transparent;white-space:nowrap;cursor:pointer}
        .tab-btn:hover{color:var(--text);background:var(--green-dim)}
        .tab-btn.active{background:var(--green-dim);border-color:var(--border);color:var(--green)}
        .input-group{margin-bottom:18px}
        .input-label{font-size:12px;font-weight:600;color:var(--text2);margin-bottom:6px;display:flex;justify-content:space-between;align-items:center}
        .input-value{font-size:14px;font-weight:700;color:var(--green);font-family:'DM Mono',monospace}
        .range-input{width:100%;accent-color:var(--green);height:4px;cursor:pointer}
        .number-input{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:14px;outline:none;font-family:'DM Mono',monospace;font-weight:500}
        .number-input:focus{border-color:var(--green)}
        .card{background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius);padding:20px}
        .card:hover{border-color:var(--border)}
        .summary-big{font-size:42px;font-weight:900;color:var(--green);font-family:'DM Mono',monospace;letter-spacing:-1px;line-height:1}
        .breakdown-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border2);font-size:14px}
        .breakdown-row:last-child{border-bottom:none}
        .breakdown-label{color:var(--text2)}
        .breakdown-value{font-family:'DM Mono',monospace;font-weight:600;color:var(--text)}
        .faq-item{border-bottom:1px solid var(--border2)}
        .faq-q{padding:18px 0;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:15px;font-weight:600;gap:12px;color:var(--text)}
        .faq-q:hover{color:var(--green)}
        .faq-a{font-size:14px;color:var(--text2);line-height:1.75;padding-bottom:18px}
        .pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
        .dti-bar{height:8px;border-radius:4px;background:var(--bg3);overflow:hidden;margin-top:6px}
        .dti-fill{height:100%;border-radius:4px;transition:width 0.4s ease}
        .amort-row{display:grid;grid-template-columns:40px 1fr 1fr 1fr;gap:8px;padding:7px 10px;font-size:12px;border-radius:6px;font-family:'DM Mono',monospace}
        .amort-row:hover{background:var(--bg3)}
        .section-title{font-size:18px;font-weight:800;letter-spacing:-0.3px;color:var(--text);margin-bottom:4px}
        .section-sub{font-size:13px;color:var(--text2);margin-bottom:16px}
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: `1px solid var(--border2)`, background: "var(--bg2)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#16a34a,#166534)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🏠</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px", color: "var(--text)" }}>
                Mortgage<span style={{ color: "var(--green)" }}>Hive</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text2)", fontWeight: 500 }}>True cost calculator · No signup required</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setLightMode(v => !v)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text2)", fontSize: 15 }}>
              {lightMode ? "🌙" : "☀️"}
            </button>
            <button onClick={copy} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: copied ? "var(--green-dim)" : "transparent", color: copied ? "var(--green)" : "var(--text2)", fontSize: 12, fontWeight: 600 }}>
              {copied ? "✓ Copied!" : "📋 Share"}
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 16px 80px" }}>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `1px solid var(--border2)`, paddingBottom: 12, overflowX: "auto" }}>
          {[
            ["calculator", "🏠 Calculator"],
            ["compare", "⚖️ Compare"],
            ["rentbuy", "📊 Rent vs Buy"],
            ["dti", "💳 Affordability"],
            ["amortization", "📅 Schedule"],
          ].map(([id, label]) => (
            <button key={id} className={`tab-btn ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}>{label}</button>
          ))}
        </div>

        {/* ── CALCULATOR TAB ── */}
        {activeTab === "calculator" && (
          <div className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* LEFT — Inputs */}
              <div>
                <div className="card" style={{ marginBottom: 14 }}>
                  <p className="section-title">Home details</p>
                  <p className="section-sub">Enter your numbers — we calculate the rest</p>

                  <div className="input-group">
                    <div className="input-label">
                      <span>Home price</span>
                      <span className="input-value">{fmtCurrency(homePrice)}</span>
                    </div>
                    <input type="range" className="range-input" min="50000" max="2000000" step="10000" value={homePrice} onChange={e => setHomePrice(+e.target.value)} />
                  </div>

                  <div className="input-group">
                    <div className="input-label">
                      <span>Down payment</span>
                      <span className="input-value">{downPct}% · {fmtCurrency(downAmt)}</span>
                    </div>
                    <input type="range" className="range-input" min="3" max="50" step="1" value={downPct} onChange={e => setDownPct(+e.target.value)} />
                    {downPct < 20 && (
                      <div style={{ fontSize: 11, color: "var(--amber)", marginTop: 4 }}>⚠️ PMI required — down payment below 20%</div>
                    )}
                  </div>

                  <div className="input-group">
                    <div className="input-label">
                      <span>Interest rate</span>
                      <span className="input-value">{rate}%</span>
                    </div>
                    <input type="range" className="range-input" min="2" max="12" step="0.1" value={rate} onChange={e => setRate(+e.target.value)} />
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <div className="input-label">
                      <span>Loan term</span>
                      <span className="input-value">{years} years</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[10, 15, 20, 25, 30].map(y => (
                        <button key={y} onClick={() => setYears(y)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1px solid ${years === y ? "var(--green)" : "var(--border2)"}`, background: years === y ? "var(--green-dim)" : "transparent", color: years === y ? "var(--green)" : "var(--text2)", fontSize: 13, fontWeight: 700 }}>
                          {y}yr
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card">
                  <p className="section-title">Monthly costs</p>
                  <p className="section-sub">These are the real costs most calculators hide</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { label: "Property taxes/mo", key: "taxes", val: taxes, set: setTaxes },
                      { label: "Home insurance/mo", key: "ins", val: insurance, set: setInsurance },
                      { label: "HOA fees/mo", key: "hoa", val: hoa, set: setHoa },
                    ].map(f => (
                      <div key={f.key}>
                        <div style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
                        <input type="number" className="number-input" value={f.val} onChange={e => f.set(+e.target.value)} min="0" />
                      </div>
                    ))}
                    {pmi > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 600, marginBottom: 4 }}>PMI (auto-calculated)</div>
                        <div style={{ background: "var(--bg3)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontFamily: "'DM Mono',monospace", fontWeight: 500, color: "var(--amber)" }}>{fmtCurrency(pmi)}/mo</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT — Results */}
              <div>
                <div className="card" style={{ marginBottom: 14, background: lm ? "linear-gradient(135deg,#f0fdf4,#ffffff)" : "linear-gradient(135deg,#132216,#0d1a0f)" }}>
                  <div style={{ fontSize: 13, color: "var(--text2)", fontWeight: 600, marginBottom: 8 }}>Total monthly payment</div>
                  <div className="summary-big">{fmtCurrency(totalMonthly)}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>per month · {years}-year loan at {rate}%</div>

                  <div style={{ marginTop: 20 }}>
                    {[
                      { label: "Principal & Interest", value: fmtCurrency(pi), color: "var(--green)" },
                      { label: "Property Taxes", value: fmtCurrency(taxes), color: "var(--text)" },
                      { label: "Home Insurance", value: fmtCurrency(insurance), color: "var(--text)" },
                      ...(hoa > 0 ? [{ label: "HOA Fees", value: fmtCurrency(hoa), color: "var(--text)" }] : []),
                      ...(pmi > 0 ? [{ label: "PMI", value: fmtCurrency(pmi), color: "var(--amber)" }] : []),
                    ].map(r => (
                      <div key={r.label} className="breakdown-row">
                        <span className="breakdown-label">{r.label}</span>
                        <span className="breakdown-value" style={{ color: r.color }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Loan summary</p>
                  {[
                    { label: "Loan amount", value: fmtCurrency(loanAmt) },
                    { label: "Total paid over life of loan", value: fmtCurrency(totalPaid + (taxes + insurance + hoa + pmi) * years * 12) },
                    { label: "Total interest paid", value: fmtCurrency(totalInterest), highlight: true },
                    { label: "Interest as % of loan", value: ((totalInterest / loanAmt) * 100).toFixed(0) + "%" },
                  ].map(r => (
                    <div key={r.label} className="breakdown-row">
                      <span className="breakdown-label">{r.label}</span>
                      <span className="breakdown-value" style={{ color: r.highlight ? "var(--red)" : "var(--text)" }}>{r.value}</span>
                    </div>
                  ))}
                </div>

                {/* Donut chart visual */}
                <div className="card">
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Payment breakdown</p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[
                      { label: "P&I", pct: (pi / totalMonthly * 100).toFixed(0), color: "#16a34a" },
                      { label: "Taxes", pct: (taxes / totalMonthly * 100).toFixed(0), color: "#fbbf24" },
                      { label: "Insurance", pct: (insurance / totalMonthly * 100).toFixed(0), color: "#60a5fa" },
                      ...(hoa > 0 ? [{ label: "HOA", pct: (hoa / totalMonthly * 100).toFixed(0), color: "#a78bfa" }] : []),
                      ...(pmi > 0 ? [{ label: "PMI", pct: (pmi / totalMonthly * 100).toFixed(0), color: "#f87171" }] : []),
                    ].map(b => (
                      <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: b.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "var(--text2)" }}>{b.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", fontFamily: "'DM Mono',monospace" }}>{b.pct}%</span>
                      </div>
                    ))}
                  </div>
                  {/* Visual bar */}
                  <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginTop: 10, gap: 1 }}>
                    {[
                      { pct: pi / totalMonthly * 100, color: "#16a34a" },
                      { pct: taxes / totalMonthly * 100, color: "#fbbf24" },
                      { pct: insurance / totalMonthly * 100, color: "#60a5fa" },
                      ...(hoa > 0 ? [{ pct: hoa / totalMonthly * 100, color: "#a78bfa" }] : []),
                      ...(pmi > 0 ? [{ pct: pmi / totalMonthly * 100, color: "#f87171" }] : []),
                    ].map((b, i) => (
                      <div key={i} style={{ flex: b.pct, background: b.color, minWidth: 2 }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── COMPARE TAB ── */}
        {activeTab === "compare" && (
          <div className="fade-in">
            <p className="section-title">Compare loan scenarios</p>
            <p className="section-sub">See exactly how rate and term changes affect your total cost</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              {/* Scenario A */}
              <div className="card" style={{ border: `2px solid var(--green)` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--green)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Scenario A — Current</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "var(--green)", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>{fmtCurrency(pi)}<span style={{ fontSize: 14 }}>/mo</span></div>
                <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>{rate}% · {years} years</div>
                {[
                  { label: "Total interest", value: fmtCurrency(totalInterest) },
                  { label: "Total paid", value: fmtCurrency(pi * years * 12) },
                  { label: "Paid off", value: new Date(Date.now() + years * 365.25 * 24 * 3600 * 1000).getFullYear().toString() },
                ].map(r => (
                  <div key={r.label} className="breakdown-row">
                    <span className="breakdown-label">{r.label}</span>
                    <span className="breakdown-value">{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Scenario B */}
              <div className="card">
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Scenario B — Compare</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "var(--gold)", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>{fmtCurrency(comparePI)}<span style={{ fontSize: 14 }}>/mo</span></div>
                <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 3 }}>Rate</div>
                    <input type="number" className="number-input" style={{ width: 80 }} value={compareRate} step="0.1" min="1" max="15" onChange={e => setCompareRate(+e.target.value)} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 3 }}>Years</div>
                    <select value={compareYears} onChange={e => setCompareYears(+e.target.value)} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", color: "var(--text)", fontSize: 14, outline: "none" }}>
                      {[10, 15, 20, 25, 30].map(y => <option key={y} value={y}>{y} years</option>)}
                    </select>
                  </div>
                </div>
                {[
                  { label: "Total interest", value: fmtCurrency(compareTotalInterest) },
                  { label: "Total paid", value: fmtCurrency(comparePI * compareYears * 12) },
                  { label: "Paid off", value: new Date(Date.now() + compareYears * 365.25 * 24 * 3600 * 1000).getFullYear().toString() },
                ].map(r => (
                  <div key={r.label} className="breakdown-row">
                    <span className="breakdown-label">{r.label}</span>
                    <span className="breakdown-value">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Difference summary */}
            <div className="card" style={{ background: lm ? "linear-gradient(135deg,#f0fdf4,#fff)" : "linear-gradient(135deg,#132216,#0d1a0f)", border: `1px solid var(--border)` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>The difference</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                {[
                  { label: "Monthly payment difference", value: fmtCurrency(Math.abs(pi - comparePI)), positive: pi > comparePI },
                  { label: "Total interest difference", value: fmtCurrency(Math.abs(totalInterest - compareTotalInterest)), positive: totalInterest > compareTotalInterest },
                  { label: "Years saved/added", value: Math.abs(years - compareYears) + " years", positive: years > compareYears },
                ].map(r => (
                  <div key={r.label} style={{ background: "var(--bg3)", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>{r.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: r.positive ? "var(--green)" : "var(--red)", fontFamily: "'DM Mono',monospace" }}>{r.value}</div>
                    <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 2 }}>{r.positive ? "Scenario A saves more" : "Scenario B saves more"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── RENT VS BUY TAB ── */}
        {activeTab === "rentbuy" && (
          <div className="fade-in">
            <p className="section-title">Rent vs Buy timeline</p>
            <p className="section-sub">See the exact year when buying becomes cheaper than renting</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div className="card">
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Your rent details</p>
                <div className="input-group">
                  <div className="input-label"><span>Current monthly rent</span><span className="input-value">{fmtCurrency(rentAmount)}</span></div>
                  <input type="range" className="range-input" min="500" max="5000" step="50" value={rentAmount} onChange={e => setRentAmount(+e.target.value)} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <div className="input-label"><span>Home appreciation rate</span><span className="input-value">{appreciation}%/yr</span></div>
                  <input type="range" className="range-input" min="0" max="8" step="0.5" value={appreciation} onChange={e => setAppreciation(+e.target.value)} />
                </div>
              </div>

              <div className="card" style={{ background: lm ? "linear-gradient(135deg,#f0fdf4,#fff)" : "linear-gradient(135deg,#132216,#0d1a0f)" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Breakeven point</p>
                {breakeven ? (
                  <>
                    <div style={{ fontSize: 48, fontWeight: 900, color: "var(--green)", fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>
                      {Math.ceil(breakeven / 12)}
                      <span style={{ fontSize: 16, color: "var(--text2)" }}> years</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 6 }}>
                      If you stay longer than <strong style={{ color: "var(--green)" }}>{Math.ceil(breakeven / 12)} years</strong>, buying is cheaper than renting at {fmtCurrency(rentAmount)}/mo.
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: 14, color: "var(--text2)" }}>Buying never becomes cheaper at these numbers. Consider a lower home price or higher rent comparison.</p>
                )}
                <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text2)" }}>Monthly rent</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", fontFamily: "'DM Mono',monospace" }}>{fmtCurrency(rentAmount)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text2)" }}>Monthly mortgage</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--green)", fontFamily: "'DM Mono',monospace" }}>{fmtCurrency(totalMonthly)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Year by year table */}
            <div className="card">
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Year-by-year comparison</p>
              <div style={{ overflowX: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 1fr 1fr 1fr", gap: 8, padding: "6px 10px", fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <div>Year</div><div>Rent paid</div><div>Buy total cost</div><div>Home value</div><div>Equity</div>
                </div>
                {Array.from({ length: Math.min(years, 30) }, (_, i) => {
                  const yr = i + 1;
                  const rentPaid = rentAmount * 12 * yr;
                  const buyPaid = totalMonthly * 12 * yr;
                  const homeVal = homePrice * Math.pow(1 + appreciation / 100, yr);
                  const equityRow = annualRows[i];
                  const equity = homeVal - (equityRow?.balance || 0);
                  const isBreakeven = breakeven && yr === Math.ceil(breakeven / 12);
                  return (
                    <div key={yr} style={{ display: "grid", gridTemplateColumns: "50px 1fr 1fr 1fr 1fr", gap: 8, padding: "7px 10px", fontSize: 12, borderRadius: 6, background: isBreakeven ? "var(--green-dim)" : "transparent", border: isBreakeven ? "1px solid var(--border)" : "1px solid transparent", fontFamily: "'DM Mono',monospace" }}>
                      <div style={{ fontWeight: 700, color: isBreakeven ? "var(--green)" : "var(--text2)" }}>{yr}{isBreakeven && " ⭐"}</div>
                      <div style={{ color: "var(--text)" }}>{fmtK(rentPaid)}</div>
                      <div style={{ color: "var(--text)" }}>{fmtK(buyPaid)}</div>
                      <div style={{ color: "var(--text)" }}>{fmtK(homeVal)}</div>
                      <div style={{ color: "var(--green)", fontWeight: 700 }}>{fmtK(equity)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── DTI / AFFORDABILITY TAB ── */}
        {activeTab === "dti" && (
          <div className="fade-in">
            <p className="section-title">Affordability checker</p>
            <p className="section-sub">Will a lender approve you? Check your debt-to-income ratio instantly</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div className="card">
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>Your income & debts</p>
                {[
                  { label: "Annual gross income", val: income, set: setIncome },
                  { label: "Other monthly debts (car, student loans, etc.)", val: otherDebts, set: setOtherDebts },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
                    <input type="number" className="number-input" value={f.val} onChange={e => f.set(+e.target.value)} />
                  </div>
                ))}
              </div>

              <div className="card" style={{ background: lm ? "linear-gradient(135deg,#f0fdf4,#fff)" : "linear-gradient(135deg,#132216,#0d1a0f)" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>DTI analysis</p>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--text2)" }}>Front-end DTI (housing only)</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: frontDTI < 28 ? "var(--green)" : "var(--amber)", fontFamily: "'DM Mono',monospace" }}>{frontDTI.toFixed(1)}%</span>
                  </div>
                  <div className="dti-bar"><div className="dti-fill" style={{ width: `${Math.min(frontDTI, 100)}%`, background: frontDTI < 28 ? "#16a34a" : "#f59e0b" }} /></div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>Lenders prefer below 28%</div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--text2)" }}>Back-end DTI (all debts)</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: dtiColor, fontFamily: "'DM Mono',monospace" }}>{backDTI.toFixed(1)}%</span>
                  </div>
                  <div className="dti-bar"><div className="dti-fill" style={{ width: `${Math.min(backDTI, 100)}%`, background: dtiColor }} /></div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>Maximum acceptable: 43%</div>
                </div>

                <div style={{ padding: "12px 14px", background: "var(--bg3)", borderRadius: 10, border: `1px solid ${backDTI < 43 ? "var(--border)" : "rgba(239,68,68,0.3)"}` }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: dtiColor, marginBottom: 4 }}>{dtiLabel}</div>
                  <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
                    {backDTI < 36 ? "Your DTI ratio is strong. Most lenders will approve you with favorable terms." :
                      backDTI < 43 ? "Your DTI is acceptable but on the higher end. Some lenders may require a larger down payment." :
                        "Your DTI is above lender limits. Consider a lower home price, larger down payment, or paying down other debts first."}
                  </div>
                </div>
              </div>
            </div>

            {/* Max home price */}
            <div className="card">
              <p style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", marginBottom: 14 }}>Maximum home price at your income</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                {[
                  { rule: "28% front-end rule", maxMonthly: monthlyIncome * 0.28, label: "Conservative" },
                  { rule: "36% back-end rule", maxMonthly: (monthlyIncome * 0.36) - otherDebts, label: "Standard" },
                  { rule: "43% DTI maximum", maxMonthly: (monthlyIncome * 0.43) - otherDebts, label: "Maximum" },
                ].map(r => {
                  const maxPI = r.maxMonthly - taxes - insurance - hoa;
                  const n = years * 12;
                  const mr = rate / 100 / 12;
                  const maxLoan = maxPI > 0 ? maxPI * (Math.pow(1 + mr, n) - 1) / (mr * Math.pow(1 + mr, n)) : 0;
                  const maxPrice = maxLoan / (1 - downPct / 100);
                  return (
                    <div key={r.rule} style={{ background: "var(--bg3)", borderRadius: 10, padding: "14px" }}>
                      <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>{r.rule}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: "var(--green)", fontFamily: "'DM Mono',monospace" }}>{fmtK(Math.max(0, maxPrice))}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{r.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── AMORTIZATION TAB ── */}
        {activeTab === "amortization" && (
          <div className="fade-in">
            <p className="section-title">Amortization schedule</p>
            <p className="section-sub">See exactly how your loan is paid off month by month</p>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[["annual", "Annual view"], ["monthly", "Monthly view"]].map(([id, label]) => (
                <button key={id} className={`tab-btn ${amortView === id ? "active" : ""}`} onClick={() => setAmortView(id)}>{label}</button>
              ))}
            </div>

            <div className="card">
              <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr 1fr", gap: 8, padding: "6px 10px", fontSize: 11, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <div>{amortView === "annual" ? "Year" : "Mo."}</div>
                <div>Payment</div>
                <div>Principal</div>
                <div>Interest</div>
                <div>Balance</div>
              </div>
              <div style={{ maxHeight: 420, overflowY: "auto" }}>
                {(amortView === "annual" ? annualRows : amortRows.slice(0, 120)).map((row, i) => {
                  const isAnnual = amortView === "annual";
                  const payment = isAnnual ? row.principal + row.interest : row.payment;
                  const pct = row.principal / payment;
                  return (
                    <div key={i} className="amort-row" style={{ color: "var(--text2)" }}>
                      <div style={{ fontWeight: 700, color: "var(--text)" }}>{isAnnual ? row.year : row.month}</div>
                      <div>{fmtCurrency(payment)}</div>
                      <div style={{ color: "var(--green)" }}>{fmtCurrency(row.principal)}</div>
                      <div style={{ color: "var(--red)" }}>{fmtCurrency(row.interest)}</div>
                      <div>{fmtCurrency(row.balance)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── FAQ ── */}
        <div style={{ marginTop: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 20, letterSpacing: "-0.5px", color: "var(--text)" }}>
            Frequently Asked <span style={{ color: "var(--green)" }}>Questions</span>
          </h2>
          <div className="card">
            {FAQ.map((item, i) => (
              <div key={i} className="faq-item">
                <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{item.q}</span>
                  <span style={{ color: "var(--green)", fontSize: 20, flexShrink: 0, transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
                </div>
                {openFaq === i && <div className="faq-a fade-in">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div style={{ marginTop: 32, padding: 24, background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, color: "var(--text)" }}>About <span style={{ color: "var(--green)" }}>MortgageHive</span></h2>
          <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.8, marginBottom: 10 }}>
            MortgageHive is the most complete free mortgage calculator available. Unlike other calculators that show only principal and interest, MortgageHive includes property taxes, home insurance, HOA fees, and PMI — so you see your true monthly payment before you commit.
          </p>
          <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.8 }}>
            No signup required. No personal information collected. No spam. Just honest numbers to help you make the biggest financial decision of your life with confidence.
          </p>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid var(--border2)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>MortgageHive · Free Mortgage Calculator</span>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>No signup · No data collected · No spam</span>
        </div>
      </div>
    </div>
  );
}
