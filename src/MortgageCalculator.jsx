import { useState, useEffect } from "react";

// ── Canadian Land Transfer Tax by Province ────────────────────────────────────
function calcCanadaLTT(price, province, isFirstTime, city) {
  let provincial = 0;
  let municipal = 0;
  let provincialRebate = 0;
  let municipalRebate = 0;

  switch (province) {
    case "ON": {
      // Ontario LTT brackets
      if (price <= 55000) provincial = price * 0.005;
      else if (price <= 250000) provincial = 275 + (price - 55000) * 0.01;
      else if (price <= 400000) provincial = 2225 + (price - 250000) * 0.015;
      else if (price <= 2000000) provincial = 4475 + (price - 400000) * 0.02;
      else provincial = 36475 + (price - 2000000) * 0.025;
      if (isFirstTime) provincialRebate = Math.min(provincial, 4000);
      // Toronto MLTT
      if (city === "Toronto") {
        if (price <= 55000) municipal = price * 0.005;
        else if (price <= 250000) municipal = 275 + (price - 55000) * 0.01;
        else if (price <= 400000) municipal = 2225 + (price - 250000) * 0.015;
        else if (price <= 2000000) municipal = 4475 + (price - 400000) * 0.02;
        else municipal = 36475 + (price - 2000000) * 0.025;
        if (isFirstTime) municipalRebate = Math.min(municipal, 4475);
      }
      break;
    }
    case "BC": {
      if (price <= 200000) provincial = price * 0.01;
      else if (price <= 2000000) provincial = 2000 + (price - 200000) * 0.02;
      else provincial = 38000 + (price - 2000000) * 0.03;
      if (isFirstTime && price <= 835000) provincialRebate = Math.min(provincial, price <= 500000 ? provincial : provincial * ((835000 - price) / 335000));
      break;
    }
    case "QC": {
      // Quebec "Welcome Tax" (Bienvenue Tax)
      if (price <= 58900) provincial = price * 0.005;
      else if (price <= 294600) provincial = 294.5 + (price - 58900) * 0.01;
      else if (price <= 552300) provincial = 2649.5 + (price - 294600) * 0.015;
      else if (price <= 1104600) provincial = 6511 + (price - 552300) * 0.02;
      else provincial = 17557 + (price - 1104600) * 0.025;
      break;
    }
    case "MB": {
      if (price <= 30000) provincial = 0;
      else if (price <= 90000) provincial = (price - 30000) * 0.005;
      else if (price <= 150000) provincial = 300 + (price - 90000) * 0.01;
      else if (price <= 200000) provincial = 900 + (price - 150000) * 0.015;
      else provincial = 1650 + (price - 200000) * 0.02;
      if (isFirstTime && price <= 150000) provincialRebate = provincial;
      break;
    }
    case "NS": {
      provincial = price * 0.015;
      break;
    }
    case "NB": {
      provincial = price * 0.01;
      break;
    }
    case "PE": {
      provincial = price * 0.01;
      if (isFirstTime) provincialRebate = Math.min(provincial, price * 0.01);
      break;
    }
    case "NL": {
      if (price <= 500) provincial = 0;
      else provincial = Math.min(price * 0.004, 500) + (price * 0.001);
      break;
    }
    case "AB": case "SK": case "NT": case "NU": case "YT":
      provincial = 0; // No land transfer tax
      break;
    default:
      provincial = price * 0.01;
  }
  return {
    provincial: Math.max(0, provincial),
    municipal: Math.max(0, municipal),
    provincialRebate: Math.max(0, provincialRebate),
    municipalRebate: Math.max(0, municipalRebate),
    total: Math.max(0, provincial + municipal - provincialRebate - municipalRebate),
  };
}

// ── CMHC Insurance ────────────────────────────────────────────────────────────
function calcCMHC(homePrice, downPct, province) {
  if (downPct >= 20 || homePrice > 1500000) return { premium: 0, tax: 0, total: 0 };
  // Canada min down payment rules
  let minDown = 0.05;
  if (homePrice > 500000) minDown = (25000 + (homePrice - 500000) * 0.1) / homePrice;
  if (downPct < minDown * 100) downPct = minDown * 100;

  const loanAmt = homePrice * (1 - downPct / 100);
  let rate = 0;
  if (downPct >= 5 && downPct < 10) rate = 0.04;
  else if (downPct >= 10 && downPct < 15) rate = 0.031;
  else if (downPct >= 15 && downPct < 20) rate = 0.028;

  const premium = loanAmt * rate;
  // PST on CMHC premium (ON: 8%, QC: 9%, SK: 6%)
  const pstRates = { ON: 0.08, QC: 0.09, SK: 0.06 };
  const tax = premium * (pstRates[province] || 0);
  return { premium, tax, total: premium + tax, rate };
}

// ── US Closing Costs ──────────────────────────────────────────────────────────
function calcUSClosingCosts(loanAmt, homePrice, state, isFirstTime) {
  const origination = loanAmt * 0.01;
  const appraisal = 600;
  const titleSearch = 300;
  const titleInsurance = homePrice * 0.005;
  const escrow = 500;
  const recording = 150;
  const creditReport = 35;
  const underwriting = 500;
  const homeInspection = 400;
  const survey = 400;
  const prepaidInterest = loanAmt * 0.065 / 365 * 15;
  const prepaidInsurance = (homePrice * 0.006 / 12) * 3;
  const prepaidTaxes = (homePrice * 0.012 / 12) * 3;
  // State transfer taxes
  const transferTaxRates = {
    "NY": 0.004, "FL": 0.007, "PA": 0.01, "VA": 0.0025, "MD": 0.005,
    "IL": 0.001, "GA": 0.001, "CO": 0.001, "WA": 0.0128, "TX": 0,
    "CA": 0.0011, "AZ": 0, "NV": 0.002, "NC": 0.002, "OH": 0.001,
  };
  const transferTax = homePrice * (transferTaxRates[state] || 0.002);
  const total = origination + appraisal + titleSearch + titleInsurance + escrow + recording + creditReport + underwriting + homeInspection + survey + prepaidInterest + prepaidInsurance + prepaidTaxes + transferTax;
  return {
    items: [
      { label: "Loan origination fee (1%)", amount: origination },
      { label: "Home appraisal", amount: appraisal },
      { label: "Home inspection", amount: homeInspection },
      { label: "Title search", amount: titleSearch },
      { label: "Title insurance", amount: titleInsurance },
      { label: "Escrow fee", amount: escrow },
      { label: "Underwriting fee", amount: underwriting },
      { label: "Credit report", amount: creditReport },
      { label: "Recording fee", amount: recording },
      { label: "Property survey", amount: survey },
      { label: "Transfer tax", amount: transferTax },
      { label: "Prepaid interest (15 days)", amount: prepaidInterest },
      { label: "Prepaid insurance (3 months)", amount: prepaidInsurance },
      { label: "Prepaid property taxes (3 months)", amount: prepaidTaxes },
    ],
    total,
  };
}

// ── Mortgage Math ─────────────────────────────────────────────────────────────
function calcMonthly(principal, annualRate, years) {
  if (annualRate === 0) return principal / (years * 12);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
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
    balance = Math.max(0, balance - princ);
    rows.push({ month: i, payment, principal: princ, interest, balance });
  }
  return rows;
}

