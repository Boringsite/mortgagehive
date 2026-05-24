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

// ── Auto-fill property tax from location ────────────────────────────────────
function getPropertyTaxFromLocation(country, province, usState, cityName) {
  if (country === "CA") {
    const provData = CA_PROPERTY_TAXES[province];
    if (!provData) return null;
    const cityData = provData.cities[cityName] || provData.cities["Other " + provData.label] || null;
    return cityData;
  } else {
    const stateData = US_PROPERTY_TAXES[usState];
    if (!stateData) return null;
    const cityData = stateData.cities[cityName] || stateData.cities["Other " + stateData.label] || null;
    return cityData;
  }
}

// ── Extra Payment Savings ────────────────────────────────────────────────────
function calcWithExtraPayment(principal, annualRate, years, extraMonthly) {
  if (annualRate === 0) return { months: years * 12, interest: 0 };
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const basePayment = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalPayment = basePayment + extraMonthly;
  let balance = principal;
  let months = 0;
  let totalInterest = 0;
  while (balance > 0 && months < n * 2) {
    const interest = balance * r;
    totalInterest += interest;
    const princ = Math.min(totalPayment - interest, balance);
    balance -= princ;
    months++;
    if (balance <= 0) break;
  }
  return { months, interest: totalInterest, basePayment, totalPayment };
}

// ── Points Buydown ────────────────────────────────────────────────────────────
function calcPointsBuydown(loanAmt, rate, years, numPoints, rateDropPerPoint) {
  const pointCost = loanAmt * (numPoints / 100);
  const newRate = Math.max(0.1, rate - numPoints * rateDropPerPoint);
  const oldPayment = calcMonthly2(loanAmt, rate, years);
  const newPayment = calcMonthly2(loanAmt, newRate, years);
  const monthlySavings = oldPayment - newPayment;
  const breakEvenMonths = monthlySavings > 0 ? Math.ceil(pointCost / monthlySavings) : null;
  const lifetimeSavings = monthlySavings > 0 ? monthlySavings * years * 12 - pointCost : -pointCost;
  return { pointCost, newRate, newPayment, oldPayment, monthlySavings, breakEvenMonths, lifetimeSavings };
}

function calcMonthly2(principal, annualRate, years) {
  if (annualRate === 0) return principal / (years * 12);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// ── GeoNames City Search + Tax Lookup ────────────────────────────────────────
async function searchCitiesGeoNames(query, country, setResults, setLoading) {
  if (query.length < 3) { setResults([]); return; }
  setLoading(true);
  try {
    const cc = country === "CA" ? "CA" : "US";
    const url = `https://secure.geonames.org/searchJSON?q=${encodeURIComponent(query)}&country=${cc}&maxRows=10&featureClass=P&orderby=population&style=MEDIUM&username=docvault`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status) { setLoading(false); setResults([]); return; }
    if (data.geonames) {
      setResults(data.geonames.map(g => ({
        name: g.name,
        adminName: g.adminName1 || "",
        adminName1: g.adminName1 || "",
        countryCode: g.countryCode || "",
        lat: parseFloat(g.lat) || 0,
        lng: parseFloat(g.lng) || 0,
        tz: g.timezone?.timeZoneId || g.timezone || null,
        pop: parseInt(g.population) || 0,
      })).filter(g => g.name));
    }
  } catch (e) { setResults([]); }
  setLoading(false);
}

// Map GeoNames admin region to our tax database key
const CA_PROV_MAP = {
  "Ontario": "ON", "British Columbia": "BC", "Alberta": "AB", "Quebec": "QC",
  "Manitoba": "MB", "Saskatchewan": "SK", "Nova Scotia": "NS", "New Brunswick": "NB",
  "Newfoundland and Labrador": "NL", "Newfoundland": "NL", "Prince Edward Island": "PE",
  "Northwest Territories": "NT", "Nunavut": "NU", "Yukon": "YT", "Yukon Territory": "YT",
};
const US_STATE_MAP = {
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
  "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA","Kansas":"KS",
  "Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD","Massachusetts":"MA",
  "Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO","Montana":"MT",
  "Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM",
  "New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK",
  "Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC",
  "South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT",
  "Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY",
  "District of Columbia":"DC","Washington, D.C.":"DC",
};