function fmtC(n, dec = 0) {
  if (isNaN(n) || !isFinite(n)) return "$0";
  return "$" + Math.abs(n).toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtK(n) {
  if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return "$" + (n / 1000).toFixed(0) + "K";
  return "$" + Math.round(n);
}

// ── Data ──────────────────────────────────────────────────────────────────────
const CA_PROVINCES = [
  { code: "ON", name: "Ontario" }, { code: "BC", name: "British Columbia" },
  { code: "QC", name: "Quebec" }, { code: "AB", name: "Alberta" },
  { code: "MB", name: "Manitoba" }, { code: "SK", name: "Saskatchewan" },
  { code: "NS", name: "Nova Scotia" }, { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland" }, { code: "PE", name: "PEI" },
  { code: "NT", name: "NWT" }, { code: "NU", name: "Nunavut" }, { code: "YT", name: "Yukon" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const FAQ = [
  { q: "What is CMHC insurance and do I need it in Canada?", a: "CMHC (Canada Mortgage and Housing Corporation) mortgage default insurance is required if your down payment is less than 20% of the home price. The premium ranges from 2.8% to 4% of the mortgage amount depending on your down payment. It can be added to your mortgage but in Ontario, Quebec, and Saskatchewan, the provincial sales tax on the premium must be paid in cash at closing — many first-time buyers miss this." },
  { q: "What is the minimum down payment in Canada?", a: "The minimum down payment in Canada is 5% for homes up to $500,000. For homes between $500,000 and $999,999, you need 5% on the first $500,000 and 10% on the remainder. For homes $1 million and over, you need a minimum 20% down payment and CMHC insurance is not available." },
  { q: "What is land transfer tax in Canada?", a: "Land transfer tax is a one-time fee paid to the provincial government when you buy a home. Rates vary dramatically — Alberta, Saskatchewan, and the territories charge no land transfer tax at all, while Ontario and BC have graduated rates that can reach 2-3% on higher-priced homes. Toronto buyers pay an additional municipal land transfer tax on top of the provincial tax. First-time buyers in Ontario get up to $4,000 rebate on the provincial tax." },
  { q: "What closing costs should I budget for in Canada?", a: "Budget 1.5-4% of the purchase price for closing costs. This includes: land transfer tax, legal fees ($1,500-$2,500), home inspection ($300-$600), title insurance ($150-$400), property tax adjustments, utility adjustments, and moving costs. If your down payment is under 20%, add CMHC insurance and any applicable provincial sales tax." },
  { q: "What are typical US mortgage closing costs?", a: "US closing costs typically range from 2-5% of the loan amount. Major items include: loan origination fee (0.5-1%), home appraisal ($500-$1,000), title search and insurance ($600-$2,500), escrow fee ($350-$1,000), home inspection ($300-$500), recording fees ($150-$500), and prepaid expenses including property taxes, homeowners insurance, and prepaid interest. State transfer taxes vary widely." },
  { q: "What is PMI and when can I remove it in the US?", a: "Private Mortgage Insurance (PMI) is required in the US when your down payment is less than 20%. It typically costs 0.5-1.5% of the loan amount per year. Under the Homeowners Protection Act, lenders must automatically cancel PMI when your loan balance reaches 78% of the original purchase price. You can also request removal at 80% loan-to-value." },
  { q: "What is the stress test in Canada?", a: "Canada's mortgage stress test requires you to qualify at the higher of your actual mortgage rate plus 2%, or 5.25% (the Bank of Canada's minimum qualifying rate). This means even if your actual rate is 5%, you must prove you can afford payments at 7%. It applies to all insured and uninsured mortgages." },
  { q: "What is bi-weekly vs monthly payment in Canada?", a: "Accelerated bi-weekly payments divide your monthly payment in half and pay it every two weeks — resulting in 26 half-payments per year (equivalent to 13 monthly payments). This extra payment per year can reduce a 25-year mortgage by 3-4 years and save tens of thousands in interest." },
  { q: "What first-time buyer programs exist in Canada?", a: "Key programs include: First Home Savings Account (FHSA) — contribute up to $8,000/year tax-free, max $40,000; Home Buyers' Plan (HBP) — withdraw up to $35,000 from RRSP tax-free; First-Time Home Buyer Incentive — government co-invests 5-10% in your home; GST/HST New Housing Rebate for new builds. Provincial and municipal programs also available." },
  { q: "What first-time buyer programs exist in the US?", a: "Programs include: FHA loans (3.5% down, lower credit requirements); VA loans (0% down for veterans); USDA loans (0% down for rural areas); Fannie Mae HomeReady and Freddie Mac Home Possible (3% down, flexible income requirements); First-time buyer tax credit; Down payment assistance programs vary by state and city." },
];

const BUYING_STEPS = [
  {
    phase: "Preparation",
    color: "#16a34a",
    steps: [
      { title: "Check your credit score", desc: "Canada: 680+ for best rates. US: 620+ minimum, 740+ for best rates. Check for errors — 20% of credit reports have mistakes that hurt your score.", action: "Improve score 6 months before applying" },
      { title: "Calculate what you can afford", desc: "Use the affordability tab. Rule of thumb: housing costs should not exceed 28% of gross income (front-end DTI). Total debts should not exceed 43% (back-end DTI).", action: "Complete the affordability check" },
      { title: "Save for down payment + closing costs", desc: "Down payment + closing costs (1.5-5% of purchase price) + emergency fund (3-6 months expenses). Most buyers underestimate closing costs.", action: "Open FHSA (Canada) or dedicated savings account" },
      { title: "Get mortgage pre-approval", desc: "A pre-approval letter shows sellers you are serious and locks in a rate for 90-120 days. Required documents: 2 years of tax returns/NOAs, pay stubs, bank statements, employment letter.", action: "Apply with 2-3 lenders and compare" },
    ]
  },
  {
    phase: "House Hunting",
    color: "#0284c7",
    steps: [
      { title: "Find a real estate agent", desc: "In Canada, the buyer's agent is typically paid by the seller. In the US, commission structures changed in 2024 — clarify upfront. Look for someone with local market knowledge.", action: "Interview 3 agents before choosing" },
      { title: "Define your must-haves vs nice-to-haves", desc: "Bedrooms, bathrooms, location, school district, commute, parking, outdoor space. Be realistic about what you can afford in your target area.", action: "Create a priority list before viewing homes" },
      { title: "Research neighbourhoods", desc: "Walk scores, school ratings, crime statistics, future development plans, flood zones, noise levels, transit access. Visit at different times of day.", action: "Visit shortlisted neighbourhoods on weekdays and weekends" },
      { title: "View multiple properties", desc: "See at least 10-15 homes before making an offer. Take notes and photos. Look past decor — focus on structure, layout, natural light, storage.", action: "Use a property comparison checklist" },
    ]
  },
  {
    phase: "Making an Offer",
    color: "#7c3aed",
    steps: [
      { title: "Research comparable sales", desc: "Your agent should provide a Comparative Market Analysis (CMA). Look at similar homes sold in last 90 days within 1km. Avoid overpaying in a cooling market.", action: "Review 5-10 recent comparable sales" },
      { title: "Decide on offer conditions", desc: "Common conditions: subject to financing, subject to inspection, subject to sale of existing home. In hot markets, some buyers waive conditions — understand the risk.", action: "Never waive home inspection in writing without seeing it first" },
      { title: "Submit your offer", desc: "Include purchase price, deposit amount (typically 5%), closing date, and any conditions. In Canada, your lawyer reviews the offer. In the US, a real estate attorney may be required by state.", action: "Allow 24-48 hours for seller response" },
      { title: "Negotiate", desc: "Sellers may counter at a higher price or different terms. Know your maximum price before entering negotiations. Consider asking for appliances, closing cost help, or repair credits.", action: "Stick to your pre-approved budget" },
    ]
  },
  {
    phase: "Due Diligence",
    color: "#d97706",
    steps: [
      { title: "Home inspection", desc: "A licensed inspector checks structure, roof, foundation, electrical, plumbing, HVAC, insulation. Cost: $300-$600. Never skip this. Major issues found: negotiate price reduction or repairs.", action: "Attend the inspection in person — ask questions" },
      { title: "Property appraisal", desc: "Your lender orders an appraisal to confirm the home is worth the purchase price. If appraised value is lower than offer, you may need to renegotiate or cover the difference.", action: "Arranged by your lender — budget $500-$800" },
      { title: "Title search", desc: "A lawyer/notary searches public records for any liens, encumbrances, or legal issues on the property. Title insurance protects you if issues are found after closing.", action: "Get owner's title insurance — it's worth it" },
      { title: "Review strata/condo documents (if applicable)", desc: "For condos/stratas: review meeting minutes (2 years), financial statements, depreciation report, bylaws, and special assessments. Look for deferred maintenance and pending lawsuits.", action: "Have a lawyer review condo documents" },
    ]
  },
  {
    phase: "Financing",
    color: "#059669",
    steps: [
      { title: "Finalize your mortgage", desc: "Provide all required documents to your lender. They will complete underwriting — verifying income, assets, property, and credit. Avoid any major purchases or new credit during this period.", action: "Do not change jobs or make large purchases before closing" },
      { title: "Lock your interest rate", desc: "Canada: most lenders offer 90-120 day rate holds. US: rate lock typically 30-60 days. In a rising rate environment, lock as early as possible.", action: "Ask your lender about rate lock terms" },
      { title: "Get home insurance", desc: "Required by your lender before closing. Shop multiple insurers — rates vary by 30-50%. Ensure coverage includes replacement value, not market value.", action: "Get quotes from 3+ insurers" },
      { title: "Review closing disclosure / mortgage commitment", desc: "Canada: receive mortgage commitment letter. US: receive Closing Disclosure 3 business days before closing. Review every line for errors. Compare to your original Loan Estimate.", action: "Have your lawyer review all documents" },
    ]
  },
  {
    phase: "Closing Day",
    color: "#dc2626",
    steps: [
      { title: "Final walkthrough", desc: "24-48 hours before closing, walk through the property to confirm condition matches the offer, any agreed repairs were completed, and all included appliances/fixtures are present.", action: "Bring your offer conditions checklist" },
      { title: "Bring your funds", desc: "Bring a certified cheque or bank draft for closing costs + down payment balance. Wire transfers may also be accepted. Personal cheques are usually not accepted.", action: "Confirm the exact amount with your lawyer 48 hours before" },
      { title: "Sign documents", desc: "Sign mortgage documents, title transfer, and other legal paperwork. In Canada, your lawyer handles this. In the US, an escrow or title company handles closing.", action: "Allow 2-3 hours for document signing" },
      { title: "Get your keys!", desc: "Once funds are confirmed and title is transferred, you receive the keys. Change the locks immediately. Document the condition of every room with photos.", action: "Change all locks on closing day" },
    ]
  },
  {
    phase: "After Closing",
    color: "#0891b2",
    steps: [
      { title: "Set up mortgage payments", desc: "Confirm your first payment date. Set up automatic payments. Consider bi-weekly accelerated payments to pay off faster and save on interest.", action: "Switch to accelerated bi-weekly to save years off your mortgage" },
      { title: "Update your address everywhere", desc: "CRA/IRS, employer, bank, insurance, driver's license, health card, subscriptions, Canada Post/USPS mail forwarding.", action: "Start address changes before moving day" },
      { title: "Budget for ongoing costs", desc: "Property tax (if not in mortgage payments), insurance, utilities, maintenance (budget 1-3% of home value per year), condo fees if applicable.", action: "Build a home maintenance fund immediately" },
      { title: "Track your home equity", desc: "Your equity grows as you pay down the mortgage and as the home appreciates. You can leverage equity for renovations, investments, or emergency funds in the future.", action: "Review equity annually" },
    ]
  },
];

const GLOSSARY = [
  { term: "Amortization", def: "The total length of time to pay off your mortgage. In Canada max 25 years for insured mortgages. In the US, 30 years is most common." },
  { term: "Mortgage Term", def: "The period your interest rate is locked in. In Canada, terms are typically 1-5 years, then you renew. In the US, 30-year fixed rates are common." },
  { term: "CMHC Insurance", def: "Canadian mortgage default insurance required when down payment is under 20%. Premium is 2.8-4% of mortgage amount added to your loan." },
  { term: "PMI", def: "Private Mortgage Insurance in the US. Required when down payment is under 20%. Typically 0.5-1.5% of loan per year. Removed at 78-80% LTV." },
  { term: "Stress Test (Canada)", def: "You must qualify at your rate + 2%, or 5.25%, whichever is higher. Ensures you can afford payments if rates rise." },
  { term: "LTV (Loan to Value)", def: "Your mortgage amount divided by the home's value. 80% LTV = 20% down payment. Higher LTV = more risk = higher rate or PMI/CMHC required." },
  { term: "DTI (Debt to Income)", def: "Total monthly debt payments divided by gross monthly income. Front-end: housing costs only (max 28-32%). Back-end: all debts (max 43%)." },
  { term: "Fixed Rate", def: "Your interest rate stays the same for the entire term/loan period. Predictable payments. Better when rates are expected to rise." },
  { term: "Variable Rate", def: "Your interest rate fluctuates with the prime lending rate. Lower initial rate but payments can increase. Better when rates are expected to fall." },
  { term: "Land Transfer Tax", def: "One-time provincial/state tax paid at closing on the purchase price. Varies by province — Alberta charges nothing, Toronto charges double (provincial + municipal)." },
  { term: "Closing Costs", def: "One-time fees paid at closing beyond the down payment. Budget 1.5-4% of purchase price in Canada, 2-5% of loan in the US." },
  { term: "Pre-Approval", def: "Lender confirms how much they will lend based on your income, credit, and assets. Valid 90-120 days. Locks in rate in Canada." },
  { term: "Home Equity", def: "Home value minus outstanding mortgage balance. Grows as you pay down the mortgage and as the home appreciates in value." },
  { term: "FHSA (Canada)", def: "First Home Savings Account — contribute up to $8,000/year ($40,000 lifetime), tax-deductible like RRSP, grows tax-free, withdrawn tax-free for first home." },
  { term: "HBP (Canada)", def: "Home Buyers' Plan — withdraw up to $35,000 from RRSP tax-free for first home purchase. Must repay over 15 years." },
  { term: "Escrow (US)", def: "An account held by a third party to hold funds during the transaction. After closing, lenders may hold monthly tax and insurance payments in escrow." },
  { term: "Title Insurance", def: "Protects against losses from title defects, liens, or ownership disputes. One-time premium at closing. Highly recommended for all buyers." },
  { term: "Open vs Closed Mortgage (Canada)", def: "Open: can pay off anytime without penalty but higher rate. Closed: lower rate but prepayment penalties apply. Most buyers choose closed with prepayment privileges." },
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MortgageCalculator() {
  const [country, setCountry] = useState("CA");
  const [province, setProvince] = useState("ON");
  const [usState, setUsState] = useState("CA");
  const [city, setCity] = useState("");
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [homePrice, setHomePrice] = useState(700000);
  const [downPct, setDownPct] = useState(10);
  const [rate, setRate] = useState(country === "CA" ? 5.5 : 6.5);
  const [years, setYears] = useState(country === "CA" ? 25 : 30);
  const [taxes, setTaxes] = useState(400);
  const [insurance, setInsurance] = useState(150);
  const [hoa, setHoa] = useState(0);
  const [income, setIncome] = useState(120000);
  const [otherDebts, setOtherDebts] = useState(500);
  const [compareRate, setCompareRate] = useState(country === "CA" ? 6.5 : 7.5);
  const [compareYears, setCompareYears] = useState(country === "CA" ? 25 : 30);
  const [rentAmount, setRentAmount] = useState(2500);
  const [appreciation, setAppreciation] = useState(3);
  const [tab, setTab] = useState("calculator");
  const [openFaq, setOpenFaq] = useState(null);
  const [openGlossary, setOpenGlossary] = useState(null);
  const [lightMode, setLightMode] = useState(() => localStorage.getItem("mh_theme") === "light");
  const [copied, setCopied] = useState(false);
  const [payFreq, setPayFreq] = useState("monthly");
  const [expandedStep, setExpandedStep] = useState(null);
  const [amortView, setAmortView] = useState("annual");
  const [renewalBalance, setRenewalBalance] = useState(400000);
  const [renewalOldRate, setRenewalOldRate] = useState(3.5);
  const [renewalNewRate, setRenewalNewRate] = useState(5.5);
  const [renewalYearsLeft, setRenewalYearsLeft] = useState(20);
  const [renewalPenalty, setRenewalPenalty] = useState(3000);
  const [refiBalance, setRefiBalance] = useState(400000);
  const [refiOldRate, setRefiOldRate] = useState(6.5);
  const [refiNewRate, setRefiNewRate] = useState(5.0);
  const [refiYearsLeft, setRefiYearsLeft] = useState(20);
  const [refiPenalty, setRefiPenalty] = useState(4000);
  const [refiCashOut, setRefiCashOut] = useState(0);
  const [propertyMode, setPropertyMode] = useState("owner");
  const [rentalIncome, setRentalIncome] = useState(2800);
  const [vacancyRate, setVacancyRate] = useState(5);
  const [rentalExpenses, setRentalExpenses] = useState(300);
  const [compareMode, setCompareMode] = useState("scenarios");

  useEffect(() => { localStorage.setItem("mh_theme", lightMode ? "light" : "dark"); }, [lightMode]);

  const lm = lightMode;

  // Core calculations
  const downAmt = homePrice * (downPct / 100);
  const cmhc = country === "CA" ? calcCMHC(homePrice, downPct, province) : { premium: 0, tax: 0, total: 0 };
  const loanAmt = homePrice - downAmt + cmhc.premium;
  const usPmi = country === "US" && downPct < 20 ? (loanAmt * 0.01) / 12 : 0;
  const pi = calcMonthly(loanAmt, rate, years);
  const totalMonthly = pi + taxes + insurance + hoa + usPmi;

  // Payment frequency
  const paymentDisplays = {
    monthly: { label: "Monthly", amount: totalMonthly, multiplier: 1 },
    biweekly: { label: "Bi-weekly", amount: totalMonthly * 12 / 26, multiplier: 26 / 12 },
    biweeklyAccel: { label: "Accelerated bi-weekly", amount: totalMonthly / 2, multiplier: 26 / 12 },
    weekly: { label: "Weekly", amount: totalMonthly * 12 / 52, multiplier: 52 / 12 },
  };
  const currentPayment = paymentDisplays[payFreq];

  const totalInterest = pi * years * 12 - (loanAmt - cmhc.premium);
  const ltt = country === "CA" ? calcCanadaLTT(homePrice, province, isFirstTime, city) : { total: 0, provincial: 0, municipal: 0, provincialRebate: 0, municipalRebate: 0 };
  const usCosts = country === "US" ? calcUSClosingCosts(loanAmt, homePrice, usState, isFirstTime) : null;

  // Canada closing costs estimate
  const caClosingCosts = country === "CA" ? {
    ltt: ltt.total,
    legal: 1800,
    inspection: 450,
    titleInsurance: 300,
    appraisal: 500,
    cmhcTax: cmhc.tax,
    propertyTaxAdj: taxes,
    moving: 2000,
    total: ltt.total + 1800 + 450 + 300 + 500 + cmhc.tax + taxes + 2000,
  } : null;

  const monthlyIncome = income / 12;
  const frontDTI = (totalMonthly / monthlyIncome) * 100;
  const backDTI = ((totalMonthly + otherDebts) / monthlyIncome) * 100;
  const stressTestRate = Math.max(rate + 2, 5.25);
  const stressTestPayment = calcMonthly(loanAmt, stressTestRate, years);
  const stressTestDTI = ((stressTestPayment + taxes + insurance + hoa + otherDebts) / monthlyIncome) * 100;

  // Amortization
  const amortRows = buildAmortization(loanAmt, rate, years);
  const annualRows = Array.from({ length: years }, (_, i) => {
    const yr = amortRows.slice(i * 12, (i + 1) * 12);
    return {
      year: i + 1,
      principal: yr.reduce((s, r) => s + r.principal, 0),
      interest: yr.reduce((s, r) => s + r.interest, 0),
      balance: yr[yr.length - 1]?.balance || 0,
    };
  });

  // Compare
  const comparePI = calcMonthly(loanAmt, compareRate, compareYears);
  const compareTotalInterest = comparePI * compareYears * 12 - (loanAmt - cmhc.premium);

  // Rent vs buy
  const breakeven = (() => {
    for (let m = 1; m <= years * 12; m++) {
      const row = amortRows[m - 1];
      if (!row) break;
      const equity = downAmt + amortRows.slice(0, m).reduce((s, r) => s + r.principal, 0) + homePrice * (Math.pow(1 + appreciation / 100, m / 12) - 1);
      const rentSaved = rentAmount * m;
      const buyExtra = totalMonthly * m;
      if (equity > buyExtra - rentSaved + downAmt && m > 24) return m;
    }
    return null;
  })();

  const dtiColor = backDTI < 36 ? "#22c55e" : backDTI < 43 ? "#f59e0b" : "#ef4444";

  const copy = () => {
    const text = `MortgageHive Summary — ${country === "CA" ? province : usState}
Home Price: ${fmtC(homePrice)}
Down Payment: ${fmtC(downAmt)} (${downPct}%)
Loan Amount: ${fmtC(loanAmt)}
Rate: ${rate}% · ${years} years
${country === "CA" && cmhc.premium > 0 ? `CMHC Insurance: ${fmtC(cmhc.premium)} (PST at closing: ${fmtC(cmhc.tax)})\n` : ""}
Monthly Payment: ${fmtC(totalMonthly)}
  P&I: ${fmtC(pi)}
  Taxes: ${fmtC(taxes)}
  Insurance: ${fmtC(insurance)}
${hoa > 0 ? `  HOA: ${fmtC(hoa)}\n` : ""}
Total Interest: ${fmtC(totalInterest)}
${country === "CA" ? `Land Transfer Tax: ${fmtC(ltt.total)}` : `Estimated Closing Costs: ${fmtC(usCosts?.total || 0)}`}

Calculated at MortgageHive.app`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const minDown = country === "CA"
    ? (homePrice <= 500000 ? 5 : homePrice >= 1000000 ? 20 : ((25000 + (homePrice - 500000) * 0.1) / homePrice * 100))
    : 3;

  return (
    <div style={{ fontFamily: "'DM Sans','Plus Jakarta Sans',system-ui,sans-serif", background: lm ? "#f8faf5" : "#0a160b", color: lm ? "#1a2e1c" : "#e8f5e9", minHeight: "100vh", overflowX: "hidden", transition: "background 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
        :root{
          --bg:${lm?"#f8faf5":"#0a160b"};
          --bg2:${lm?"#ffffff":"#111f12"};
          --bg3:${lm?"#eef4eb":"#172619"};
          --border:${lm?"rgba(22,163,74,0.18)":"rgba(74,222,128,0.15)"};
          --border2:${lm?"rgba(22,163,74,0.09)":"rgba(74,222,128,0.08)"};
          --green:${lm?"#15803d":"#4ade80"};
          --green-dim:${lm?"rgba(21,128,61,0.1)":"rgba(74,222,128,0.1)"};
          --gold:${lm?"#92400e":"#fbbf24"};
          --text:${lm?"#1a2e1c":"#e8f5e9"};
          --text2:${lm?"#4a6741":"#86a887"};
          --text3:${lm?"#8aa882":"#4a6741"};
          --red:#ef4444;--amber:#f59e0b;--blue:#3b82f6;
          --radius:14px;
        }
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:var(--bg);font-family:'DM Sans',system-ui}
        input,button,select{font-family:'DM Sans',system-ui}
        button{cursor:pointer;border:none;background:none;color:inherit}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:var(--bg2)}
        ::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
        .fade-in{animation:fadeIn 0.3s ease}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .tab-btn{padding:9px 16px;border-radius:9px;font-size:12px;font-weight:700;transition:all 0.2s;color:var(--text2);border:1px solid transparent;white-space:nowrap;cursor:pointer}
        .tab-btn:hover{color:var(--text);background:var(--green-dim)}
        .tab-btn.active{background:var(--green-dim);border-color:var(--border);color:var(--green)}
        .card{background:var(--bg2);border:1px solid var(--border2);border-radius:var(--radius);padding:18px}
        .label{font-size:11px;font-weight:700;color:var(--text2);margin-bottom:5px;display:flex;justify-content:space-between}
        .val{font-size:13px;font-weight:800;color:var(--green);font-family:'DM Mono',monospace}
        .range{width:100%;accent-color:var(--green);cursor:pointer;height:4px}
        .num-input{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--text);font-size:13px;outline:none;font-family:'DM Mono',monospace}
        .num-input:focus{border-color:var(--green)}
        .select{background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-size:13px;outline:none;width:100%}
        .br-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border2);font-size:13px}
        .br-row:last-child{border-bottom:none}
        .faq-item{border-bottom:1px solid var(--border2)}
        .faq-q{padding:16px 0;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:14px;font-weight:600;gap:12px;color:var(--text)}
        .faq-q:hover{color:var(--green)}
        .faq-a{font-size:13px;color:var(--text2);line-height:1.75;padding-bottom:16px}
        .step-card{border:1px solid var(--border2);border-radius:12px;overflow:hidden;margin-bottom:8px;transition:border-color 0.2s}
        .step-card:hover{border-color:var(--border)}
        .step-header{padding:14px 16px;display:flex;align-items:center;gap:10px;cursor:pointer}
        .step-body{padding:0 16px 14px;font-size:13px;color:var(--text2);line-height:1.7}
        .dti-bar{height:7px;border-radius:4px;background:var(--bg3);overflow:hidden;margin-top:5px}
        .dti-fill{height:100%;border-radius:4px;transition:width 0.5s}
        .grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
        .mono{font-family:'DM Mono',monospace}
        .chip{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid}
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--border2)", background: "var(--bg2)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#15803d,#166534)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏠</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.5px" }}>Mortgage<span style={{ color: "var(--green)" }}>Hive</span></div>
              <div style={{ fontSize: 10, color: "var(--text2)", fontWeight: 600 }}>Complete guide for Canada & US · No signup</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {/* Country selector */}
            <div style={{ display: "flex", gap: 4, background: "var(--bg3)", borderRadius: 8, padding: 3 }}>
              {["CA", "US"].map(c => (
                <button key={c} onClick={() => { setCountry(c); setRate(c === "CA" ? 5.5 : 6.5); setYears(c === "CA" ? 25 : 30); setDownPct(c === "CA" ? 10 : 10); setHomePrice(c === "CA" ? 700000 : 500000); }} style={{ padding: "5px 14px", borderRadius: 6, background: country === c ? "var(--green)" : "transparent", color: country === c ? "#fff" : "var(--text2)", fontSize: 12, fontWeight: 700 }}>
                  {c === "CA" ? "🇨🇦 Canada" : "🇺🇸 US"}
                </button>
              ))}
            </div>
            <button onClick={() => setLightMode(v => !v)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontSize: 15 }}>{lightMode ? "🌙" : "☀️"}</button>
            <button onClick={copy} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: copied ? "var(--green-dim)" : "transparent", color: copied ? "var(--green)" : "var(--text2)", fontSize: 12, fontWeight: 700 }}>
              {copied ? "✓ Copied!" : "📋 Share"}
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "18px 16px 80px" }}>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border2)", paddingBottom: 10, overflowX: "auto" }}>
          {[
            ["calculator","🏠 Calculator"],
            ["closing","💰 Closing Costs"],
            ["affordability","💳 Affordability"],
            ["compare","⚖️ Compare"],
            ["rentbuy","📊 Rent vs Buy"],
            ["amortization","📅 Schedule"],
            ["steps","📋 Buying Steps"],
            ["glossary","📖 Glossary"],
          ].map(([id, label]) => (
            <button key={id} className={`tab-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {/* ── CALCULATOR TAB ── */}
        {tab === "calculator" && (
          <div className="fade-in">
            <div className="grid2">
              {/* LEFT */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="card">
                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, color: "var(--text)" }}>Home details</div>

                  {/* Location */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                    <div>
                      <div className="label"><span>{country === "CA" ? "Province" : "State"}</span></div>
                      {country === "CA" ? (
                        <select className="select" value={province} onChange={e => setProvince(e.target.value)}>
                          {CA_PROVINCES.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                        </select>
                      ) : (
                        <select className="select" value={usState} onChange={e => setUsState(e.target.value)}>
                          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                    </div>
                    {country === "CA" && province === "ON" && (
                      <div>
                        <div className="label"><span>City (for Toronto MLTT)</span></div>
                        <select className="select" value={city} onChange={e => setCity(e.target.value)}>
                          <option value="">Other Ontario</option>
                          <option value="Toronto">Toronto</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <div className="label"><span>First-time buyer?</span></div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {["Yes", "No"].map(v => (
                          <button key={v} onClick={() => setIsFirstTime(v === "Yes")} style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${isFirstTime === (v === "Yes") ? "var(--green)" : "var(--border2)"}`, background: isFirstTime === (v === "Yes") ? "var(--green-dim)" : "transparent", color: isFirstTime === (v === "Yes") ? "var(--green)" : "var(--text2)", fontSize: 13, fontWeight: 700 }}>
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Home price */}
                  <div style={{ marginBottom: 14 }}>
                    <div className="label"><span>Home price</span><span className="val">{fmtC(homePrice)}</span></div>
                    <input type="range" className="range" min={country === "CA" ? 100000 : 50000} max={country === "CA" ? 3000000 : 2000000} step={country === "CA" ? 25000 : 10000} value={homePrice} onChange={e => setHomePrice(+e.target.value)} />
                  </div>

                  {/* Down payment */}
                  <div style={{ marginBottom: 4 }}>
                    <div className="label"><span>Down payment</span><span className="val">{downPct}% · {fmtC(downAmt)}</span></div>
                    <input type="range" className="range" min={Math.ceil(minDown)} max={50} step={1} value={downPct} onChange={e => setDownPct(+e.target.value)} />
                  </div>
                  {country === "CA" && downPct < 20 && (
                    <div style={{ fontSize: 11, color: "#f59e0b", marginBottom: 10, padding: "5px 10px", background: "rgba(245,158,11,0.08)", borderRadius: 6 }}>
                      ⚠️ CMHC insurance required · Premium: {fmtC(cmhc.premium)} added to mortgage
                      {cmhc.tax > 0 && ` · ${fmtC(cmhc.tax)} PST due at closing in ${province}`}
                    </div>
                  )}
                  {country === "US" && downPct < 20 && (
                    <div style={{ fontSize: 11, color: "#f59e0b", marginBottom: 10, padding: "5px 10px", background: "rgba(245,158,11,0.08)", borderRadius: 6 }}>
                      ⚠️ PMI required · Est. {fmtC(usPmi)}/mo until you reach 20% equity
                    </div>
                  )}

                  {/* Rate */}
                  <div style={{ marginBottom: 14 }}>
                    <div className="label"><span>Interest rate</span><span className="val">{rate}%</span></div>
                    <input type="range" className="range" min={1} max={12} step={0.05} value={rate} onChange={e => setRate(+e.target.value)} />
                    {country === "CA" && (
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>
                        Stress test qualifying rate: {Math.max(rate + 2, 5.25).toFixed(2)}%
                      </div>
                    )}
                  </div>

                  {/* Term */}
                  <div style={{ marginBottom: 14 }}>
                    <div className="label"><span>Amortization</span><span className="val">{years} years</span></div>
                    <div style={{ display: "flex", gap: 5 }}>
                      {(country === "CA" ? [20, 25] : [15, 20, 25, 30]).map(y => (
                        <button key={y} onClick={() => setYears(y)} style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${years === y ? "var(--green)" : "var(--border2)"}`, background: years === y ? "var(--green-dim)" : "transparent", color: years === y ? "var(--green)" : "var(--text2)", fontSize: 13, fontWeight: 700 }}>
                          {y}yr
                        </button>
                      ))}
                    </div>
                    {country === "CA" && downPct < 20 && years > 25 && (
                      <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>⚠️ CMHC insured mortgages max 25-year amortization</div>
                    )}
                  </div>

                  {/* Property mode */}
                  <div style={{ marginBottom: 14 }}>
                    <div className="label"><span>Property type</span></div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[["owner","🏠 Owner-occupied"],["rental","🏢 Rental / Investment"]].map(([key, label]) => (
                        <button key={key} onClick={() => setPropertyMode(key)} style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${propertyMode === key ? "var(--green)" : "var(--border2)"}`, background: propertyMode === key ? "var(--green-dim)" : "transparent", color: propertyMode === key ? "var(--green)" : "var(--text2)", fontSize: 12, fontWeight: 700 }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Rental inputs — only shown in rental mode */}
                  {propertyMode === "rental" && (
                    <div style={{ padding: "12px 14px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 10, marginBottom: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#3b82f6", marginBottom: 10 }}>🏢 Rental Analysis</div>
                      {[
                        { label: "Monthly rental income", val: rentalIncome, set: setRentalIncome },
                        { label: "Monthly expenses (maintenance, mgmt)", val: rentalExpenses, set: setRentalExpenses },
                      ].map(f => (
                        <div key={f.label} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
                          <input type="number" className="num-input" value={f.val} onChange={e => f.set(+e.target.value)} />
                        </div>
                      ))}
                      <div style={{ marginBottom: 8 }}>
                        <div className="label"><span>Vacancy rate</span><span className="val">{vacancyRate}%</span></div>
                        <input type="range" className="range" min={0} max={20} step={1} value={vacancyRate} onChange={e => setVacancyRate(+e.target.value)} />
                      </div>
                      {(() => {
                        const effectiveRent = rentalIncome * (1 - vacancyRate / 100);
                        const cashFlow = effectiveRent - totalMonthly - rentalExpenses;
                        const capRate = ((effectiveRent - rentalExpenses) * 12 / homePrice * 100);
                        const cashOnCash = (cashFlow * 12 / downAmt * 100);
                        return (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(59,130,246,0.15)" }}>
                            {[
                              { label: "Effective monthly rent", val: fmtC(effectiveRent), color: "var(--green)" },
                              { label: "Monthly cash flow", val: fmtC(cashFlow), color: cashFlow >= 0 ? "var(--green)" : "var(--red)" },
                              { label: "Annual cash flow", val: fmtC(cashFlow * 12), color: cashFlow >= 0 ? "var(--green)" : "var(--red)" },
                              { label: "Cap rate", val: capRate.toFixed(2) + "%", color: capRate >= 5 ? "var(--green)" : "var(--amber)" },
                              { label: "Cash-on-cash return", val: cashOnCash.toFixed(2) + "%", color: cashOnCash >= 8 ? "var(--green)" : "var(--amber)" },
                            ].map(r => (
                              <div key={r.label} className="br-row">
                                <span style={{ color: "var(--text2)", fontSize: 12 }}>{r.label}</span>
                                <span style={{ color: r.color, fontWeight: 800, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{r.val}</span>
                              </div>
                            ))}
                            <div style={{ marginTop: 8, fontSize: 11, color: "#3b82f6", lineHeight: 1.6 }}>
                              {cashFlow >= 0 ? "✅ Positive cash flow — this property generates income above costs." : `⚠️ Negative cash flow of ${fmtC(Math.abs(cashFlow))}/mo — you'll need to supplement from other income.`}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  {/* Payment frequency */}
                  <div style={{ marginBottom: 0 }}>
                    <div className="label"><span>Payment frequency</span></div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                      {Object.entries(paymentDisplays).map(([key, pd]) => (
                        <button key={key} onClick={() => setPayFreq(key)} style={{ padding: "7px", borderRadius: 8, border: `1px solid ${payFreq === key ? "var(--green)" : "var(--border2)"}`, background: payFreq === key ? "var(--green-dim)" : "transparent", color: payFreq === key ? "var(--green)" : "var(--text2)", fontSize: 11, fontWeight: 700 }}>
                          {pd.label}
                        </button>
                      ))}
                    </div>
                    {payFreq === "biweeklyAccel" && (
                      <div style={{ fontSize: 11, color: "var(--green)", marginTop: 4 }}>✅ Accelerated bi-weekly saves years off your mortgage</div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10, color: "var(--text)" }}>Monthly costs <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text3)" }}>(most calculators hide these)</span></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { label: "Property taxes/mo", val: taxes, set: setTaxes },
                      { label: "Home insurance/mo", val: insurance, set: setInsurance },
                      { label: `${country === "CA" ? "Condo" : "HOA"} fees/mo`, val: hoa, set: setHoa },
                    ].map(f => (
                      <div key={f.label}>
                        <div style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
                        <input type="number" className="num-input" value={f.val} onChange={e => f.set(+e.target.value)} min={0} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Main result */}
                <div className="card" style={{ background: lm ? "linear-gradient(135deg,#f0fdf4,#fff)" : "linear-gradient(135deg,#111f12,#0a160b)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 12, color: "var(--text2)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{currentPayment.label} payment</div>
                  <div style={{ fontSize: 44, fontWeight: 900, color: "var(--green)", fontFamily: "'DM Mono',monospace", letterSpacing: "-1px", lineHeight: 1 }}>{fmtC(currentPayment.amount)}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4, marginBottom: 16 }}>{rate}% · {years}-year amortization · {fmtC(loanAmt)} loan</div>

                  {/* Breakdown */}
                  <div>
                    {[
                      { label: "Principal & Interest", val: pi, color: "var(--green)" },
                      { label: "Property Taxes", val: taxes, color: "var(--text)" },
                      { label: "Home Insurance", val: insurance, color: "var(--text)" },
                      ...(hoa > 0 ? [{ label: country === "CA" ? "Condo Fees" : "HOA Fees", val: hoa, color: "var(--text)" }] : []),
                      ...(country === "US" && usPmi > 0 ? [{ label: "PMI", val: usPmi, color: "var(--amber)" }] : []),
                    ].map(r => (
                      <div key={r.label} className="br-row">
                        <span style={{ color: "var(--text2)" }}>{r.label}</span>
                        <span style={{ color: r.color, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{fmtC(r.val)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Loan summary */}
                <div className="card">
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10, color: "var(--text)" }}>Loan summary</div>
                  {[
                    { label: "Home price", val: fmtC(homePrice) },
                    { label: "Down payment", val: `${fmtC(downAmt)} (${downPct}%)` },
                    { label: "Loan amount", val: fmtC(loanAmt) },
                    ...(country === "CA" && cmhc.premium > 0 ? [{ label: "CMHC premium (added to loan)", val: fmtC(cmhc.premium), color: "var(--amber)" }] : []),
                    { label: "Total interest paid", val: fmtC(totalInterest), color: "var(--red)" },
                    { label: "Total cost of home", val: fmtC(homePrice + totalInterest + (country === "CA" ? ltt.total + 1800 + 450 + 300 : usCosts?.total || 0)), color: "var(--text)" },
                  ].map(r => (
                    <div key={r.label} className="br-row">
                      <span style={{ color: "var(--text2)", fontSize: 13 }}>{r.label}</span>
                      <span style={{ color: r.color || "var(--text)", fontWeight: 700, fontFamily: "'DM Mono',monospace", fontSize: 13 }}>{r.val}</span>
                    </div>
                  ))}
                </div>

                {/* Visual breakdown */}
                <div className="card">
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>Payment breakdown</div>
                  <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", gap: 1, marginBottom: 10 }}>
                    {[
                      { pct: pi / totalMonthly, color: "#16a34a" },
                      { pct: taxes / totalMonthly, color: "#f59e0b" },
                      { pct: insurance / totalMonthly, color: "#3b82f6" },
                      ...(hoa > 0 ? [{ pct: hoa / totalMonthly, color: "#8b5cf6" }] : []),
                      ...(usPmi > 0 ? [{ pct: usPmi / totalMonthly, color: "#ef4444" }] : []),
                    ].map((b, i) => (
                      <div key={i} style={{ flex: b.pct * 100, background: b.color, minWidth: 2 }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {[
                      { label: "P&I", pct: (pi / totalMonthly * 100).toFixed(0), color: "#16a34a" },
                      { label: "Taxes", pct: (taxes / totalMonthly * 100).toFixed(0), color: "#f59e0b" },
                      { label: "Insurance", pct: (insurance / totalMonthly * 100).toFixed(0), color: "#3b82f6" },
                      ...(hoa > 0 ? [{ label: "HOA/Condo", pct: (hoa / totalMonthly * 100).toFixed(0), color: "#8b5cf6" }] : []),
                      ...(usPmi > 0 ? [{ label: "PMI", pct: (usPmi / totalMonthly * 100).toFixed(0), color: "#ef4444" }] : []),
                    ].map(b => (
                      <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 9, height: 9, borderRadius: 2, background: b.color }} />
                        <span style={{ fontSize: 11, color: "var(--text2)" }}>{b.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text)", fontFamily: "'DM Mono',monospace" }}>{b.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Canada stress test */}
                {country === "CA" && (
                  <div className="card" style={{ border: "1px solid rgba(59,130,246,0.3)", background: lm ? "rgba(59,130,246,0.04)" : "rgba(59,130,246,0.06)" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#3b82f6", marginBottom: 8 }}>🇨🇦 Stress Test Check</div>
                    <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 8 }}>You must qualify at {Math.max(rate + 2, 5.25).toFixed(2)}% (your rate + 2% or 5.25%, whichever is higher)</div>
                    {[
                      { label: "Stress test payment", val: fmtC(stressTestPayment + taxes + insurance + hoa) },
                      { label: "Stress test DTI", val: stressTestDTI.toFixed(1) + "%", color: stressTestDTI < 44 ? "var(--green)" : "var(--red)" },
                      { label: "Result", val: stressTestDTI < 44 ? "✅ You qualify" : "❌ May not qualify", color: stressTestDTI < 44 ? "var(--green)" : "var(--red)" },
                    ].map(r => (
                      <div key={r.label} className="br-row">
                        <span style={{ color: "var(--text2)", fontSize: 12 }}>{r.label}</span>
                        <span style={{ color: r.color || "var(--text)", fontWeight: 700, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── CLOSING COSTS TAB ── */}
        {tab === "closing" && (
          <div className="fade-in">
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, color: "var(--text)" }}>
              {country === "CA" ? "🇨🇦 Canadian Closing Costs" : "🇺🇸 US Closing Costs"}
            </div>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 20 }}>
              {country === "CA"
                ? "These are the real costs most buyers discover too late. Budget 1.5-4% of purchase price on top of your down payment."
                : "US closing costs typically range from 2-5% of the loan amount. These are due at closing and cannot be rolled into the mortgage."}
            </p>

            {country === "CA" && (
              <div className="grid2">
                {/* Land Transfer Tax */}
                <div className="card">
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "var(--text)" }}>Land Transfer Tax — {CA_PROVINCES.find(p => p.code === province)?.name}</div>
                  {province === "AB" || province === "SK" || province === "NT" || province === "NU" || province === "YT" ? (
                    <div style={{ padding: "12px", background: "rgba(74,222,128,0.08)", borderRadius: 8, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: "var(--green)", fontFamily: "'DM Mono',monospace" }}>$0</div>
                      <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>✅ {CA_PROVINCES.find(p => p.code === province)?.name} has no land transfer tax!</div>
                    </div>
                  ) : (
                    <>
                      {[
                        { label: "Provincial LTT", val: fmtC(ltt.provincial) },
                        ...(ltt.municipalRebate > 0 || ltt.municipal > 0 ? [{ label: "Toronto Municipal LTT", val: fmtC(ltt.municipal) }] : []),
                        ...(ltt.provincialRebate > 0 ? [{ label: `First-time buyer rebate (${province})`, val: `-${fmtC(ltt.provincialRebate)}`, color: "var(--green)" }] : []),
                        ...(ltt.municipalRebate > 0 ? [{ label: "First-time buyer rebate (Toronto)", val: `-${fmtC(ltt.municipalRebate)}`, color: "var(--green)" }] : []),
                        { label: "Total LTT payable", val: fmtC(ltt.total), bold: true },
                      ].map(r => (
                        <div key={r.label} className="br-row">
                          <span style={{ color: "var(--text2)", fontSize: 13 }}>{r.label}</span>
                          <span style={{ color: r.color || "var(--text)", fontWeight: r.bold ? 800 : 600, fontFamily: "'DM Mono',monospace" }}>{r.val}</span>
                        </div>
                      ))}
                      {isFirstTime && (province === "ON" || province === "BC" || province === "MB" || province === "PE") && (
                        <div style={{ marginTop: 8, padding: "8px 10px", background: "var(--green-dim)", borderRadius: 6, fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
                          ✅ First-time buyer rebate applied — you save {fmtC(ltt.provincialRebate + ltt.municipalRebate)}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* CMHC */}
                <div className="card">
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "var(--text)" }}>CMHC Mortgage Insurance</div>
                  {downPct >= 20 ? (
                    <div style={{ padding: "12px", background: "rgba(74,222,128,0.08)", borderRadius: 8, border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: "var(--green)", fontFamily: "'DM Mono',monospace" }}>$0</div>
                      <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>✅ 20%+ down payment — no CMHC insurance required</div>
                    </div>
                  ) : homePrice > 1500000 ? (
                    <div style={{ padding: "12px", background: "rgba(239,68,68,0.06)", borderRadius: 8 }}>
                      <div style={{ fontSize: 13, color: "var(--red)" }}>❌ CMHC insurance not available for homes over $1.5M. Minimum 20% down required.</div>
                    </div>
                  ) : (
                    <>
                      {[
                        { label: "Down payment %", val: downPct.toFixed(1) + "%" },
                        { label: `CMHC premium rate (${cmhc.rate ? (cmhc.rate * 100).toFixed(1) : 0}%)`, val: fmtC(cmhc.premium) },
                        { label: "Added to mortgage", val: fmtC(cmhc.premium), color: "var(--amber)" },
                        ...(cmhc.tax > 0 ? [{ label: `${province} PST on premium (due at closing!)`, val: fmtC(cmhc.tax), color: "var(--red)", bold: true }] : []),
                      ].map(r => (
                        <div key={r.label} className="br-row">
                          <span style={{ color: "var(--text2)", fontSize: 12 }}>{r.label}</span>
                          <span style={{ color: r.color || "var(--text)", fontWeight: r.bold ? 800 : 600, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{r.val}</span>
                        </div>
                      ))}
                      {cmhc.tax > 0 && (
                        <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(239,68,68,0.08)", borderRadius: 6, fontSize: 12, color: "var(--red)" }}>
                          ⚠️ The {fmtC(cmhc.tax)} PST must be paid in cash at closing — it cannot be added to your mortgage. Many first-time buyers miss this!
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* All closing costs */}
                <div className="card" style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "var(--text)" }}>Complete Closing Cost Estimate</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginBottom: 14 }}>
                    {[
                      { label: "Land transfer tax", val: ltt.total, note: province === "AB" ? "None in Alberta!" : undefined },
                      { label: "Legal / notary fees", val: 1800, note: "Avg $1,500-$2,500" },
                      { label: "Home inspection", val: 450, note: "Avg $300-$600" },
                      { label: "Title insurance", val: 300, note: "Highly recommended" },
                      { label: "Property appraisal", val: 500, note: "If required by lender" },
                      { label: "CMHC PST (if applicable)", val: cmhc.tax, note: province === "ON" || province === "QC" || province === "SK" ? "Due in cash at closing" : "Not applicable in " + province },
                      { label: "Property tax adjustment", val: taxes, note: "Varies by closing date" },
                      { label: "Moving costs", val: 2000, note: "Estimate" },
                    ].map(item => (
                      <div key={item.label} style={{ background: "var(--bg3)", borderRadius: 10, padding: "12px" }}>
                        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: item.val === 0 ? "var(--green)" : "var(--text)", fontFamily: "'DM Mono',monospace" }}>{fmtC(item.val)}</div>
                        {item.note && <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{item.note}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: "14px", background: "var(--green-dim)", borderRadius: 10, border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "var(--text2)", fontWeight: 700 }}>Estimated total closing costs</div>
                      <div style={{ fontSize: 11, color: "var(--text3)" }}>Plus your down payment of {fmtC(downAmt)}</div>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "var(--green)", fontFamily: "'DM Mono',monospace" }}>{fmtC(caClosingCosts?.total || 0)}</div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: "var(--text3)" }}>
                    Total cash needed at closing: <strong style={{ color: "var(--text)" }}>{fmtC((caClosingCosts?.total || 0) + downAmt)}</strong>
                  </div>
                </div>

                {/* Newcomer to Canada section */}
                <div className="card" style={{ gridColumn: "1 / -1", border: "1px solid rgba(59,130,246,0.25)", background: lm ? "rgba(59,130,246,0.03)" : "rgba(59,130,246,0.05)" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#3b82f6" }}>🌍 New to Canada? Here's what you need to know</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
                    {[
                      { title: "Who can buy?", icon: "🏠", detail: "Permanent Residents (PR) and Canadian citizens can buy without restrictions. Temporary residents (work/study permits) can buy but foreign buyer rules may apply depending on province. The federal foreign buyer ban (2023-2025) has ended as of January 1, 2025.", color: "#3b82f6" },
                      { title: "Down payment rules for newcomers", icon: "💰", detail: "If you have less than 2 years of Canadian credit history, lenders may require a larger down payment (typically 20-35%). Using international credit history from the US, UK, or Australia is sometimes accepted by major banks.", color: "#16a34a" },
                      { title: "Building credit in Canada", icon: "📈", detail: "Get a secured credit card immediately upon arrival. Pay all bills on time. Apply for a credit card with your bank. It takes 6-12 months to build enough Canadian credit history for mortgage approval.", color: "#f59e0b" },
                      { title: "CMHC for newcomers", icon: "🛡️", detail: "CMHC insured mortgages are available to newcomers with valid work or study permits. You must occupy the property as your principal residence. Non-permanent residents pay the same CMHC premiums as citizens.", color: "#7c3aed" },
                      { title: "Non-Resident Speculation Tax", icon: "⚠️", detail: "Ontario charges a 25% Non-Resident Speculation Tax (NRST) on homes bought by foreign nationals. BC charges a 20% Foreign Buyer Tax. Exemptions exist for permanent residents and those with work permits in certain regions.", color: "#ef4444" },
                      { title: "Documents lenders need", icon: "📋", detail: "Work/study permit, passport, 3-6 months Canadian bank statements, proof of Canadian income (pay stubs, letter of employment), 2 years international income history, credit report (Canadian + international if available).", color: "#059669" },
                    ].map(item => (
                      <div key={item.title} style={{ background: "var(--bg3)", borderRadius: 10, padding: "14px", borderLeft: `3px solid ${item.color}` }}>
                        <div style={{ fontSize: 18, marginBottom: 5 }}>{item.icon}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.65 }}>{item.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* First-time buyer programs */}
                <div className="card" style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "var(--text)" }}>🇨🇦 First-Time Buyer Programs (Canada)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                    {[
                      { name: "First Home Savings Account (FHSA)", detail: "Contribute up to $8,000/year ($40,000 lifetime). Tax-deductible contributions. Tax-free growth and withdrawals for first home.", badge: "New 2023", color: "#16a34a" },
                      { name: "Home Buyers' Plan (HBP)", detail: "Withdraw up to $35,000 from RRSP tax-free. Must repay over 15 years starting 2 years after withdrawal.", badge: "RRSP", color: "#0284c7" },
                      { name: "First-Time Home Buyer Tax Credit", detail: "Non-refundable federal tax credit of $10,000 (15% × $10,000 = $1,500 tax savings). Claim on your tax return.", badge: "Federal", color: "#7c3aed" },
                      { name: "GST/HST New Housing Rebate", detail: "Rebate of up to 36% of the GST or federal portion of the HST paid on new construction homes. Maximum $6,300.", badge: "New builds", color: "#d97706" },
                      { name: "Land Transfer Tax Rebate", detail: isFirstTime && (province === "ON" || province === "BC" || province === "MB" || province === "PE") ? `You qualify for ${fmtC(ltt.provincialRebate + ltt.municipalRebate)} rebate in ${province}!` : `Check your province — Ontario up to $4,000, Toronto up to $8,475 combined`, badge: "Provincial", color: "#059669" },
                    ].map(p => (
                      <div key={p.name} style={{ background: "var(--bg3)", borderRadius: 10, padding: "14px", borderLeft: `3px solid ${p.color}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{p.name}</div>
                          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: p.color + "22", color: p.color, fontWeight: 700, flexShrink: 0 }}>{p.badge}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{p.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {country === "US" && usCosts && (
              <div className="grid2">
                <div className="card">
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "var(--text)" }}>Closing Cost Breakdown</div>
                  {usCosts.items.map(item => (
                    <div key={item.label} className="br-row">
                      <span style={{ color: "var(--text2)", fontSize: 13 }}>{item.label}</span>
                      <span style={{ color: "var(--text)", fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>{fmtC(item.amount)}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 10, padding: "12px", background: "var(--green-dim)", borderRadius: 8, border: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, color: "var(--text)" }}>Total estimated closing costs</span>
                    <span style={{ fontWeight: 900, color: "var(--green)", fontFamily: "'DM Mono',monospace", fontSize: 18 }}>{fmtC(usCosts.total)}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--text3)" }}>
                    Total cash needed at closing: <strong style={{ color: "var(--text)" }}>{fmtC(usCosts.total + downAmt)}</strong>
                    {" "}(closing costs + {downPct}% down payment)
                  </div>
                </div>

                <div className="card">
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "var(--text)" }}>🇺🇸 First-Time Buyer Programs (US)</div>
                  {[
                    { name: "FHA Loan", detail: "3.5% minimum down payment with 580+ credit score (10% with 500-579). Backed by Federal Housing Administration.", badge: "3.5% down" },
                    { name: "VA Loan", detail: "0% down payment for eligible veterans, service members, and surviving spouses. No PMI required. Competitive rates.", badge: "0% down" },
                    { name: "USDA Loan", detail: "0% down payment for homes in eligible rural and suburban areas. Income limits apply.", badge: "Rural" },
                    { name: "Fannie Mae HomeReady", detail: "3% minimum down payment. Flexible income sources allowed. Reduced PMI for qualifying buyers.", badge: "3% down" },
                    { name: "Down Payment Assistance", detail: "Many states and cities offer grants and forgivable loans for down payment assistance. Check your state HFA.", badge: "State programs" },
                  ].map(p => (
                    <div key={p.name} style={{ padding: "10px 0", borderBottom: "1px solid var(--border2)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{p.name}</span>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "var(--green-dim)", color: "var(--green)", fontWeight: 700 }}>{p.badge}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{p.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AFFORDABILITY TAB ── */}
        {tab === "affordability" && (
          <div className="fade-in">
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, color: "var(--text)" }}>Affordability Checker</div>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 20 }}>Will a lender approve you? Check your debt-to-income ratio and maximum home price.</p>

            <div className="grid2">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="card">
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "var(--text)" }}>Your income & debts</div>
                  {[
                    { label: "Annual gross income", val: income, set: setIncome },
                    { label: "Other monthly debts (car, student loans, credit cards)", val: otherDebts, set: setOtherDebts },
                  ].map(f => (
                    <div key={f.label} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
                      <input type="number" className="num-input" value={f.val} onChange={e => f.set(+e.target.value)} />
                    </div>
                  ))}
                </div>

                <div className="card" style={{ background: lm ? "linear-gradient(135deg,#f0fdf4,#fff)" : "linear-gradient(135deg,#111f12,#0a160b)" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14, color: "var(--text)" }}>DTI Analysis</div>

                  {[
                    { label: "Front-end DTI (housing only)", pct: frontDTI, max: country === "CA" ? 32 : 28, color: frontDTI < (country === "CA" ? 32 : 28) ? "#22c55e" : "#f59e0b" },
                    { label: "Back-end DTI (all debts)", pct: backDTI, max: 44, color: dtiColor },
                    ...(country === "CA" ? [{ label: "Stress test DTI", pct: stressTestDTI, max: 44, color: stressTestDTI < 44 ? "#22c55e" : "#ef4444" }] : []),
                  ].map(d => (
                    <div key={d.label} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "var(--text2)" }}>{d.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: d.color, fontFamily: "'DM Mono',monospace" }}>{d.pct.toFixed(1)}%</span>
                      </div>
                      <div className="dti-bar">
                        <div className="dti-fill" style={{ width: `${Math.min(d.pct, 100)}%`, background: d.color }} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>Lenders prefer below {d.max}%</div>
                    </div>
                  ))}

                  <div style={{ padding: "12px", background: "var(--bg3)", borderRadius: 10, marginTop: 4 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: dtiColor, marginBottom: 4 }}>
                      {backDTI < 36 ? "✅ Strong" : backDTI < 43 ? "⚠️ Acceptable" : "❌ Too High"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
                      {backDTI < 36 ? "Your DTI is strong. Most lenders will approve you with competitive rates." :
                        backDTI < 43 ? "Your DTI is acceptable but some lenders may require a larger down payment or higher rate." :
                          "Your DTI exceeds lender limits. Consider a lower home price, larger down payment, or paying down debts first."}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="card">
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "var(--text)" }}>Maximum home price at your income</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { rule: country === "CA" ? "32% front-end rule" : "28% front-end rule", maxMonthly: monthlyIncome * (country === "CA" ? 0.32 : 0.28), label: "Conservative" },
                      { rule: "36% back-end rule", maxMonthly: monthlyIncome * 0.36 - otherDebts, label: "Standard" },
                      { rule: "44% maximum DTI", maxMonthly: monthlyIncome * 0.44 - otherDebts, label: "Maximum" },
                    ].map(r => {
                      const maxPI = r.maxMonthly - taxes - insurance - hoa;
                      const n = years * 12;
                      const mr = rate / 100 / 12;
                      const maxLoan = maxPI > 0 ? maxPI * (Math.pow(1 + mr, n) - 1) / (mr * Math.pow(1 + mr, n)) : 0;
                      const maxPrice = maxLoan / (1 - downPct / 100);
                      return (
                        <div key={r.rule} style={{ background: "var(--bg3)", borderRadius: 10, padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 2 }}>{r.rule}</div>
                            <div style={{ fontSize: 11, color: "var(--text3)" }}>{r.label}</div>
                          </div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--green)", fontFamily: "'DM Mono',monospace" }}>{fmtK(Math.max(0, maxPrice))}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="card">
                  <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "var(--text)" }}>Credit score guide</div>
                  {[
                    { range: country === "CA" ? "760+" : "740+", label: "Excellent", detail: "Best rates available", color: "#22c55e" },
                    { range: country === "CA" ? "720-759" : "700-739", label: "Very Good", detail: "Competitive rates", color: "#86efac" },
                    { range: country === "CA" ? "680-719" : "660-699", label: "Good", detail: "Most products available", color: "#f59e0b" },
                    { range: country === "CA" ? "620-679" : "620-659", label: "Fair", detail: "Limited options, higher rates", color: "#f87171" },
                    { range: country === "CA" ? "Below 620" : "Below 620", label: "Poor", detail: "FHA/alternative lenders only", color: "#ef4444" },
                  ].map(c => (
                    <div key={c.range} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--border2)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{c.range} — {c.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{c.detail}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── COMPARE TAB ── */}
        {tab === "compare" && (
          <div className="fade-in">
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, color: "var(--text)" }}>Compare & Renew</div>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 14 }}>Compare scenarios or calculate your mortgage renewal impact.</p>
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "var(--bg3)", borderRadius: 10, padding: 4, width: "fit-content" }}>
              {[["scenarios","⚖️ Scenario Compare"],["renewal","🔄 Renewal Calculator"],["refi","💳 Refinance Calculator"]].map(([key, label]) => (
                <button key={key} onClick={() => setCompareMode(key)} style={{ padding: "8px 16px", borderRadius: 8, background: compareMode === key ? "var(--bg2)" : "transparent", border: compareMode === key ? "1px solid var(--border)" : "1px solid transparent", color: compareMode === key ? "var(--green)" : "var(--text2)", fontSize: 12, fontWeight: 700, transition: "all 0.2s" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Renewal Calculator */}
            {compareMode === "renewal" && (() => {
              const oldPayment = calcMonthly(renewalBalance, renewalOldRate, renewalYearsLeft);
              const newPayment = calcMonthly(renewalBalance, renewalNewRate, renewalYearsLeft);
              const diff = newPayment - oldPayment;
              const oldTotal = oldPayment * renewalYearsLeft * 12;
              const newTotal = newPayment * renewalYearsLeft * 12;
              const totalInterestOld = oldTotal - renewalBalance;
              const totalInterestNew = newTotal - renewalBalance;
              return (
                <div>
                  <div className="grid2" style={{ marginBottom: 14 }}>
                    <div className="card">
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>Your renewal details</div>
                      {[
                        { label: "Remaining mortgage balance", val: renewalBalance, set: setRenewalBalance, min: 10000, max: 2000000, step: 5000 },
                        { label: "Current rate (%)", val: renewalOldRate, set: setRenewalOldRate, min: 0.5, max: 12, step: 0.05 },
                        { label: "New offered rate (%)", val: renewalNewRate, set: setRenewalNewRate, min: 0.5, max: 12, step: 0.05 },
                        { label: "Years remaining", val: renewalYearsLeft, set: setRenewalYearsLeft, min: 1, max: 25, step: 1 },
                        { label: "Prepayment penalty (if breaking early)", val: renewalPenalty, set: setRenewalPenalty, min: 0, max: 30000, step: 100 },
                      ].map(f => (
                        <div key={f.label} style={{ marginBottom: 10 }}>
                          <div className="label"><span style={{ fontSize: 11 }}>{f.label}</span><span className="val">{f.label.includes("%") ? f.val + "%" : f.label.includes("Years") ? f.val + " yrs" : fmtC(f.val)}</span></div>
                          <input type="range" className="range" min={f.min} max={f.max} step={f.step} value={f.val} onChange={e => f.set(+e.target.value)} />
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="card" style={{ marginBottom: 12, background: lm ? "linear-gradient(135deg,#f0fdf4,#fff)" : "linear-gradient(135deg,#111f12,#0a160b)", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 12, color: "var(--text2)", fontWeight: 700, marginBottom: 6 }}>Payment change at renewal</div>
                        <div style={{ fontSize: 40, fontWeight: 900, color: diff > 0 ? "var(--red)" : "var(--green)", fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>
                          {diff > 0 ? "+" : ""}{fmtC(diff)}<span style={{ fontSize: 14 }}>/mo</span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
                          {diff > 0 ? "Your payment will increase at renewal" : diff < 0 ? "Your payment will decrease at renewal" : "No change to your payment"}
                        </div>
                      </div>
                      <div className="card">
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>Full comparison</div>
                        {[
                          { label: "Current payment", val: fmtC(oldPayment) },
                          { label: "New payment at " + renewalNewRate + "%", val: fmtC(newPayment), color: diff > 0 ? "var(--red)" : "var(--green)" },
                          { label: "Monthly difference", val: (diff > 0 ? "+" : "") + fmtC(diff), color: diff > 0 ? "var(--red)" : "var(--green)" },
                          { label: "Annual difference", val: (diff > 0 ? "+" : "") + fmtC(diff * 12), color: diff > 0 ? "var(--red)" : "var(--green)" },
                          { label: "Total interest at old rate", val: fmtC(totalInterestOld) },
                          { label: "Total interest at new rate", val: fmtC(totalInterestNew), color: totalInterestNew > totalInterestOld ? "var(--red)" : "var(--green)" },
                          { label: "Interest difference", val: fmtC(Math.abs(totalInterestNew - totalInterestOld)), color: totalInterestNew > totalInterestOld ? "var(--red)" : "var(--green)" },
                        ].map(r => (
                          <div key={r.label} className="br-row">
                            <span style={{ color: "var(--text2)", fontSize: 12 }}>{r.label}</span>
                            <span style={{ color: r.color || "var(--text)", fontWeight: 700, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{r.val}</span>
                          </div>
                        ))}
                        {renewalPenalty > 0 && (
                          <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(245,158,11,0.08)", borderRadius: 8, fontSize: 12, color: "var(--amber)" }}>
                            ⚠️ After prepayment penalty of {fmtC(renewalPenalty)}, you break even on refinancing in {Math.ceil(renewalPenalty / Math.abs(diff))} months.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="card" style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.2)" }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#3b82f6", marginBottom: 8 }}>💡 Renewal tips from mortgage professionals</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
                      {[
                        { tip: "Start shopping 4 months early", detail: "Most lenders allow early renewal 120 days before maturity with no penalty. This gives you leverage to negotiate." },
                        { tip: "Don't just go with your current lender", detail: "Your renewal offer is usually not their best rate. Get quotes from 2-3 lenders and a mortgage broker before signing." },
                        { tip: "Consider a shorter term if rates are high", detail: "If you believe rates will fall, a 2-3 year term lets you lock in a better rate sooner than a 5-year term." },
                        { tip: "Negotiate prepayment privileges", detail: "Ask for 20% annual lump-sum prepayment and 20% payment increase privileges. These let you pay off faster without penalty." },
                      ].map(t => (
                        <div key={t.tip} style={{ padding: "10px 12px", background: "var(--bg3)", borderRadius: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>{t.tip}</div>
                          <div style={{ fontSize: 11, color: "var(--text2)", lineHeight: 1.55 }}>{t.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Refinance Calculator */}
            {compareMode === "refi" && (() => {
              const oldPayment = calcMonthly(refiBalance, refiOldRate, refiYearsLeft);
              const newLoan = refiBalance + refiCashOut;
              const newPayment = calcMonthly(newLoan, refiNewRate, refiYearsLeft);
              const monthlySavings = oldPayment - newPayment;
              const breakEvenMonths = monthlySavings > 0 ? Math.ceil(refiPenalty / monthlySavings) : null;
              return (
                <div>
                  <div className="grid2" style={{ marginBottom: 14 }}>
                    <div className="card">
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>Refinance details</div>
                      {[
                        { label: "Current mortgage balance", val: refiBalance, set: setRefiBalance, min: 10000, max: 2000000, step: 5000 },
                        { label: "Current rate (%)", val: refiOldRate, set: setRefiOldRate, min: 0.5, max: 12, step: 0.05 },
                        { label: "New rate (%)", val: refiNewRate, set: setRefiNewRate, min: 0.5, max: 12, step: 0.05 },
                        { label: "Years remaining", val: refiYearsLeft, set: setRefiYearsLeft, min: 1, max: 25, step: 1 },
                        { label: "Prepayment / break penalty", val: refiPenalty, set: setRefiPenalty, min: 0, max: 50000, step: 100 },
                        { label: "Cash-out amount (optional)", val: refiCashOut, set: setRefiCashOut, min: 0, max: 200000, step: 1000 },
                      ].map(f => (
                        <div key={f.label} style={{ marginBottom: 10 }}>
                          <div className="label"><span style={{ fontSize: 11 }}>{f.label}</span><span className="val">{f.label.includes("%") ? f.val + "%" : f.label.includes("Years") ? f.val + " yrs" : fmtC(f.val)}</span></div>
                          <input type="range" className="range" min={f.min} max={f.max} step={f.step} value={f.val} onChange={e => f.set(+e.target.value)} />
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="card" style={{ marginBottom: 12, background: lm ? "linear-gradient(135deg,#f0fdf4,#fff)" : "linear-gradient(135deg,#111f12,#0a160b)", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 12, color: "var(--text2)", fontWeight: 700, marginBottom: 6 }}>
                          {monthlySavings > 0 ? "Monthly savings" : "Monthly increase"}
                        </div>
                        <div style={{ fontSize: 40, fontWeight: 900, color: monthlySavings > 0 ? "var(--green)" : "var(--red)", fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>
                          {monthlySavings > 0 ? "" : "+"}{fmtC(Math.abs(monthlySavings))}<span style={{ fontSize: 14 }}>/mo</span>
                        </div>
                        {breakEvenMonths && monthlySavings > 0 && (
                          <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>
                            Break even in <strong style={{ color: "var(--green)" }}>{breakEvenMonths} months</strong> after penalty
                          </div>
                        )}
                      </div>
                      <div className="card">
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>Refinance analysis</div>
                        {[
                          { label: "Current payment", val: fmtC(oldPayment) },
                          { label: "New payment", val: fmtC(newPayment), color: newPayment < oldPayment ? "var(--green)" : "var(--red)" },
                          { label: "Monthly savings", val: fmtC(monthlySavings), color: monthlySavings > 0 ? "var(--green)" : "var(--red)" },
                          { label: "New loan amount", val: fmtC(newLoan) },
                          { label: "Prepayment penalty", val: fmtC(refiPenalty), color: "var(--amber)" },
                          ...(breakEvenMonths ? [{ label: "Break-even point", val: breakEvenMonths + " months", color: breakEvenMonths < 24 ? "var(--green)" : "var(--amber)" }] : []),
                          ...(refiCashOut > 0 ? [{ label: "Cash out", val: fmtC(refiCashOut), color: "var(--blue)" }] : []),
                        ].map(r => (
                          <div key={r.label} className="br-row">
                            <span style={{ color: "var(--text2)", fontSize: 12 }}>{r.label}</span>
                            <span style={{ color: r.color || "var(--text)", fontWeight: 700, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{r.val}</span>
                          </div>
                        ))}
                        <div style={{ marginTop: 10, padding: "8px 10px", background: monthlySavings > 0 && (breakEvenMonths || 0) < 24 ? "var(--green-dim)" : "rgba(245,158,11,0.08)", borderRadius: 8, fontSize: 12, color: monthlySavings > 0 && (breakEvenMonths || 0) < 24 ? "var(--green)" : "var(--amber)" }}>
                          {monthlySavings <= 0 ? "⚠️ Refinancing increases your payment at this rate. Consider waiting for rates to fall further." :
                            !breakEvenMonths ? "✅ Immediate savings with no penalty." :
                            breakEvenMonths < 24 ? `✅ Strong candidate for refinancing — you break even in under 2 years.` :
                            `⚠️ Break-even takes ${breakEvenMonths} months. Only worthwhile if you plan to stay long-term.`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Original scenario comparison — shown when compareMode === "scenarios" */}
            {compareMode === "scenarios" && (
            <div className="grid2">
              <div className="card" style={{ border: "2px solid var(--green)" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--green)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Scenario A — Current</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: "var(--green)", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>{fmtC(pi)}<span style={{ fontSize: 14 }}>/mo</span></div>
                <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 14 }}>{rate}% · {years}-year · {fmtC(loanAmt)} loan</div>
                {[
                  { label: "Total interest", val: fmtC(totalInterest) },
                  { label: "Total P&I paid", val: fmtC(pi * years * 12) },
                  { label: "Paid off year", val: (new Date().getFullYear() + years).toString() },
                ].map(r => (
                  <div key={r.label} className="br-row"><span style={{ color: "var(--text2)", fontSize: 12 }}>{r.label}</span><span style={{ fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{r.val}</span></div>
                ))}
              </div>

              <div className="card">
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Scenario B — Compare</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: "var(--gold)", fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>{fmtC(comparePI)}<span style={{ fontSize: 14 }}>/mo</span></div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 3 }}>Rate %</div>
                    <input type="number" className="num-input" value={compareRate} step="0.05" onChange={e => setCompareRate(+e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 3 }}>Years</div>
                    <select className="select" value={compareYears} onChange={e => setCompareYears(+e.target.value)}>
                      {[10,15,20,25,30].map(y => <option key={y} value={y}>{y} years</option>)}
                    </select>
                  </div>
                </div>
                {[
                  { label: "Total interest", val: fmtC(compareTotalInterest) },
                  { label: "Total P&I paid", val: fmtC(comparePI * compareYears * 12) },
                  { label: "Paid off year", val: (new Date().getFullYear() + compareYears).toString() },
                ].map(r => (
                  <div key={r.label} className="br-row"><span style={{ color: "var(--text2)", fontSize: 12 }}>{r.label}</span><span style={{ fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{r.val}</span></div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginTop: 14, background: lm ? "linear-gradient(135deg,#f0fdf4,#fff)" : "linear-gradient(135deg,#111f12,#0a160b)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, color: "var(--text)" }}>The difference</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
                {[
                  { label: "Monthly payment diff.", val: fmtC(Math.abs(pi - comparePI)), note: pi > comparePI ? "A saves more/mo" : "B saves more/mo" },
                  { label: "Total interest diff.", val: fmtC(Math.abs(totalInterest - compareTotalInterest)), note: totalInterest > compareTotalInterest ? "A costs more overall" : "B costs more overall" },
                  { label: "Years diff.", val: Math.abs(years - compareYears) + " years", note: years > compareYears ? "B pays off faster" : "A pays off faster" },
                ].map(r => (
                  <div key={r.label} style={{ background: "var(--bg3)", borderRadius: 10, padding: "14px" }}>
                    <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>{r.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "var(--green)", fontFamily: "'DM Mono',monospace" }}>{r.val}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{r.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── RENT VS BUY TAB ── */}
        {tab === "rentbuy" && (
          <div className="fade-in">
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, color: "var(--text)" }}>Rent vs Buy</div>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 20 }}>See the exact year when buying becomes cheaper than renting.</p>
            <div className="grid2">
              <div className="card">
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>Your rent details</div>
                <div style={{ marginBottom: 14 }}>
                  <div className="label"><span>Current monthly rent</span><span className="val">{fmtC(rentAmount)}</span></div>
                  <input type="range" className="range" min={500} max={6000} step={50} value={rentAmount} onChange={e => setRentAmount(+e.target.value)} />
                </div>
                <div>
                  <div className="label"><span>Annual home appreciation</span><span className="val">{appreciation}%</span></div>
                  <input type="range" className="range" min={0} max={8} step={0.5} value={appreciation} onChange={e => setAppreciation(+e.target.value)} />
                </div>
              </div>

              <div className="card" style={{ background: lm ? "linear-gradient(135deg,#f0fdf4,#fff)" : "linear-gradient(135deg,#111f12,#0a160b)" }}>
                {breakeven ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)", marginBottom: 4 }}>Breakeven point</div>
                    <div style={{ fontSize: 52, fontWeight: 900, color: "var(--green)", fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>
                      {Math.ceil(breakeven / 12)}<span style={{ fontSize: 18, color: "var(--text2)" }}> yrs</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 6 }}>
                      If you stay longer than <strong style={{ color: "var(--green)" }}>{Math.ceil(breakeven / 12)} years</strong>, buying beats renting at {fmtC(rentAmount)}/mo.
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: 14, color: "var(--text2)" }}>At these numbers, buying doesn't become cheaper. Try a lower home price or higher rent.</p>
                )}
                <div style={{ marginTop: 12, display: "flex", gap: 16 }}>
                  <div><div style={{ fontSize: 11, color: "var(--text2)" }}>Monthly rent</div><div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'DM Mono',monospace" }}>{fmtC(rentAmount)}</div></div>
                  <div><div style={{ fontSize: 11, color: "var(--text2)" }}>Monthly mortgage</div><div style={{ fontSize: 16, fontWeight: 800, color: "var(--green)", fontFamily: "'DM Mono',monospace" }}>{fmtC(totalMonthly)}</div></div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>Year-by-year comparison</div>
              <div style={{ overflowX: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr 1fr", gap: 8, padding: "5px 10px", fontSize: 10, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase" }}>
                  <div>Year</div><div>Rent paid</div><div>Buy total</div><div>Home value</div><div>Equity</div>
                </div>
                <div style={{ maxHeight: 380, overflowY: "auto" }}>
                  {Array.from({ length: Math.min(years, 30) }, (_, i) => {
                    const yr = i + 1;
                    const rentPaid = rentAmount * 12 * yr;
                    const buyPaid = totalMonthly * 12 * yr;
                    const homeVal = homePrice * Math.pow(1 + appreciation / 100, yr);
                    const bal = annualRows[i]?.balance || 0;
                    const equity = homeVal - bal;
                    const isBreak = breakeven && yr === Math.ceil(breakeven / 12);
                    return (
                      <div key={yr} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr 1fr", gap: 8, padding: "7px 10px", fontSize: 12, borderRadius: 6, background: isBreak ? "var(--green-dim)" : "transparent", border: isBreak ? "1px solid var(--border)" : "1px solid transparent", fontFamily: "'DM Mono',monospace" }}>
                        <div style={{ fontWeight: 700, color: isBreak ? "var(--green)" : "var(--text2)" }}>{yr}{isBreak ? "⭐" : ""}</div>
                        <div>{fmtK(rentPaid)}</div>
                        <div>{fmtK(buyPaid)}</div>
                        <div>{fmtK(homeVal)}</div>
                        <div style={{ color: "var(--green)", fontWeight: 700 }}>{fmtK(equity)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── AMORTIZATION TAB ── */}
        {tab === "amortization" && (
          <div className="fade-in">
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, color: "var(--text)" }}>Amortization Schedule</div>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 16 }}>See how your loan is paid off over time and how much goes to interest vs principal each year.</p>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {[["annual","Annual"],["monthly","Monthly (first 60 months)"]].map(([id, label]) => (
                <button key={id} className={`tab-btn ${amortView === id ? "active" : ""}`} onClick={() => setAmortView(id)}>{label}</button>
              ))}
            </div>
            <div className="card">
              <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr 1fr", gap: 8, padding: "5px 10px", fontSize: 10, color: "var(--text3)", fontWeight: 700, textTransform: "uppercase" }}>
                <div>{amortView === "annual" ? "Year" : "Month"}</div>
                <div>Payment</div><div>Principal</div><div>Interest</div><div>Balance</div>
              </div>
              <div style={{ maxHeight: 440, overflowY: "auto" }}>
                {(amortView === "annual" ? annualRows : amortRows.slice(0, 60)).map((row, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr 1fr", gap: 8, padding: "7px 10px", fontSize: 12, borderRadius: 6, color: "var(--text2)", fontFamily: "'DM Mono',monospace" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ fontWeight: 700, color: "var(--text)" }}>{amortView === "annual" ? row.year : row.month}</div>
                    <div>{fmtC(amortView === "annual" ? row.principal + row.interest : row.payment)}</div>
                    <div style={{ color: "var(--green)" }}>{fmtC(row.principal)}</div>
                    <div style={{ color: "var(--red)" }}>{fmtC(row.interest)}</div>
                    <div>{fmtC(row.balance)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── BUYING STEPS TAB ── */}
        {tab === "steps" && (
          <div className="fade-in">
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, color: "var(--text)" }}>Complete Home Buying Guide</div>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 20 }}>Every step from preparation to closing day — for {country === "CA" ? "Canadian" : "US"} buyers. Click any step for details.</p>
            {BUYING_STEPS.map((phase, pi) => (
              <div key={phase.phase} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: phase.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{pi + 1}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{phase.phase}</div>
                </div>
                {phase.steps.map((step, si) => {
                  const key = `${pi}-${si}`;
                  const isOpen = expandedStep === key;
                  return (
                    <div key={step.title} className="step-card" style={{ borderLeftColor: isOpen ? phase.color : undefined, borderLeftWidth: isOpen ? 3 : 1 }}>
                      <div className="step-header" onClick={() => setExpandedStep(isOpen ? null : key)}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: isOpen ? phase.color : "var(--bg3)", border: `1px solid ${phase.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: isOpen ? "#fff" : phase.color, flexShrink: 0 }}>{si + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{step.title}</div>
                        </div>
                        <span style={{ color: phase.color, fontSize: 18, transform: isOpen ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
                      </div>
                      {isOpen && (
                        <div className="step-body">
                          <p style={{ marginBottom: 10 }}>{step.desc}</p>
                          <div style={{ padding: "8px 12px", background: phase.color + "15", borderRadius: 8, borderLeft: `3px solid ${phase.color}`, fontSize: 12, color: "var(--text)", fontWeight: 600 }}>
                            ✅ Action: {step.action}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* ── GLOSSARY TAB ── */}
        {tab === "glossary" && (
          <div className="fade-in">
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, color: "var(--text)" }}>Mortgage Glossary</div>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 20 }}>Every term explained in plain English — no jargon, no confusion.</p>
            <div className="card">
              {GLOSSARY.map((item, i) => (
                <div key={item.term} className="faq-item">
                  <div className="faq-q" onClick={() => setOpenGlossary(openGlossary === i ? null : i)}>
                    <span>{item.term}</span>
                    <span style={{ color: "var(--green)", fontSize: 18, flexShrink: 0, transform: openGlossary === i ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
                  </div>
                  {openGlossary === i && <div className="faq-a fade-in">{item.def}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FAQ ── */}
        <div style={{ marginTop: 48 }}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 18, color: "var(--text)" }}>
            Frequently Asked <span style={{ color: "var(--green)" }}>Questions</span>
          </div>
          <div className="card">
            {FAQ.map((item, i) => (
              <div key={i} className="faq-item">
                <div className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{item.q}</span>
                  <span style={{ color: "var(--green)", fontSize: 18, flexShrink: 0, transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
                </div>
                {openFaq === i && <div className="faq-a fade-in">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div style={{ marginTop: 32, padding: 22, background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 10, color: "var(--text)" }}>About <span style={{ color: "var(--green)" }}>MortgageHive</span></div>
          <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.8, marginBottom: 10 }}>
            MortgageHive is the most complete free mortgage calculator for Canada and the United States. Unlike other calculators, MortgageHive includes every real cost — CMHC insurance, provincial land transfer tax by province, PST on CMHC premiums, US state closing costs, PMI, taxes, insurance, HOA fees, and condo fees.
          </p>
          <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.8 }}>
            No signup required. No personal information collected. No spam. A complete mortgage guide in one free tool.
          </p>
        </div>

        <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border2)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 11, color: "var(--text3)" }}>
          <span>MortgageHive · Canada & US Mortgage Calculator</span>
          <span>Not financial advice · Consult a licensed mortgage professional</span>
        </div>
      </div>
    </div>
  );
}