function getTaxForGeoCity(city, country, provinceCode, usStateCode) {
  const adminName = city.adminName1 || city.adminName || "";
  if (country === "CA") {
    // Resolve province code from GeoNames adminName1
    const prov = CA_PROV_MAP[adminName] || provinceCode;
    const provData = CA_PROPERTY_TAXES[prov];
    if (!provData) return { key: prov, cityKey: null, rate: 1.0, avg: 5000 };
    // Try exact city match (case-insensitive)
    const cityLower = city.name.toLowerCase();
    const exactMatch = Object.entries(provData.cities).find(([k]) =>
      k.toLowerCase() === cityLower ||
      k.toLowerCase().replace(/ on$/, "").replace(/ ca$/, "") === cityLower
    );
    if (exactMatch) return { key: prov, cityKey: exactMatch[0], ...exactMatch[1] };
    // Fall back to province average
    const fallbackKey = `Other ${provData.label}`;
    if (provData.cities[fallbackKey]) return { key: prov, cityKey: fallbackKey, ...provData.cities[fallbackKey] };
    // Last resort — use first city in province
    const firstCity = Object.values(provData.cities)[0];
    return { key: prov, cityKey: null, ...firstCity };
  } else {
    const state = US_STATE_MAP[adminName] || usStateCode;
    const stateData = US_PROPERTY_TAXES[state];
    if (!stateData) return { key: state, cityKey: null, rate: 1.0, avg: 4000 };
    const cityLower = city.name.toLowerCase();
    const exactMatch = Object.entries(stateData.cities).find(([k]) =>
      k.toLowerCase() === cityLower
    );
    if (exactMatch) return { key: state, cityKey: exactMatch[0], ...exactMatch[1] };
    const fallbackKey = `Other ${stateData.label}`;
    if (stateData.cities[fallbackKey]) return { key: state, cityKey: fallbackKey, ...stateData.cities[fallbackKey] };
    const firstCity = Object.values(stateData.cities)[0];
    return { key: state, cityKey: null, ...firstCity };
  }
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


// ── Property Tax Database ─────────────────────────────────────────────────────
// Canada: Annual property tax rate as % of assessed value by province/city
const CA_PROPERTY_TAXES = {
  ON: {
    label: "Ontario",
    cities: {
      "Toronto": { rate: 0.666, avg: 5200 },
      "Mississauga": { rate: 0.839, avg: 5800 },
      "Brampton": { rate: 1.045, avg: 7000 },
      "Hamilton": { rate: 1.262, avg: 7500 },
      "London": { rate: 1.323, avg: 6800 },
      "Ottawa": { rate: 1.123, avg: 7200 },
      "Kingston": { rate: 1.481, avg: 7000 },
      "Barrie": { rate: 1.316, avg: 6900 },
      "Kitchener": { rate: 1.136, avg: 6500 },
      "Windsor": { rate: 1.813, avg: 6200 },
      "Owen Sound": { rate: 1.680, avg: 5800 },
      "Sudbury": { rate: 1.546, avg: 5500 },
      "Thunder Bay": { rate: 1.781, avg: 5200 },
      "Other Ontario": { rate: 1.200, avg: 6000 },
    }
  },
  BC: {
    label: "British Columbia",
    cities: {
      "Vancouver": { rate: 0.298, avg: 3800 },
      "Surrey": { rate: 0.369, avg: 3500 },
      "Burnaby": { rate: 0.295, avg: 4200 },
      "Richmond": { rate: 0.327, avg: 3900 },
      "Kelowna": { rate: 0.526, avg: 4200 },
      "Victoria": { rate: 0.514, avg: 4500 },
      "Abbotsford": { rate: 0.512, avg: 4000 },
      "Kamloops": { rate: 0.714, avg: 4100 },
      "Prince George": { rate: 0.932, avg: 3800 },
      "Other BC": { rate: 0.450, avg: 4000 },
    }
  },
  AB: {
    label: "Alberta",
    cities: {
      "Calgary": { rate: 0.726, avg: 4200 },
      "Edmonton": { rate: 0.862, avg: 4500 },
      "Red Deer": { rate: 1.010, avg: 4000 },
      "Lethbridge": { rate: 1.080, avg: 3800 },
      "Medicine Hat": { rate: 1.020, avg: 3500 },
      "Airdrie": { rate: 0.695, avg: 3800 },
      "Other Alberta": { rate: 0.850, avg: 4000 },
    }
  },
  QC: {
    label: "Quebec",
    cities: {
      "Montreal": { rate: 0.776, avg: 3800 },
      "Quebec City": { rate: 1.040, avg: 3900 },
      "Laval": { rate: 0.888, avg: 3600 },
      "Longueuil": { rate: 1.050, avg: 3700 },
      "Gatineau": { rate: 1.100, avg: 3800 },
      "Sherbrooke": { rate: 1.200, avg: 3500 },
      "Other Quebec": { rate: 1.000, avg: 3700 },
    }
  },
  MB: {
    label: "Manitoba",
    cities: {
      "Winnipeg": { rate: 1.296, avg: 4200 },
      "Brandon": { rate: 1.690, avg: 3800 },
      "Other Manitoba": { rate: 1.400, avg: 4000 },
    }
  },
  SK: {
    label: "Saskatchewan",
    cities: {
      "Saskatoon": { rate: 1.048, avg: 3800 },
      "Regina": { rate: 1.361, avg: 4200 },
      "Prince Albert": { rate: 1.820, avg: 3500 },
      "Other Saskatchewan": { rate: 1.200, avg: 3800 },
    }
  },
  NS: {
    label: "Nova Scotia",
    cities: {
      "Halifax": { rate: 1.192, avg: 5200 },
      "Dartmouth": { rate: 1.192, avg: 4800 },
      "Other Nova Scotia": { rate: 1.400, avg: 4200 },
    }
  },
  NB: {
    label: "New Brunswick",
    cities: {
      "Moncton": { rate: 1.785, avg: 4500 },
      "Saint John": { rate: 2.130, avg: 4200 },
      "Fredericton": { rate: 1.615, avg: 4000 },
      "Other New Brunswick": { rate: 1.800, avg: 4000 },
    }
  },
  NL: {
    label: "Newfoundland",
    cities: {
      "St. John's": { rate: 0.810, avg: 3200 },
      "Other Newfoundland": { rate: 0.900, avg: 3000 },
    }
  },
  PE: {
    label: "PEI",
    cities: {
      "Charlottetown": { rate: 1.100, avg: 3500 },
      "Other PEI": { rate: 1.000, avg: 3200 },
    }
  },
  NT: { label: "NWT", cities: { "Yellowknife": { rate: 1.200, avg: 4000 }, "Other NWT": { rate: 1.000, avg: 3500 } } },
  NU: { label: "Nunavut", cities: { "Iqaluit": { rate: 0.800, avg: 3000 }, "Other Nunavut": { rate: 0.800, avg: 3000 } } },
  YT: { label: "Yukon", cities: { "Whitehorse": { rate: 0.640, avg: 3000 }, "Other Yukon": { rate: 0.640, avg: 3000 } } },
};

// US: Annual property tax rate as % of home value by state/city
const US_PROPERTY_TAXES = {
  AL: { label: "Alabama", cities: { "Birmingham": { rate: 0.67, avg: 2200 }, "Montgomery": { rate: 0.55, avg: 1800 }, "Huntsville": { rate: 0.52, avg: 2000 }, "Other Alabama": { rate: 0.60, avg: 1900 } } },
  AK: { label: "Alaska", cities: { "Anchorage": { rate: 1.22, avg: 4500 }, "Other Alaska": { rate: 1.10, avg: 4000 } } },
  AZ: { label: "Arizona", cities: { "Phoenix": { rate: 0.59, avg: 2400 }, "Scottsdale": { rate: 0.56, avg: 3200 }, "Tucson": { rate: 0.60, avg: 1800 }, "Mesa": { rate: 0.59, avg: 2200 }, "Other Arizona": { rate: 0.60, avg: 2200 } } },
  AR: { label: "Arkansas", cities: { "Little Rock": { rate: 0.64, avg: 1800 }, "Other Arkansas": { rate: 0.62, avg: 1600 } } },
  CA: { label: "California", cities: { "Los Angeles": { rate: 1.16, avg: 8500 }, "San Francisco": { rate: 0.74, avg: 9200 }, "San Diego": { rate: 0.76, avg: 6800 }, "San Jose": { rate: 0.80, avg: 10500 }, "Sacramento": { rate: 0.88, avg: 4800 }, "Fresno": { rate: 0.85, avg: 3200 }, "Other California": { rate: 0.76, avg: 6500 } } },
  CO: { label: "Colorado", cities: { "Denver": { rate: 0.49, avg: 3200 }, "Colorado Springs": { rate: 0.47, avg: 2400 }, "Aurora": { rate: 0.52, avg: 3000 }, "Boulder": { rate: 0.48, avg: 4200 }, "Other Colorado": { rate: 0.50, avg: 2800 } } },
  CT: { label: "Connecticut", cities: { "Hartford": { rate: 3.39, avg: 8500 }, "New Haven": { rate: 2.89, avg: 7200 }, "Stamford": { rate: 1.74, avg: 12000 }, "Other Connecticut": { rate: 2.14, avg: 7500 } } },
  DE: { label: "Delaware", cities: { "Wilmington": { rate: 1.77, avg: 3800 }, "Dover": { rate: 0.57, avg: 2000 }, "Other Delaware": { rate: 0.57, avg: 2200 } } },
  FL: { label: "Florida", cities: { "Miami": { rate: 0.97, avg: 5200 }, "Orlando": { rate: 0.91, avg: 3200 }, "Tampa": { rate: 0.90, avg: 3800 }, "Jacksonville": { rate: 0.89, avg: 3200 }, "Fort Lauderdale": { rate: 1.07, avg: 5800 }, "Sarasota": { rate: 0.83, avg: 4500 }, "Other Florida": { rate: 0.91, avg: 3800 } } },
  GA: { label: "Georgia", cities: { "Atlanta": { rate: 1.01, avg: 4500 }, "Savannah": { rate: 1.08, avg: 3200 }, "Augusta": { rate: 0.89, avg: 2200 }, "Other Georgia": { rate: 0.92, avg: 2800 } } },
  HI: { label: "Hawaii", cities: { "Honolulu": { rate: 0.31, avg: 2500 }, "Maui": { rate: 0.29, avg: 3200 }, "Other Hawaii": { rate: 0.30, avg: 2500 } } },
  ID: { label: "Idaho", cities: { "Boise": { rate: 0.63, avg: 3200 }, "Nampa": { rate: 0.72, avg: 2800 }, "Other Idaho": { rate: 0.63, avg: 2500 } } },
  IL: { label: "Illinois", cities: { "Chicago": { rate: 2.08, avg: 6800 }, "Aurora": { rate: 2.71, avg: 6200 }, "Rockford": { rate: 2.84, avg: 4500 }, "Springfield": { rate: 2.40, avg: 4200 }, "Other Illinois": { rate: 2.27, avg: 5500 } } },
  IN: { label: "Indiana", cities: { "Indianapolis": { rate: 0.85, avg: 2200 }, "Fort Wayne": { rate: 0.84, avg: 1800 }, "Evansville": { rate: 0.89, avg: 1800 }, "Other Indiana": { rate: 0.85, avg: 2000 } } },
  IA: { label: "Iowa", cities: { "Des Moines": { rate: 1.57, avg: 3800 }, "Cedar Rapids": { rate: 1.59, avg: 3500 }, "Other Iowa": { rate: 1.57, avg: 3200 } } },
  KS: { label: "Kansas", cities: { "Wichita": { rate: 1.41, avg: 3200 }, "Overland Park": { rate: 1.28, avg: 4500 }, "Other Kansas": { rate: 1.40, avg: 3200 } } },
  KY: { label: "Kentucky", cities: { "Louisville": { rate: 0.86, avg: 2500 }, "Lexington": { rate: 0.87, avg: 2800 }, "Other Kentucky": { rate: 0.86, avg: 2200 } } },
  LA: { label: "Louisiana", cities: { "New Orleans": { rate: 0.55, avg: 2000 }, "Baton Rouge": { rate: 0.52, avg: 1800 }, "Other Louisiana": { rate: 0.55, avg: 1800 } } },
  ME: { label: "Maine", cities: { "Portland": { rate: 1.52, avg: 5500 }, "Bangor": { rate: 1.72, avg: 4200 }, "Other Maine": { rate: 1.36, avg: 3800 } } },
  MD: { label: "Maryland", cities: { "Baltimore": { rate: 2.25, avg: 5200 }, "Rockville": { rate: 1.10, avg: 7500 }, "Annapolis": { rate: 0.88, avg: 5800 }, "Other Maryland": { rate: 1.09, avg: 5500 } } },
  MA: { label: "Massachusetts", cities: { "Boston": { rate: 1.04, avg: 8500 }, "Worcester": { rate: 1.57, avg: 5200 }, "Cambridge": { rate: 0.64, avg: 8800 }, "Springfield": { rate: 1.68, avg: 3800 }, "Other Massachusetts": { rate: 1.23, avg: 6500 } } },
  MI: { label: "Michigan", cities: { "Detroit": { rate: 2.83, avg: 4200 }, "Grand Rapids": { rate: 1.68, avg: 4500 }, "Ann Arbor": { rate: 1.59, avg: 8500 }, "Other Michigan": { rate: 1.54, avg: 4200 } } },
  MN: { label: "Minnesota", cities: { "Minneapolis": { rate: 1.25, avg: 5200 }, "St. Paul": { rate: 1.47, avg: 4800 }, "Rochester": { rate: 1.22, avg: 4500 }, "Other Minnesota": { rate: 1.12, avg: 4200 } } },
  MS: { label: "Mississippi", cities: { "Jackson": { rate: 1.01, avg: 1800 }, "Other Mississippi": { rate: 0.81, avg: 1600 } } },
  MO: { label: "Missouri", cities: { "Kansas City": { rate: 1.24, avg: 3200 }, "St. Louis": { rate: 1.58, avg: 3800 }, "Springfield": { rate: 1.08, avg: 2200 }, "Other Missouri": { rate: 0.97, avg: 2800 } } },
  MT: { label: "Montana", cities: { "Billings": { rate: 0.84, avg: 3200 }, "Missoula": { rate: 0.93, avg: 4000 }, "Other Montana": { rate: 0.84, avg: 3000 } } },
  NE: { label: "Nebraska", cities: { "Omaha": { rate: 2.24, avg: 5200 }, "Lincoln": { rate: 1.81, avg: 4200 }, "Other Nebraska": { rate: 1.73, avg: 4000 } } },
  NV: { label: "Nevada", cities: { "Las Vegas": { rate: 0.60, avg: 2800 }, "Henderson": { rate: 0.57, avg: 3200 }, "Reno": { rate: 0.59, avg: 3500 }, "Other Nevada": { rate: 0.59, avg: 2800 } } },
  NH: { label: "New Hampshire", cities: { "Manchester": { rate: 2.10, avg: 6500 }, "Nashua": { rate: 2.04, avg: 7200 }, "Other New Hampshire": { rate: 2.18, avg: 6500 } } },
  NJ: { label: "New Jersey", cities: { "Newark": { rate: 3.43, avg: 8500 }, "Jersey City": { rate: 1.63, avg: 7800 }, "Trenton": { rate: 3.39, avg: 6200 }, "Edison": { rate: 2.81, avg: 11500 }, "Other New Jersey": { rate: 2.49, avg: 9500 } } },
  NM: { label: "New Mexico", cities: { "Albuquerque": { rate: 0.77, avg: 2200 }, "Santa Fe": { rate: 0.46, avg: 2800 }, "Other New Mexico": { rate: 0.67, avg: 1800 } } },
  NY: { label: "New York", cities: { "New York City": { rate: 0.88, avg: 9500 }, "Buffalo": { rate: 2.89, avg: 5800 }, "Rochester": { rate: 2.96, avg: 5200 }, "Syracuse": { rate: 2.76, avg: 4800 }, "Albany": { rate: 2.33, avg: 5500 }, "Other New York": { rate: 1.72, avg: 6500 } } },
  NC: { label: "North Carolina", cities: { "Charlotte": { rate: 0.91, avg: 3800 }, "Raleigh": { rate: 0.84, avg: 4200 }, "Greensboro": { rate: 0.86, avg: 2800 }, "Durham": { rate: 1.13, avg: 4500 }, "Other North Carolina": { rate: 0.84, avg: 3200 } } },
  ND: { label: "North Dakota", cities: { "Fargo": { rate: 1.09, avg: 3500 }, "Other North Dakota": { rate: 0.98, avg: 3000 } } },
  OH: { label: "Ohio", cities: { "Columbus": { rate: 1.67, avg: 4200 }, "Cleveland": { rate: 1.85, avg: 3500 }, "Cincinnati": { rate: 1.53, avg: 3800 }, "Toledo": { rate: 1.79, avg: 2800 }, "Other Ohio": { rate: 1.59, avg: 3500 } } },
  OK: { label: "Oklahoma", cities: { "Oklahoma City": { rate: 1.09, avg: 2800 }, "Tulsa": { rate: 1.12, avg: 2800 }, "Other Oklahoma": { rate: 0.90, avg: 2400 } } },
  OR: { label: "Oregon", cities: { "Portland": { rate: 0.91, avg: 6200 }, "Salem": { rate: 0.98, avg: 3800 }, "Eugene": { rate: 0.97, avg: 4500 }, "Other Oregon": { rate: 0.91, avg: 4200 } } },
  PA: { label: "Pennsylvania", cities: { "Philadelphia": { rate: 1.56, avg: 5500 }, "Pittsburgh": { rate: 2.14, avg: 4800 }, "Allentown": { rate: 2.31, avg: 4200 }, "Other Pennsylvania": { rate: 1.58, avg: 4200 } } },
  RI: { label: "Rhode Island", cities: { "Providence": { rate: 1.63, avg: 5500 }, "Warwick": { rate: 1.81, avg: 5200 }, "Other Rhode Island": { rate: 1.63, avg: 5000 } } },
  SC: { label: "South Carolina", cities: { "Charleston": { rate: 0.42, avg: 2800 }, "Columbia": { rate: 0.49, avg: 2200 }, "Myrtle Beach": { rate: 0.36, avg: 2200 }, "Other South Carolina": { rate: 0.57, avg: 2000 } } },
  SD: { label: "South Dakota", cities: { "Sioux Falls": { rate: 1.14, avg: 3800 }, "Other South Dakota": { rate: 1.21, avg: 3200 } } },
  TN: { label: "Tennessee", cities: { "Nashville": { rate: 0.72, avg: 3500 }, "Memphis": { rate: 1.34, avg: 2800 }, "Knoxville": { rate: 0.66, avg: 2500 }, "Chattanooga": { rate: 0.92, avg: 2800 }, "Other Tennessee": { rate: 0.71, avg: 2800 } } },
  TX: { label: "Texas", cities: { "Houston": { rate: 2.09, avg: 6200 }, "Dallas": { rate: 2.22, avg: 7500 }, "Austin": { rate: 1.97, avg: 9500 }, "San Antonio": { rate: 2.35, avg: 5500 }, "Fort Worth": { rate: 2.36, avg: 6500 }, "El Paso": { rate: 2.10, avg: 3800 }, "Other Texas": { rate: 1.80, avg: 5500 } } },
  UT: { label: "Utah", cities: { "Salt Lake City": { rate: 0.64, avg: 4200 }, "Provo": { rate: 0.66, avg: 4500 }, "Ogden": { rate: 0.68, avg: 3800 }, "Other Utah": { rate: 0.63, avg: 3800 } } },
  VT: { label: "Vermont", cities: { "Burlington": { rate: 1.84, avg: 8500 }, "Other Vermont": { rate: 1.83, avg: 6500 } } },
  VA: { label: "Virginia", cities: { "Virginia Beach": { rate: 0.99, avg: 4500 }, "Norfolk": { rate: 1.25, avg: 3800 }, "Richmond": { rate: 1.20, avg: 4500 }, "Arlington": { rate: 0.91, avg: 9500 }, "Other Virginia": { rate: 0.82, avg: 4500 } } },
  WA: { label: "Washington", cities: { "Seattle": { rate: 0.93, avg: 9200 }, "Spokane": { rate: 1.11, avg: 4200 }, "Tacoma": { rate: 1.04, avg: 5200 }, "Bellevue": { rate: 0.87, avg: 12000 }, "Other Washington": { rate: 0.93, avg: 6500 } } },
  WV: { label: "West Virginia", cities: { "Charleston": { rate: 0.59, avg: 1600 }, "Other West Virginia": { rate: 0.59, avg: 1400 } } },
  WI: { label: "Wisconsin", cities: { "Milwaukee": { rate: 2.45, avg: 5500 }, "Madison": { rate: 1.95, avg: 7200 }, "Green Bay": { rate: 2.05, avg: 4200 }, "Other Wisconsin": { rate: 1.85, avg: 4500 } } },
  WY: { label: "Wyoming", cities: { "Cheyenne": { rate: 0.61, avg: 2800 }, "Other Wyoming": { rate: 0.61, avg: 2500 } } },
  DC: { label: "Washington DC", cities: { "Washington DC": { rate: 0.56, avg: 7800 }, "Other DC": { rate: 0.56, avg: 7800 } } },
};

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
  const [selectedCity, setSelectedCity] = useState("");
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
  // GeoNames city search
  const [citySearch, setCitySearch] = useState("");
  const [cityResults, setCityResults] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [extraPayment, setExtraPayment] = useState(0);
  const [extraPayFreq, setExtraPayFreq] = useState("monthly");
  const [points, setPoints] = useState(0);
  const [pointsRateReduction, setPointsRateReduction] = useState(0.25);

  useEffect(() => { localStorage.setItem("mh_theme", lightMode ? "light" : "dark"); }, [lightMode]);

  // ── Read URL params on load for SEO landing pages ─────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prov = params.get("province");
    const state = params.get("state");
    const city = params.get("city");
    const hp = params.get("price");
    const cntry = params.get("country");

    if (cntry === "US") setCountry("US");
    if (prov && CA_PROPERTY_TAXES[prov]) {
      setCountry("CA");
      setProvince(prov);
      // Auto-fill province average tax rate
      const provData = CA_PROPERTY_TAXES[prov];
      const firstCity = Object.values(provData.cities)[0];
      if (firstCity) setTaxes(Math.round(firstCity.avg / 12));
    }
    if (state && US_PROPERTY_TAXES[state]) {
      setCountry("US");
      setUsState(state);
      const stateData = US_PROPERTY_TAXES[state];
      const firstCity = Object.values(stateData.cities)[0];
      if (firstCity) setTaxes(Math.round(firstCity.avg / 12));
    }
    if (city) {
      setCitySearch(city);
      setSelectedCity(city);
    }
    if (hp) setHomePrice(parseInt(hp));

    // Update document title dynamically for SEO
    const updateTitle = () => {
      const locationStr = city ? city + ", " + (prov || state || "") : (prov ? CA_PROPERTY_TAXES[prov]?.label || prov : state || "Canada & US");
      document.title = `Mortgage Calculator — ${locationStr} | MortgageHive`;
      const metaDesc = document.querySelector("meta[name=description]");
      if (metaDesc) metaDesc.setAttribute("content",
        `Free mortgage calculator for ${locationStr}. Includes CMHC insurance, land transfer tax, stress test, closing costs, amortization schedule, rent vs buy, and affordability checker. No signup required.`
      );
    };
    updateTitle();
  }, []);

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

  // Generate shareable URL with all current inputs encoded
  const getShareURL = () => {
    const params = new URLSearchParams();
    params.set("country", country);
    if (country === "CA") params.set("province", province);
    else params.set("state", usState);
    if (selectedCity) params.set("city", selectedCity);
    params.set("price", homePrice);
    params.set("down", downPct);
    params.set("rate", rate);
    params.set("years", years);
    return window.location.origin + window.location.pathname + "?" + params.toString();
  };

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
      {/* SEO structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "MortgageHive — Canada & US Mortgage Calculator",
        "url": "https://mortgagehive.vercel.app",
        "description": "Free mortgage calculator for Canada and the US. Includes CMHC insurance, land transfer tax by province, stress test, closing costs, amortization schedule, rent vs buy, and affordability checker.",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Web",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "CAD" },
        "featureList": ["CMHC Calculator", "Land Transfer Tax", "Stress Test", "Amortization Schedule", "Rent vs Buy", "Affordability Checker", "Extra Payment Calculator", "Points Buydown", "Mortgage Renewal", "Refinance Calculator"]
      })}} />

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
      @media print{
        header,.tab-btn,.range,.num-input,.select{display:none!important}
        body{background:white!important;color:black!important}
        .card{border:1px solid #ddd!important;break-inside:avoid}
      }
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--border2)", background: "var(--bg2)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#15803d,#166534)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏠</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.5px" }}>Mortgage<span style={{ color: "var(--green)" }}>Hive</span></div>
              <div style={{ fontSize: 10, color: "var(--text2)", fontWeight: 600 }}>
                {selectedCity ? `${selectedCity} · ` : ""}{country === "CA" ? (CA_PROPERTY_TAXES[province]?.label || "Canada") : (US_PROPERTY_TAXES[usState]?.label || "US")} · Free · No signup
              </div>
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
              {copied ? "✓ Copied!" : "📋 Results"}
            </button>
            <button onClick={() => { navigator.clipboard.writeText(getShareURL()); setCopied("url"); setTimeout(() => setCopied(false), 2000); }}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: copied === "url" ? "var(--green-dim)" : "transparent", color: copied === "url" ? "var(--green)" : "var(--text2)", fontSize: 12, fontWeight: 700 }}>
              {copied === "url" ? "✓ Link copied!" : "🔗 Share calc"}
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

            {/* Live rate banner */}
            <div style={{ marginBottom: 14, padding: "10px 16px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 12, color: "var(--text2)" }}>
                  {country === "CA"
                    ? <span>🇨🇦 Bank of Canada prime rate: <strong style={{ color: "var(--green)", fontFamily: "'DM Mono',monospace" }}>7.20%</strong> · Avg 5-yr fixed: <strong style={{ color: "var(--text)", fontFamily: "'DM Mono',monospace" }}>5.49%</strong></span>
                    : <span>🇺🇸 Fed funds rate: <strong style={{ color: "var(--green)", fontFamily: "'DM Mono',monospace" }}>5.33%</strong> · Avg 30-yr fixed: <strong style={{ color: "var(--text)", fontFamily: "'DM Mono',monospace" }}>6.87%</strong></span>
                  }
                </span>
              </div>
              <a href={country === "CA" ? "https://www.ratehub.ca" : "https://www.credible.com/mortgage"} target="_blank" rel="noopener noreferrer sponsored"
                style={{ fontSize: 11, color: "var(--green)", fontWeight: 700, textDecoration: "none" }}>
                Get today's personalized rate →
              </a>
            </div>

            <div className="grid2">
              {/* LEFT */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="card">
                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, color: "var(--text)" }}>Home details</div>

                  {/* Location — province/state + city with auto-fill */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div>
                        <div className="label"><span>{country === "CA" ? "Province" : "State"}</span></div>
                        {country === "CA" ? (
                          <select className="select" value={province} onChange={e => {
                            setProvince(e.target.value);
                            setSelectedCity("");
                            setCity("");
                          }}>
                            {Object.entries(CA_PROPERTY_TAXES).map(([code, data]) => (
                              <option key={code} value={code}>{data.label}</option>
                            ))}
                          </select>
                        ) : (
                          <select className="select" value={usState} onChange={e => {
                            setUsState(e.target.value);
                            setSelectedCity("");
                          }}>
                            {Object.entries(US_PROPERTY_TAXES).map(([code, data]) => (
                              <option key={code} value={code}>{data.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div style={{ position: "relative" }}>
                        <div className="label"><span>City <span style={{ color: "var(--green)", fontSize: 10 }}>— search any city · auto-fills tax</span></span></div>
                        <input
                          className="num-input"
                          placeholder={`Search any ${country === "CA" ? "Canadian" : "US"} city...`}
                          value={citySearch}
                          onChange={e => {
                            setCitySearch(e.target.value);
                            searchCitiesGeoNames(e.target.value, country, setCityResults, setCityLoading);
                          }}
                          style={{ fontFamily: "'DM Sans',system-ui", fontSize: 13 }}
                        />
                        {cityLoading && (
                          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>🔍 Searching cities...</div>
                        )}
                        {cityResults.length > 0 && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.3)", maxHeight: 220, overflowY: "auto" }}>
                            {cityResults.map((city, i) => {
                              const taxData = getTaxForGeoCity(city, country, province, usState);
                              return (
                                <div key={i}
                                  style={{ padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid var(--border2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                  onClick={() => {
                                    setCitySearch(city.name + (city.adminName ? ", " + city.adminName : ""));
                                    setCityResults([]);
                                    setSelectedCity(city.name);
                                    if (country === "CA" && city.name === "Toronto") setCity("Toronto");
                                    else setCity("");
                                    if (taxData) {
                                      setTaxes(Math.round(taxData.avg / 12));
                                      if (country === "CA" && taxData.key) setProvince(taxData.key);
                                      if (country === "US" && taxData.key) setUsState(taxData.key);
                                    }
                                  }}>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{city.name}</div>
                                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{city.adminName}{city.pop > 0 ? ` · pop. ${city.pop.toLocaleString()}` : ""}</div>
                                  </div>
                                  {taxData ? (
                                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                                      <div style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>{taxData.rate.toFixed(2)}% tax</div>
                                      <div style={{ fontSize: 10, color: "var(--text3)" }}>{fmtC(Math.round(taxData.avg / 12))}/mo</div>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: 11, color: "var(--text3)" }}>Select to use</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedCity && taxes > 0 && (
                      <div style={{ fontSize: 11, color: "var(--green)", padding: "6px 10px", background: "var(--green-dim)", borderRadius: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span>✅ Tax auto-filled for <strong>{selectedCity}</strong></span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{fmtC(taxes)}/mo</span>
                        <span style={{ color: "var(--text3)" }}>·</span>
                        <span style={{ color: "var(--text2)" }}>Province: <strong style={{ color: "var(--green)" }}>{CA_PROPERTY_TAXES[province]?.label || province}</strong></span>
                        <span style={{ color: "var(--text3)" }}>· LTT calculated for this province</span>
                      </div>
                    )}
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div className="label"><span>First-time buyer?</span></div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["Yes", "No"].map(v => (
                        <button key={v} onClick={() => setIsFirstTime(v === "Yes")} style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${isFirstTime === (v === "Yes") ? "var(--green)" : "var(--border2)"}`, background: isFirstTime === (v === "Yes") ? "var(--green-dim)" : "transparent", color: isFirstTime === (v === "Yes") ? "var(--green)" : "var(--text2)", fontSize: 13, fontWeight: 700 }}>
                          {v}
                        </button>
                      ))}
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
                    <div style={{ fontSize: 11, color: "#f59e0b", marginBottom: 6, padding: "5px 10px", background: "rgba(245,158,11,0.08)", borderRadius: 6 }}>
                      ⚠️ CMHC insurance required · Premium: {fmtC(cmhc.premium)} added to mortgage
                      {cmhc.tax > 0 && ` · ${fmtC(cmhc.tax)} PST due at closing in ${province}`}
                    </div>
                  )}
                  {country === "CA" && (
                    <div style={{ fontSize: 11, marginBottom: 10, padding: "6px 10px", background: ltt.total === 0 ? "rgba(74,222,128,0.08)" : "rgba(0,0,0,0.06)", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--text2)" }}>🏛️ Land Transfer Tax — {CA_PROPERTY_TAXES[province]?.label || province}</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800, color: ltt.total === 0 ? "var(--green)" : "var(--amber)" }}>
                        {ltt.total === 0 ? "✅ $0 (No LTT in " + (CA_PROPERTY_TAXES[province]?.label || province) + ")" : fmtC(ltt.total) + " at closing"}
                      </span>
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
                      {(country === "CA"
                        ? (isFirstTime || downPct >= 20) ? [20, 25, 30] : [20, 25]
                        : [15, 20, 25, 30]).map(y => (
                        <button key={y} onClick={() => setYears(y)} style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${years === y ? "var(--green)" : "var(--border2)"}`, background: years === y ? "var(--green-dim)" : "transparent", color: years === y ? "var(--green)" : "var(--text2)", fontSize: 13, fontWeight: 700 }}>
                          {y}yr
                        </button>
                      ))}
                    </div>
                    {country === "CA" && downPct < 20 && years === 30 && !isFirstTime && (
                      <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>⚠️ 30-year insured mortgages are only available to first-time buyers or new construction (as of Dec 15, 2024)</div>
                    )}
                    {country === "CA" && downPct < 20 && years === 30 && isFirstTime && (
                      <div style={{ fontSize: 11, color: "var(--green)", marginTop: 4 }}>✅ You qualify for 30-year amortization as a first-time buyer (effective Dec 15, 2024)</div>
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
                    ...(country === "CA" ? [{ label: `Land transfer tax (${CA_PROPERTY_TAXES[province]?.label || province})`, val: ltt.total === 0 ? "✅ $0 — No LTT" : fmtC(ltt.total), color: ltt.total === 0 ? "var(--green)" : "var(--amber)" }] : []),
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

                {/* True Cost of Ownership */}
                <div className="card" style={{ border: "1px solid rgba(245,158,11,0.25)", background: lm ? "rgba(245,158,11,0.03)" : "rgba(245,158,11,0.05)" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--amber)", marginBottom: 10 }}>🏡 True Cost of Ownership (10 years)</div>
                  {(() => {
                    const maintenance = homePrice * 0.01; // 1% annually
                    const utilityExtra = 2400; // extra utilities vs renting
                    const propertyTaxAnnual = taxes * 12;
                    const insuranceAnnual = insurance * 12;
                    const mortgagePayments = pi * 12;
                    const interestFirstYear = amortRows.slice(0, 12).reduce((s, r) => s + r.interest, 0);
                    const interestTenYear = amortRows.slice(0, 120).reduce((s, r) => s + r.interest, 0);
                    const equityTenYear = homePrice * (Math.pow(1 + 3 / 100, 10) - 1) + amortRows.slice(0, 120).reduce((s, r) => s + r.principal, 0);
                    const totalCostTenYear = (totalMonthly * 120) + (maintenance * 10) + (utilityExtra * 10);
                    return (
                      <div>
                        {[
                          { label: "Mortgage payments (10yr)", val: fmtC(totalMonthly * 120) },
                          { label: "Est. maintenance (1%/yr)", val: fmtC(maintenance * 10), note: "Repairs, upkeep, appliances" },
                          { label: "Extra utilities vs renting", val: fmtC(utilityExtra * 10), note: "Estimate" },
                          { label: "Total 10-year outlay", val: fmtC(totalCostTenYear), bold: true },
                          { label: "Est. equity gained (10yr)", val: fmtC(equityTenYear), color: "var(--green)", bold: true, note: "3% appreciation + principal paid" },
                        ].map(r => (
                          <div key={r.label} className="br-row">
                            <div>
                              <div style={{ color: "var(--text2)", fontSize: 12 }}>{r.label}</div>
                              {r.note && <div style={{ color: "var(--text3)", fontSize: 10 }}>{r.note}</div>}
                            </div>
                            <span style={{ color: r.color || (r.bold ? "var(--text)" : "var(--text2)"), fontWeight: r.bold ? 800 : 600, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{r.val}</span>
                          </div>
                        ))}
                        <div style={{ marginTop: 8, fontSize: 11, color: "var(--text3)" }}>
                          💡 Budget 1-3% of home value per year for maintenance — most first-time buyers underestimate this significantly.
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Insurance affiliate */}
                <div style={{ padding: "10px 14px", background: "var(--bg3)", borderRadius: 10, border: "1px solid var(--border2)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>🏠 Overpaying on home insurance?</div>
                    <div style={{ fontSize: 11, color: "var(--text2)" }}>Buyers save an average of $825/year by comparing rates before closing.</div>
                  </div>
                  <a href={country === "CA" ? "https://www.ratehub.ca/home-insurance" : "https://www.policygenius.com/homeowners-insurance"} target="_blank" rel="noopener noreferrer sponsored"
                    style={{ padding: "7px 14px", borderRadius: 8, background: "var(--green-dim)", border: "1px solid var(--border)", color: "var(--green)", fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>
                    Compare insurance →
                  </a>
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

                {/* Credit score affiliate */}
                <div style={{ padding: "12px 14px", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 10, marginBottom: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>📊 Check your free credit score</div>
                    <div style={{ fontSize: 11, color: "var(--text2)" }}>Know your score before applying. {country === "CA" ? "Borrowell checks without affecting your score." : "Credit Karma checks without affecting your score."}</div>
                  </div>
                  <a href={country === "CA" ? "https://www.borrowell.com" : "https://www.creditkarma.com"} target="_blank" rel="noopener noreferrer sponsored"
                    style={{ padding: "7px 14px", borderRadius: 8, background: "var(--green-dim)", border: "1px solid var(--border)", color: "var(--green)", fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>
                    {country === "CA" ? "Check on Borrowell →" : "Check on Credit Karma →"}
                  </a>
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
              {[["scenarios","⚖️ Scenario Compare"],["renewal","🔄 Renewal Calculator"],["refi","💳 Refinance Calculator"],["points","🎯 Points Buydown"]].map(([key, label]) => (
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

            {/* Points Buydown Calculator */}
            {compareMode === "points" && (() => {
              const bd = calcPointsBuydown(loanAmt, rate, years, points, pointsRateReduction);
              return (
                <div>
                  <div className="grid2" style={{ marginBottom: 14 }}>
                    <div className="card">
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>Mortgage Points (Rate Buydown)</div>
                      <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14, lineHeight: 1.65 }}>
                        Paying points upfront lowers your interest rate. One point = 1% of loan amount. Each point typically reduces your rate by 0.25%. Worth it if you stay long enough to break even.
                      </p>
                      <div style={{ marginBottom: 14 }}>
                        <div className="label"><span>Points to buy</span><span className="val">{points} {points === 1 ? "point" : "points"} · {fmtC(bd.pointCost)}</span></div>
                        <input type="range" className="range" min={0} max={4} step={0.25} value={points} onChange={e => setPoints(+e.target.value)} />
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <div className="label"><span>Rate reduction per point</span><span className="val">{pointsRateReduction}%</span></div>
                        <input type="range" className="range" min={0.1} max={0.5} step={0.05} value={pointsRateReduction} onChange={e => setPointsRateReduction(+e.target.value)} />
                        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>Standard is 0.25% per point — ask your lender for their exact rate</div>
                      </div>
                    </div>
                    <div>
                      <div className="card" style={{ marginBottom: 12, background: lm ? "linear-gradient(135deg,#f0fdf4,#fff)" : "linear-gradient(135deg,#111f12,#0a160b)", border: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 12, color: "var(--text2)", fontWeight: 700, marginBottom: 6 }}>
                          {bd.monthlySavings > 0 ? "Monthly savings from buying points" : "No savings"}
                        </div>
                        <div style={{ fontSize: 40, fontWeight: 900, color: "var(--green)", fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>
                          {fmtC(bd.monthlySavings)}<span style={{ fontSize: 14 }}>/mo</span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>
                          New rate: <strong style={{ color: "var(--green)", fontFamily: "'DM Mono',monospace" }}>{bd.newRate.toFixed(2)}%</strong> (down from {rate}%)
                        </div>
                      </div>
                      <div className="card">
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>Points analysis</div>
                        {[
                          { label: "Points cost upfront", val: fmtC(bd.pointCost), color: "var(--red)" },
                          { label: "Original rate", val: rate + "%", color: "var(--text)" },
                          { label: "New rate", val: bd.newRate.toFixed(2) + "%", color: "var(--green)" },
                          { label: "Monthly savings", val: fmtC(bd.monthlySavings), color: "var(--green)" },
                          { label: "Break-even", val: bd.breakEvenMonths ? `${bd.breakEvenMonths} months (${(bd.breakEvenMonths/12).toFixed(1)} yrs)` : "Never", color: bd.breakEvenMonths && bd.breakEvenMonths < years * 12 ? "var(--green)" : "var(--red)" },
                          { label: "Lifetime savings (after cost)", val: fmtC(bd.lifetimeSavings), color: bd.lifetimeSavings > 0 ? "var(--green)" : "var(--red)" },
                        ].map(r => (
                          <div key={r.label} className="br-row">
                            <span style={{ color: "var(--text2)", fontSize: 12 }}>{r.label}</span>
                            <span style={{ color: r.color, fontWeight: 700, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{r.val}</span>
                          </div>
                        ))}
                        <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, fontSize: 12, lineHeight: 1.6,
                          background: bd.breakEvenMonths && bd.breakEvenMonths < years * 6 ? "var(--green-dim)" : "rgba(245,158,11,0.08)",
                          color: bd.breakEvenMonths && bd.breakEvenMonths < years * 6 ? "var(--green)" : "var(--amber)" }}>
                          {points === 0 ? "Add points above to see the analysis." :
                            !bd.breakEvenMonths ? "⚠️ No savings from buying points at these settings." :
                            bd.breakEvenMonths < 36 ? `✅ Strong buy — you break even in under 3 years and save ${fmtC(bd.lifetimeSavings)} over the loan.` :
                            bd.breakEvenMonths < 60 ? `✅ Good buy — break even in ${(bd.breakEvenMonths/12).toFixed(1)} years. Worth it if you plan to stay.` :
                            `⚠️ Break-even takes ${(bd.breakEvenMonths/12).toFixed(1)} years. Only worth it if you stay long-term.`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Original scenario comparison — shown when compareMode === "scenarios" */}
            {compareMode === "scenarios" && (
            <>
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
            </>
            )}

            {/* Rate comparison affiliate */}
            {compareMode === "scenarios" && (
              <div style={{ marginTop: 14, padding: "12px 16px", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>💡 Get a real rate for Scenario B</div>
                  <div style={{ fontSize: 12, color: "var(--text2)" }}>Compare personalized rates from multiple lenders — free, no hard credit check.</div>
                </div>
                <a href={country === "CA" ? "https://www.ratehub.ca" : "https://www.credible.com/mortgage"} target="_blank" rel="noopener noreferrer sponsored"
                  style={{ padding: "8px 16px", borderRadius: 8, background: "var(--green)", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>
                  {country === "CA" ? "Get rate on Ratehub →" : "Get rate on Credible →"}
                </a>
              </div>
            )}
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
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, color: "var(--text)" }}>Amortization Schedule & Extra Payments</div>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 16 }}>See how your loan is paid off over time — and how extra payments could save you years and thousands of dollars.</p>

            {/* Extra payment calculator */}
            <div className="card" style={{ marginBottom: 14, border: "1px solid rgba(74,222,128,0.25)" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--green)", marginBottom: 12 }}>💰 Extra Payment Calculator</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <div className="label"><span>Extra payment amount</span><span className="val">{fmtC(extraPayment)}</span></div>
                  <input type="range" className="range" min={0} max={5000} step={50} value={extraPayment} onChange={e => setExtraPayment(+e.target.value)} />
                </div>
                <div>
                  <div className="label"><span>Frequency</span></div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[["monthly","Monthly"],["annually","Annually"]].map(([key, label]) => (
                      <button key={key} onClick={() => setExtraPayFreq(key)} style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${extraPayFreq === key ? "var(--green)" : "var(--border2)"}`, background: extraPayFreq === key ? "var(--green-dim)" : "transparent", color: extraPayFreq === key ? "var(--green)" : "var(--text2)", fontSize: 12, fontWeight: 700 }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {extraPayment > 0 && (() => {
                const monthlyExtra = extraPayFreq === "monthly" ? extraPayment : extraPayment / 12;
                const withExtra = calcWithExtraPayment(loanAmt, rate, years, monthlyExtra);
                const without = calcWithExtraPayment(loanAmt, rate, years, 0);
                const monthsSaved = without.months - withExtra.months;
                const yearsSaved = Math.floor(monthsSaved / 12);
                const moSaved = monthsSaved % 12;
                const interestSaved = without.interest - withExtra.interest;
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
                    {[
                      { label: "Time saved", val: `${yearsSaved}yr ${moSaved}mo`, color: "var(--green)", big: true },
                      { label: "Interest saved", val: fmtC(interestSaved), color: "var(--green)", big: true },
                      { label: "Paid off", val: `${new Date().getFullYear() + Math.floor(withExtra.months / 12)}`, color: "var(--text)" },
                      { label: "Extra cost/yr", val: fmtC(monthlyExtra * 12), color: "var(--text)" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "var(--bg3)", borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 3 }}>{s.label}</div>
                        <div style={{ fontSize: s.big ? 20 : 16, fontWeight: 900, color: s.color, fontFamily: "'DM Mono',monospace" }}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {extraPayment === 0 && (
                <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: "8px 0" }}>
                  Move the slider above to see how extra payments dramatically reduce your mortgage
                </div>
              )}
            </div>

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

        {/* ── QUALIFICATION REPORT ── */}
        {(() => {
          const creditOk = true; // User doesn't enter credit score — assume they know
          const frontDTIOk = frontDTI <= (country === "CA" ? 32 : 28);
          const backDTIOk = backDTI <= 44;
          const stressOk = country !== "CA" || stressTestDTI <= 44;
          const downOk = downPct >= minDown;
          const overallOk = backDTIOk && stressOk && downOk;

          const issues = [];
          if (!frontDTIOk) issues.push({ type: "warn", icon: "⚠️", title: "Front-end DTI is high", detail: `Your housing costs are ${frontDTI.toFixed(1)}% of gross income. Lenders prefer below ${country === "CA" ? 32 : 28}%. Fix: increase income, reduce loan amount, or increase down payment.`, impact: "Medium" });
          if (!backDTIOk) issues.push({ type: "fail", icon: "❌", title: "Total DTI exceeds lender limit", detail: `Your total debt ratio is ${backDTI.toFixed(1)}%. Most lenders cap at 44%. Fix: pay down ${fmtC(Math.max(0, (otherDebts - (monthlyIncome * 0.44 - totalMonthly))))} in monthly debt obligations, or choose a lower-priced home.`, impact: "High" });
          if (!stressOk && country === "CA") issues.push({ type: "fail", icon: "❌", title: "Fails Canadian stress test", detail: `At the stress test rate of ${Math.max(rate + 2, 5.25).toFixed(2)}%, your DTI is ${stressTestDTI.toFixed(1)}%. Fix: reduce loan amount, increase down payment, or pay down other debts.`, impact: "High" });
          if (!downOk) issues.push({ type: "fail", icon: "❌", title: "Down payment below minimum", detail: `Minimum required is ${minDown.toFixed(1)}% (${fmtC(homePrice * minDown / 100)}). You have ${downPct}%. Fix: save an additional ${fmtC(homePrice * minDown / 100 - downAmt)}.`, impact: "Critical" });
          if (downPct < 20 && country === "US") issues.push({ type: "warn", icon: "⚠️", title: "PMI required", detail: `With ${downPct}% down you pay ${fmtC(usPmi)}/mo in PMI until you reach 20% equity. Fix: put 20%+ down to eliminate PMI entirely.`, impact: "Low" });
          if (downPct < 20 && country === "CA") issues.push({ type: "warn", icon: "⚠️", title: "CMHC insurance required", detail: `CMHC adds ${fmtC(cmhc.premium)} to your mortgage. ${cmhc.tax > 0 ? `Plus ${fmtC(cmhc.tax)} PST due in cash at closing in ${province}.` : ""}`, impact: "Low" });

          const strengths = [];
          if (frontDTIOk) strengths.push({ icon: "✅", text: `Front-end DTI ${frontDTI.toFixed(1)}% — within lender guidelines` });
          if (backDTIOk) strengths.push({ icon: "✅", text: `Total DTI ${backDTI.toFixed(1)}% — lenders will likely approve` });
          if (stressOk && country === "CA") strengths.push({ icon: "✅", text: `Passes Canadian stress test at ${Math.max(rate + 2, 5.25).toFixed(2)}%` });
          if (downPct >= 20) strengths.push({ icon: "✅", text: `20%+ down payment — no CMHC or PMI required` });
          if (isFirstTime) strengths.push({ icon: "✅", text: `First-time buyer — eligible for all government programs` });

          return (
            <div style={{ marginTop: 32, marginBottom: 32, border: `2px solid ${overallOk ? "var(--green)" : "var(--red)"}`, borderRadius: 16, overflow: "hidden" }}>
              {/* Report header */}
              <div style={{ background: overallOk ? "linear-gradient(135deg,#15803d,#166534)" : "linear-gradient(135deg,#991b1b,#7f1d1d)", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 3 }}>
                    {overallOk ? "✅ Likely to Qualify" : "❌ May Not Qualify"} — Lender Assessment
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                    Based on your numbers · Not a guarantee · Get pre-approved for a firm answer
                  </div>
                </div>
                <button onClick={() => window.print()} style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  🖨️ Print Report
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(getShareURL()); setCopied("report"); setTimeout(() => setCopied(false), 2000); }}
                      style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {copied === "report" ? "✓ Copied!" : "🔗 Share Report"}
                    </button>
              </div>

              <div style={{ padding: "20px 22px", background: "var(--bg2)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginBottom: 20 }}>

                  {/* Key metrics */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Key Metrics</div>
                    {[
                      { label: "Home price", val: fmtC(homePrice), ok: true },
                      { label: "Loan amount", val: fmtC(loanAmt), ok: true },
                      { label: "Down payment", val: `${downPct}% (${fmtC(downAmt)})`, ok: downOk },
                      { label: "Monthly payment", val: fmtC(totalMonthly), ok: totalMonthly < monthlyIncome * (country === "CA" ? 0.32 : 0.28) },
                      { label: "Front-end DTI", val: `${frontDTI.toFixed(1)}%`, ok: frontDTIOk },
                      { label: "Back-end DTI", val: `${backDTI.toFixed(1)}%`, ok: backDTIOk },
                      ...(country === "CA" ? [{ label: "Stress test DTI", val: `${stressTestDTI.toFixed(1)}%`, ok: stressOk }] : []),
                      { label: "Total interest cost", val: fmtC(totalInterest), ok: null },
                    ].map(r => (
                      <div key={r.label} className="br-row">
                        <span style={{ color: "var(--text2)", fontSize: 13 }}>{r.label}</span>
                        <span style={{ fontWeight: 700, fontFamily: "'DM Mono',monospace", color: r.ok === null ? "var(--text)" : r.ok ? "var(--green)" : "var(--red)" }}>{r.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Strengths + Issues */}
                  <div>
                    {strengths.length > 0 && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>✅ Strengths</div>
                        {strengths.map((s, i) => (
                          <div key={i} style={{ fontSize: 13, color: "var(--text2)", padding: "5px 0", borderBottom: "1px solid var(--border2)", lineHeight: 1.5 }}>
                            {s.icon} {s.text}
                          </div>
                        ))}
                      </>
                    )}
                    {issues.length > 0 && (
                      <div style={{ marginTop: strengths.length > 0 ? 14 : 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Issues to Address</div>
                        {issues.map((issue, i) => (
                          <div key={i} style={{ padding: "10px 12px", background: issue.type === "fail" ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)", border: `1px solid ${issue.type === "fail" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`, borderRadius: 8, marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: 14 }}>{issue.icon}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: issue.type === "fail" ? "var(--red)" : "var(--amber)" }}>{issue.title}</span>
                              <span style={{ marginLeft: "auto", fontSize: 10, padding: "1px 6px", borderRadius: 20, background: issue.impact === "Critical" ? "rgba(239,68,68,0.15)" : issue.impact === "High" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)", color: issue.impact === "Critical" || issue.impact === "High" ? "var(--red)" : "var(--amber)", fontWeight: 700 }}>{issue.impact}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>{issue.detail}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action plan */}
                <div style={{ padding: "14px 16px", background: "var(--bg3)", borderRadius: 10, borderLeft: `3px solid ${overallOk ? "var(--green)" : "var(--amber)"}` }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
                    {overallOk ? "🎯 You look good — here's what to do next:" : "📋 Recommended action plan:"}
                  </div>
                  {overallOk ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
                      {[
                        { step: "1", text: "Get pre-approved with 2-3 lenders and compare rates" },
                        { step: "2", text: "Gather documents: 2 yrs tax returns, pay stubs, bank statements" },
                        { step: "3", text: country === "CA" ? "Open FHSA if first-time buyer — contribute up to $8,000" : "Explore DPA programs in your state" },
                        { step: "4", text: "Lock your rate once pre-approved in a rising rate environment" },
                      ].map(a => (
                        <div key={a.step} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--green)", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{a.step}</div>
                          <span style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55 }}>{a.text}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
                      {issues.filter(i => i.type === "fail").concat(issues.filter(i => i.type === "warn")).slice(0, 4).map((issue, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: issue.type === "fail" ? "var(--red)" : "var(--amber)", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                          <span style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.55 }}>{issue.title} — {issue.detail.split(".")[0]}.</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 10, fontSize: 11, color: "var(--text3)", textAlign: "center" }}>
                  This assessment is based on standard lender guidelines. Actual approval depends on your credit score, employment history, and individual lender criteria. Always get pre-approved for a firm answer.
                </div>

                {/* HIGH-VALUE AFFILIATE PLACEMENT — Get Pre-Approved */}
                <div style={{ marginTop: 16, padding: "16px 18px", background: lm ? "linear-gradient(135deg,#f0fdf4,#e8f5e9)" : "linear-gradient(135deg,#0d2010,#111f12)", border: "1px solid var(--border)", borderRadius: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>
                    {overallOk ? "✅ Ready to get pre-approved? Compare real rates from multiple lenders." : "📋 Not ready yet? Check your rate anyway — it's free and won't affect your credit."}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 12 }}>No hard credit pull to compare rates. Takes 3 minutes. Free forever.</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {country === "CA" ? (
                      <>
                        <a href="https://www.ratehub.ca" target="_blank" rel="noopener noreferrer sponsored" style={{ flex: 1, minWidth: 140, padding: "10px 16px", borderRadius: 9, background: "var(--green)", color: "#fff", fontSize: 13, fontWeight: 800, textDecoration: "none", textAlign: "center", display: "block" }}>
                          🇨🇦 Compare rates on Ratehub →
                        </a>
                        <a href="https://www.ratesdotca.com" target="_blank" rel="noopener noreferrer sponsored" style={{ flex: 1, minWidth: 140, padding: "10px 16px", borderRadius: 9, background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, fontWeight: 700, textDecoration: "none", textAlign: "center", display: "block" }}>
                          Compare on Rates.ca →
                        </a>
                      </>
                    ) : (
                      <>
                        <a href="https://www.lendingtree.com/home/mortgage" target="_blank" rel="noopener noreferrer sponsored" style={{ flex: 1, minWidth: 140, padding: "10px 16px", borderRadius: 9, background: "var(--green)", color: "#fff", fontSize: 13, fontWeight: 800, textDecoration: "none", textAlign: "center", display: "block" }}>
                          Compare rates on LendingTree →
                        </a>
                        <a href="https://www.credible.com/mortgage" target="_blank" rel="noopener noreferrer sponsored" style={{ flex: 1, minWidth: 140, padding: "10px 16px", borderRadius: 9, background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13, fontWeight: 700, textDecoration: "none", textAlign: "center", display: "block" }}>
                          Check rates on Credible →
                        </a>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 8, textAlign: "center" }}>
                    Affiliate links — we may earn a commission at no cost to you
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── WHITE LABEL EMBED ── */}
        <div style={{ marginTop: 40, padding: 22, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 4, color: "var(--text)" }}>📦 Embed MortgageHive on Your Website</div>
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14, lineHeight: 1.7 }}>
            Realtors, mortgage brokers, and finance blogs — add the most complete mortgage calculator to your site. Free embed with MortgageHive branding, or contact us for white-label licensing with your own branding.
          </p>
          <div style={{ background: "var(--bg3)", borderRadius: 10, padding: "12px 14px", fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--green)", wordBreak: "break-all", marginBottom: 10 }}>
            {`<iframe src="https://mortgagehive.vercel.app${country === "CA" ? "?country=CA&province=" + province : "?country=US&state=" + usState}" width="100%" height="700" frameborder="0" style="border-radius:12px;border:none"></iframe>`}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => {
              const code = `<iframe src="https://mortgagehive.vercel.app${country === "CA" ? "?country=CA&province=" + province : "?country=US&state=" + usState}" width="100%" height="700" frameborder="0" style="border-radius:12px;border:none"></iframe>`;
              navigator.clipboard.writeText(code);
              setCopied("embed");
              setTimeout(() => setCopied(false), 2000);
            }} className="action-btn" style={{ padding: "8px 18px", background: "var(--green)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              {copied === "embed" ? "✓ Copied!" : "Copy embed code"}
            </button>
            <a href="mailto:hello@docvaultpro.com?subject=MortgageHive White-Label License" style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)", color: "var(--text2)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              💼 Enquire about white-label →
            </a>
          </div>
          <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 10 }}>White-label licenses available for realtors, mortgage brokers, and real estate platforms. Custom branding, pre-loaded city data, and lead capture. Email hello@docvaultpro.com</p>
        </div>

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

        {/* About + SEO */}
        <div style={{ marginTop: 32, padding: 22, background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 10, color: "var(--text)" }}>About <span style={{ color: "var(--green)" }}>MortgageHive</span></div>
          <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.8, marginBottom: 10 }}>
            MortgageHive is the most complete free mortgage calculator for Canada and the United States. Unlike other mortgage payment calculators, MortgageHive includes every real cost — CMHC insurance premiums, land transfer tax by province (Ontario, BC, Quebec, Manitoba, Nova Scotia, New Brunswick, PEI, Newfoundland), PST on CMHC premiums, US state closing costs, PMI, property taxes, home insurance, HOA fees, and condo fees.
          </p>
          <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.8, marginBottom: 10 }}>
            Use MortgageHive to calculate your monthly mortgage payment, run the Canadian stress test, check if you qualify, compare loan scenarios, calculate mortgage renewal impact, run a refinance break-even analysis, see rent vs buy breakeven, generate a full amortization schedule, and check your debt-to-income ratio — all in one free tool.
          </p>
          <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.8 }}>
            No signup required. No personal information collected. No spam. Built for first-time home buyers, newcomers to Canada, investors, and anyone making the biggest financial decision of their life.
          </p>
          <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              { label: "Ontario Mortgage Calculator", url: "?country=CA&province=ON" },
              { label: "BC Mortgage Calculator", url: "?country=CA&province=BC" },
              { label: "Alberta Mortgage Calculator", url: "?country=CA&province=AB" },
              { label: "Quebec Mortgage Calculator", url: "?country=CA&province=QC" },
              { label: "Toronto Mortgage Calculator", url: "?country=CA&province=ON&city=Toronto" },
              { label: "Vancouver Mortgage Calculator", url: "?country=CA&province=BC&city=Vancouver" },
              { label: "Calgary Mortgage Calculator", url: "?country=CA&province=AB&city=Calgary" },
              { label: "CMHC Calculator", url: "?country=CA&province=ON" },
              { label: "Texas Mortgage Calculator", url: "?country=US&state=TX" },
              { label: "California Mortgage Calculator", url: "?country=US&state=CA" },
              { label: "Florida Mortgage Calculator", url: "?country=US&state=FL" },
              { label: "Mortgage Stress Test Canada", url: "?country=CA&province=ON" },
            ].map(tag => (
              <a key={tag.label} href={tag.url} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: "var(--bg3)", color: "var(--text3)", border: "1px solid var(--border2)", textDecoration: "none" }}>{tag.label}</a>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border2)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 11, color: "var(--text3)" }}>
          <span>MortgageHive · Free Mortgage Calculator Canada & US</span>
          <span style={{ textAlign: "right" }}>Not financial advice · Affiliate links may earn us a commission</span>
        </div>
        <div style={{ paddingTop: 8, fontSize: 10, color: "var(--text3)", lineHeight: 1.6 }}>
          MortgageHive provides estimates only. Tax rates, CMHC premiums, and closing costs are approximate and subject to change. Always consult a licensed mortgage professional before making financial decisions. Some links on this page are affiliate links.
        </div>
      </div>
    </div>
  );
}
