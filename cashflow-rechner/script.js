const defaults = {
  purchasePrice: 143000,
  itpPercent: 9,
  ancillaryPercent: 2,
  renovation: 0,
  monthlyRent: 1000,
  vacancyMonths: 1,
  ltvPercent: 70,
  interestRate: 4,
  loanTerm: 20,
  maintenanceMode: 'percent',
  maintenanceValue: 1.8,
  otherCosts: 0,
  appreciationRate: 0,
};

const state = { ...defaults };

const analyticsState = {
  calculatorStarted: false,
  calculatorCompleted: false,
  resultViewed: false,
};

const elements = {
  purchasePrice: document.getElementById('purchasePrice'),
  itpPercent: document.getElementById('itpPercent'),
  ancillaryPercent: document.getElementById('ancillaryPercent'),
  renovation: document.getElementById('renovation'),
  monthlyRent: document.getElementById('monthlyRent'),
  vacancyMonths: document.getElementById('vacancyMonths'),
  ltvPercent: document.getElementById('ltvPercent'),
  resultEquity: document.getElementById('resultEquity'),
  interestRate: document.getElementById('interestRate'),
  loanTerm: document.getElementById('loanTerm'),
  maintenanceValue: document.getElementById('maintenanceValue'),
  otherCosts: document.getElementById('otherCosts'),
  appreciationRate: document.getElementById('appreciationRate'),
  maintenanceLabel: document.getElementById('maintenanceLabel'),
  maintenanceToggleButtons: document.querySelectorAll('[data-maintenance-mode]'),
  equityHint: document.getElementById('equityHint'),
  resetButton: document.getElementById('resetButton'),
  assumptionSummary: document.getElementById('assumptionSummary'),
  appreciationRows: document.querySelectorAll('[data-appreciation]'),
  resultTotalInterest: document.getElementById('resultTotalInterest'),
  resultGrossYield: document.getElementById('resultGrossYield'),
  grossYieldVerdict: document.getElementById('grossYieldVerdict'),
  verdictScope: document.getElementById('verdictScope'),
  rateStress: document.getElementById('rateStress'),
  rateStressText: document.getElementById('rateStressText'),
  stickyResult: document.getElementById('stickyResult'),
  stickyResultValue: document.getElementById('stickyResultValue'),
  resultTransferTax: document.getElementById('resultTransferTax'),
  resultAncillaryCosts: document.getElementById('resultAncillaryCosts'),
  resultClosingCosts: document.getElementById('resultClosingCosts'),
  resultRenovation: document.getElementById('resultRenovation'),
  resultTotalInvestment: document.getElementById('resultTotalInvestment'),
  resultLoanAmount: document.getElementById('resultLoanAmount'),
  resultLtv: document.getElementById('resultLtv'),
  resultAnnualRent: document.getElementById('resultAnnualRent'),
  resultMaintenance: document.getElementById('resultMaintenance'),
  resultOtherCosts: document.getElementById('resultOtherCosts'),
  resultAnnuity: document.getElementById('resultAnnuity'),
  resultInterestYear1: document.getElementById('resultInterestYear1'),
  resultPrincipalYear1: document.getElementById('resultPrincipalYear1'),
  resultOperatingCashFlow: document.getElementById('resultOperatingCashFlow'),
  resultFreeCashFlow: document.getElementById('resultFreeCashFlow'),
  resultFreeCashFlowMonth: document.getElementById('resultFreeCashFlowMonth'),
  resultPrincipalWealth: document.getElementById('resultPrincipalWealth'),
  resultEconomicEffect: document.getElementById('resultEconomicEffect'),
  resultEconomicEffectAppreciation: document.getElementById('resultEconomicEffectAppreciation'),
  resultRoe: document.getElementById('resultRoe'),
  resultRoeAppreciation: document.getElementById('resultRoeAppreciation'),
  assessmentBadge: document.getElementById('assessmentBadge'),
  assessmentRange: document.getElementById('assessmentRange'),
  interpretationText: document.getElementById('interpretationText'),
  summaryInsight: document.getElementById('summaryInsight'),
  assessmentNote: document.getElementById('assessmentNote'),
};

function trackAnalyticsEvent(eventName, parameters = {}) {
  if (typeof window.swmTrackEvent === 'function') {
    window.swmTrackEvent(eventName, parameters);
  }
}

function trackCalculatorStarted() {
  if (analyticsState.calculatorStarted) return;
  analyticsState.calculatorStarted = true;
  trackAnalyticsEvent('calculator_started', {
    calculator: 'cashflow',
  });
}

function hasEnoughDataForResult() {
  return [
    elements.purchasePrice,
    elements.monthlyRent,
    elements.ltvPercent,
    elements.interestRate,
    elements.loanTerm,
  ].every((input) => input.value !== '' && Number.isFinite(Number.parseFloat(input.value)));
}

function trackCalculatorCompleted() {
  if (analyticsState.calculatorCompleted || !analyticsState.calculatorStarted || !hasEnoughDataForResult()) return;
  analyticsState.calculatorCompleted = true;
  trackAnalyticsEvent('calculator_completed', {
    calculator: 'cashflow',
  });
}

function observeResultVisibility() {
  const resultsPanel = document.querySelector('.panel-results');
  if (!resultsPanel || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    if (analyticsState.resultViewed) return;

    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      analyticsState.resultViewed = true;
      trackAnalyticsEvent('result_viewed', {
        calculator: 'cashflow',
      });
      observer.disconnect();
    });
  }, { threshold: 0.35 });

  observer.observe(resultsPanel);
}

function clamp(value, min, max = Infinity) {
  return Math.min(Math.max(value, min), max);
}

function readNumber(input, fallback = 0) {
  const value = Number.parseFloat(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value) {
  const zahl = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  return `${zahl} %`;
}

function formatNumber(value) {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value);
}

// Ergebnisfelder koennen sich beim Umbau der Seite aendern. Ein fehlendes Feld
// darf die Berechnung nicht abbrechen, sonst bleibt das ganze Ergebnis leer.
function setText(key, value) {
  const el = elements[key];
  if (!el) {
    console.warn(`[calculator] Ergebnisfeld "${key}" nicht gefunden - uebersprungen.`);
    return;
  }
  el.textContent = value;
}

// Zusammenfassung der eingeklappten Annahmen, damit sichtbar bleibt,
// womit gerechnet wird, ohne alle Felder aufzuklappen.
function updateAssumptionSummary() {
  if (!elements.assumptionSummary) return;
  const leerstand = state.vacancyMonths === 1
    ? '1 Monat Leerstand'
    : `${formatNumber(state.vacancyMonths)} Monate Leerstand`;
  const ruecklage = state.maintenanceMode === 'percent'
    ? `Rücklage ${formatNumber(state.maintenanceValue)} %`
    : `Rücklage ${formatCurrency(state.maintenanceValue)}/Jahr`;
  const wertsteigerung = state.appreciationRate > 0
    ? `${formatNumber(state.appreciationRate)} % Wertsteigerung`
    : 'keine Wertsteigerung';

  elements.assumptionSummary.textContent = [
    `ITP ${formatNumber(state.itpPercent)} %`,
    `Nebenkosten ${formatNumber(state.ancillaryPercent)} %`,
    ...(state.renovation > 0 ? [`Renovierung ${formatCurrency(state.renovation)}`] : []),
    leerstand,
    `${formatPercent(state.interestRate)} Zins`,
    `${formatNumber(state.loanTerm)} Jahre Laufzeit`,
    ruecklage,
    wertsteigerung,
  ].join(' · ');
}

function updateAppreciationVisibility() {
  const sichtbar = state.appreciationRate > 0;
  elements.appreciationRows.forEach((row) => {
    row.hidden = !sichtbar;
  });
}

// Sind Eingaben und Ergebnis untereinander (schmale Bildschirme), sieht man beim
// Tippen die Leitzahl nicht. Dann blendet sich unten eine Ergebniszeile ein,
// sobald die grosse Zahl aus dem Blickfeld gescrollt ist.
function observeStickyResult() {
  const headline = document.querySelector('.headline-card');
  if (!headline || !elements.stickyResult || !('IntersectionObserver' in window)) return;

  let ausserhalb = false;

  const aktualisieren = () => {
    const gestapelt = window.matchMedia('(max-width: 980px)').matches;
    const zeigen = gestapelt && ausserhalb;
    elements.stickyResult.hidden = !zeigen;
    document.body.classList.toggle('has-sticky-result', zeigen);
  };

  new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      ausserhalb = !entry.isIntersecting;
    });
    aktualisieren();
  }, { threshold: 0.1 }).observe(headline);

  window.addEventListener('resize', aktualisieren);

  elements.stickyResult.addEventListener('click', () => {
    headline.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

// Alle Eingabefelder, die aus `state` befuellt und ueberwacht werden.
const INPUT_KEYS = [
  'purchasePrice',
  'itpPercent',
  'ancillaryPercent',
  'renovation',
  'monthlyRent',
  'vacancyMonths',
  'ltvPercent',
  'interestRate',
  'loanTerm',
  'maintenanceValue',
  'otherCosts',
  'appreciationRate',
];

// Fehlt ein Element (z. B. weil ein Browser eine veraltete Skriptversion aus dem
// Cache mit neuem HTML kombiniert), darf das nicht das gesamte Formular lahmlegen:
// die uebrigen Felder werden weiterhin befuellt.
function fillInputs() {
  INPUT_KEYS.forEach((key) => {
    const el = elements[key];
    if (!el) {
      console.warn(`[calculator] Eingabefeld "${key}" nicht gefunden - uebersprungen.`);
      return;
    }
    el.value = state[key];
  });
  updateMaintenanceModeUI();
}

function updateMaintenanceModeUI() {
  const percentMode = state.maintenanceMode === 'percent';
  elements.maintenanceLabel.textContent = percentMode
    ? 'Instandhaltungsrücklage (% vom Kaufpreis)'
    : 'Instandhaltungsrücklage (€/Jahr)';
  elements.maintenanceValue.step = percentMode ? '0.1' : '50';

  elements.maintenanceToggleButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.maintenanceMode === state.maintenanceMode);
  });
}

function calculateAnnuity(loanAmount, interestRate, years) {
  if (loanAmount <= 0) return 0;
  if (interestRate === 0) return years > 0 ? loanAmount / years : 0;
  const i = interestRate;
  const factor = Math.pow(1 + i, years);
  return loanAmount * ((i * factor) / (factor - 1));
}

// Massstab der Bewertung ist ein breit gestreuter ETF mit rund 8 % im Jahr
// (MSCI World, rollierende 15 Jahre seit 1975). Wer Kapital in einem einzelnen
// Objekt bindet und Arbeit hineinsteckt, sollte spuerbar darueber liegen.
// Gerechnet wird vor Steuern und ohne Wertsteigerung - anders als beim ETF,
// in dessen Rendite der Kursgewinn bereits steckt.
const ETF_VERGLEICH = 8;

function getAssessment(roe) {
  if (roe < 5) {
    return {
      badge: '⚠️ Unter der Zielrendite',
      range: 'Eigenkapitalrendite unter 5 % — weniger als ein ETF',
      tone: 'is-warning-soft',
    };
  }
  if (roe < ETF_VERGLEICH) {
    return {
      badge: '⚠️ Etwa auf ETF-Niveau',
      range: 'Eigenkapitalrendite zwischen 5 % und 8 %',
      tone: 'is-warning',
    };
  }
  if (roe <= 13) {
    return {
      badge: '✅ Attraktiv',
      range: 'Eigenkapitalrendite zwischen 8 % und 13 % — über ETF-Niveau',
      tone: 'is-positive',
    };
  }
  return {
    badge: 'Starkes Ergebnis — Annahmen prüfen',
    range: 'Eigenkapitalrendite über 13 % — in diesem Markt ungewöhnlich',
    tone: 'is-strong',
  };
}

// Was passiert, wenn der Zins steigt? Bei variabler Finanzierung ist der Zins
// von heute nur eine Momentaufnahme. Deshalb rechnet der Rechner denselben Fall
// mit zwei Prozentpunkten mehr durch.
const ZINS_AUFSCHLAG = 2;

function getRateStress({ loanAmount, equity, annualRent, maintenance, otherCosts }) {
  if (loanAmount <= 0) return null;

  const stressRate = (state.interestRate + ZINS_AUFSCHLAG) / 100;
  const stressAnnuity = calculateAnnuity(stressRate === 0 ? 0 : loanAmount, stressRate, state.loanTerm);
  const stressFreeCashFlow = annualRent - stressAnnuity - maintenance - otherCosts;
  const stressEffect = annualRent - loanAmount * stressRate - maintenance - otherCosts;
  const stressRoe = equity > 0 ? (stressEffect / equity) * 100 : 0;

  return {
    monat: stressFreeCashFlow / 12,
    roe: stressRoe,
    zins: state.interestRate + ZINS_AUFSCHLAG,
  };
}

// Die Bewertung beruht bewusst nur auf Miete und Finanzierung. Eine moegliche
// Wertsteigerung kaeme obendrauf - das muss dastehen, sonst wirkt das Urteil
// strenger, als es gemeint ist.
// Schnellfilter aus Phase 3 des Buchs: ein Urteil allein aus Kaufpreis und
// Miete, noch ohne Finanzierung. Bewusst dieselben Grenzen wie im Buch.
function getGrossYieldVerdict(grossYield) {
  if (grossYield < 5) return 'meist nicht passend';
  if (grossYield < 8) return 'prüfenswert — solide Basis';
  if (grossYield <= 10) return 'sehr interessant';
  return 'genau prüfen — mögliche versteckte Risiken';
}

function renderVerdictScope(roe, roeWithAppreciation) {
  if (!elements.verdictScope) return;

  if (state.appreciationRate > 0) {
    elements.verdictScope.textContent =
      `Diese Bewertung beruht allein auf Miete und Finanzierung — die Eigenkapitalrendite liegt bei `
      + `${formatPercent(roe)}. Mit deinen ${formatNumber(state.appreciationRate)} % `
      + `Wertsteigerung wären es ${formatPercent(roeWithAppreciation)}. Das kommt `
      + `obendrauf, bleibt aber eine Annahme und keine Einnahme.`;
    return;
  }

  elements.verdictScope.textContent =
    'Diese Bewertung beruht allein auf Miete und Finanzierung. Eine mögliche '
    + 'Wertsteigerung ist nicht enthalten — sie käme obendrauf. Trag sie unter '
    + '„Annahmen anpassen“ ein, wenn du sie sehen willst.';
}

function renderRateStress(stress, freeCashFlowMonth) {
  if (!elements.rateStress) return;
  if (!stress) {
    elements.rateStress.hidden = true;
    elements.rateStress.classList.remove('is-critical');
    return;
  }
  elements.rateStress.hidden = false;

  const jetzt = formatCurrency(freeCashFlowMonth);
  const dann = formatCurrency(stress.monat);
  const zuzahlung = formatCurrency(Math.abs(stress.monat));
  const zinsAlt = formatPercent(state.interestRate);
  const zinsNeu = formatPercent(stress.zins);
  const rendite = formatPercent(stress.roe);

  const kippt = freeCashFlowMonth >= 0 && stress.monat < 0;
  elements.rateStress.classList.toggle('is-critical', kippt);

  elements.rateStressText.textContent = kippt
    ? `Steigt der Zins von ${zinsAlt} auf ${zinsNeu}, zahlst du ${zuzahlung} pro Monat drauf — statt ${jetzt} einzunehmen. Die Eigenkapitalrendite fällt auf ${rendite}.`
    : `Steigt der Zins von ${zinsAlt} auf ${zinsNeu}, bleiben ${dann} pro Monat statt ${jetzt}. Die Eigenkapitalrendite läge dann bei ${rendite}.`;
}

function getInterpretation(roe, freeCashFlow) {
  if (freeCashFlow < 0) {
    return 'Das Objekt trägt sich nach Finanzierung nicht selbst — du zahlst jeden Monat zu. Prüfe Kaufpreis, Finanzierung oder die angesetzte Miete.';
  }

  if (roe < 5) {
    return 'Das Objekt deckt seine Kosten, aber es bleibt weniger übrig als bei einem breit gestreuten ETF — bei deutlich mehr Aufwand, weniger Liquidität und dem Risiko eines einzelnen Objekts.';
  }

  if (roe < ETF_VERGLEICH) {
    return 'Das liegt etwa auf dem Niveau eines breit gestreuten ETF. Dafür bindest du Kapital in einem einzelnen Objekt und steckst Arbeit hinein. Das lohnt sich nur mit einem guten Grund.';
  }

  if (roe <= 13) {
    return 'Attraktiver Basisfall. Das Objekt liegt spürbar über dem, was ein breit gestreuter ETF liefert, und entschädigt damit für Aufwand und Klumpenrisiko.';
  }

  return 'Starkes Ergebnis — und in diesem Markt ungewöhnlich. Prüfe die Annahmen besonders sorgfältig: Ist der Kaufpreis realistisch? Ist die Miete dauerhaft erzielbar?';
}


const MASSSTAB = `
  <p><strong>Woran gemessen wird:</strong> an einem breit gestreuten Aktien-ETF.
  Der MSCI World hat über rollierende Fünfzehnjahreszeiträume seit 1975 rund
  8&nbsp;% im Jahr gebracht — im schlechtesten Zeitraum 1,3&nbsp;%, im besten
  über 14&nbsp;%. Das ist die Alternative, die du immer hast: ohne Kredit, ohne
  Arbeit, jederzeit verkäuflich.</p>
  <p><strong>Der Vergleich hinkt dabei zugunsten des ETF.</strong> Dessen Rendite
  enthält den Kursgewinn. Die Eigenkapitalrendite hier enthält <em>weder Wertsteigerung noch
  Steuerwirkung</em> — beides käme bei der Wohnung noch obendrauf. Wer die
  8&nbsp;% auf dieser bewusst pessimistischen Rechnung erreicht, liegt real
  also darüber.</p>
`;

const HEBEL = `
  <p>Verbessern lässt sich das üblicherweise über:</p>
  <ul>
    <li>besserer Kaufpreis — der stärkste Hebel im Gespräch</li>
    <li>höhere Mieteinnahme, sofern der Markt sie hergibt</li>
    <li>bessere Finanzierungskonditionen</li>
  </ul>
`;

function getAssessmentNote(roe, freeCashFlow) {
  if (freeCashFlow < 0) {
    return `
      <p>Bei der nächsten größeren Reparatur wird das unangenehm: Du musst dann
      aus eigener Tasche nachlegen, während das Objekt ohnehin schon Geld kostet.</p>
      ${HEBEL}
      ${MASSSTAB}
    `;
  }

  if (roe < 5) {
    return `
      <p>Dafür bindest du Kapital, nimmst Kredit auf und hast Arbeit mit Mietern,
      Handwerkern und Behörden. Dieses Verhältnis geht nicht auf.</p>
      ${HEBEL}
      ${MASSSTAB}
    `;
  }

  if (roe < ETF_VERGLEICH) {
    return `
      <p>Für denselben Ertrag nimmst du hier deutlich mehr auf dich: ein einzelnes
      Objekt statt breiter Streuung, gebundenes Kapital und laufenden Aufwand.</p>
      <p>Das kann sich trotzdem lohnen — etwa wenn du der Lage langfristig mehr
      zutraust oder die Steuerwirkung in deinem Fall stark ist. Ein Selbstläufer
      ist es nicht.</p>
      ${HEBEL}
      ${MASSSTAB}
    `;
  }

  if (roe <= 13) {
    return `
      <p>Prüfe trotzdem, ob die angesetzte Miete dauerhaft erzielbar ist. Sie ist
      die Zahl, bei der sich die meisten selbst betrügen — und sie trägt das
      ganze Ergebnis.</p>
      ${MASSSTAB}
    `;
  }

  return `
    <p>Bruttomietrenditen über 10&nbsp;% gibt es in spanischen Großstädten
    praktisch nicht. Prüfe deshalb besonders sorgfältig:</p>
    <ul>
      <li>Ist der Kaufpreis realistisch, oder steckt ein Sanierungsstau dahinter?</li>
      <li>Ist die Miete dauerhaft erzielbar, oder nur kurzfristig?</li>
      <li>Stimmen Leerstand und Rücklage für dieses Objekt?</li>
    </ul>
    ${MASSSTAB}
  `;
}

function recalculate() {
  state.purchasePrice = clamp(readNumber(elements.purchasePrice, defaults.purchasePrice), 0);
  state.itpPercent = clamp(readNumber(elements.itpPercent, defaults.itpPercent), 0);
  state.ancillaryPercent = clamp(readNumber(elements.ancillaryPercent, defaults.ancillaryPercent), 0);
  state.renovation = clamp(readNumber(elements.renovation, defaults.renovation), 0);
  state.monthlyRent = clamp(readNumber(elements.monthlyRent, defaults.monthlyRent), 0);
  state.vacancyMonths = clamp(readNumber(elements.vacancyMonths, defaults.vacancyMonths), 0, 12);
  state.ltvPercent = clamp(readNumber(elements.ltvPercent, defaults.ltvPercent), 0, 100);
  state.interestRate = clamp(readNumber(elements.interestRate, defaults.interestRate), 0);
  state.loanTerm = clamp(readNumber(elements.loanTerm, defaults.loanTerm), 1);
  state.maintenanceValue = clamp(readNumber(elements.maintenanceValue, defaults.maintenanceValue), 0);
  state.otherCosts = clamp(readNumber(elements.otherCosts, defaults.otherCosts), 0);
  state.appreciationRate = clamp(readNumber(elements.appreciationRate, defaults.appreciationRate), 0);

  const transferTax = state.purchasePrice * (state.itpPercent / 100);
  const ancillaryCosts = state.purchasePrice * (state.ancillaryPercent / 100);
  const closingCosts = transferTax + ancillaryCosts;
  // Eine Renovierung gehoert zur Investition, nicht zu den laufenden Kosten.
  const totalInvestment = state.purchasePrice + closingCosts + state.renovation;
  // Die Bank finanziert einen Anteil des Kaufpreises. Wie viel Eigenkapital noetig
  // ist, ergibt sich daraus - inklusive Nebenkosten und Renovierung, die kein
  // Darlehen abdeckt.
  const loanAmount = state.purchasePrice * (state.ltvPercent / 100);
  const equity = Math.max(totalInvestment - loanAmount, 0);
  const ltv = state.ltvPercent;
  const annualRent = state.monthlyRent * (12 - state.vacancyMonths);
  const maintenance =
    state.maintenanceMode === 'percent'
      ? state.purchasePrice * (state.maintenanceValue / 100)
      : state.maintenanceValue;
  const interestRateDecimal = state.interestRate / 100;
  const annuity = calculateAnnuity(loanAmount, interestRateDecimal, state.loanTerm);
  const interestYear1 = loanAmount * interestRateDecimal;
  const principalYear1 = Math.max(annuity - interestYear1, 0);
  const operatingCashFlow = annualRent - interestYear1 - maintenance - state.otherCosts;
  const freeCashFlow = annualRent - annuity - maintenance - state.otherCosts;
  const freeCashFlowMonth = freeCashFlow / 12;
  const appreciationAmount = state.purchasePrice * (state.appreciationRate / 100);
  const totalEconomicEffect = freeCashFlow + principalYear1;
  const totalEconomicEffectWithAppreciation = totalEconomicEffect + appreciationAmount;
  const roe = equity > 0 ? (totalEconomicEffect / equity) * 100 : 0;
  const roeWithAppreciation = equity > 0 ? (totalEconomicEffectWithAppreciation / equity) * 100 : 0;

  elements.equityHint.textContent = equity <= 0
    ? 'Das Darlehen deckt die gesamte Investition. Eine Eigenkapitalrendite lässt sich dann nicht sinnvoll berechnen.'
    : `Dafür brauchst du ${formatCurrency(equity)} Eigenkapital — Nebenkosten und Renovierung zahlt keine Bank mit.`;

  setText('resultTransferTax', formatCurrency(transferTax));
  setText('resultAncillaryCosts', formatCurrency(ancillaryCosts));
  setText('resultClosingCosts', formatCurrency(closingCosts));
  setText('resultRenovation', formatCurrency(state.renovation));
  setText('resultTotalInvestment', formatCurrency(totalInvestment));
  setText('resultEquity', formatCurrency(equity));
  setText('resultLoanAmount', formatCurrency(loanAmount));
  setText('resultLtv', formatPercent(ltv));
  setText('resultAnnualRent', formatCurrency(annualRent));
  setText('resultMaintenance', formatCurrency(maintenance));
  setText('resultOtherCosts', formatCurrency(state.otherCosts));
  setText('resultAnnuity', formatCurrency(annuity));
  setText('resultInterestYear1', formatCurrency(interestYear1));
  setText('resultPrincipalYear1', formatCurrency(principalYear1));
  setText('resultTotalInterest', formatCurrency(Math.max(annuity * state.loanTerm - loanAmount, 0)));
  setText('resultOperatingCashFlow', `${formatCurrency(operatingCashFlow)} / Jahr`);
  setText('resultFreeCashFlow', `${formatCurrency(freeCashFlow)} / Jahr`);
  const grossYield = state.purchasePrice > 0
    ? ((state.monthlyRent * 12) / state.purchasePrice) * 100
    : 0;
  setText('resultGrossYield', formatPercent(grossYield));
  setText('grossYieldVerdict', `Schnellfilter des Buchs: ${getGrossYieldVerdict(grossYield)}`);
  setText('resultFreeCashFlowMonth', `${formatCurrency(freeCashFlowMonth)} / Monat`);
  setText('stickyResultValue', `${formatCurrency(freeCashFlowMonth)} / Monat`);
  setText('resultPrincipalWealth', `${formatCurrency(principalYear1)} / Jahr`);
  setText('resultEconomicEffect', `${formatCurrency(totalEconomicEffect)} / Jahr`);
  setText('resultEconomicEffectAppreciation', `${formatCurrency(totalEconomicEffectWithAppreciation)} / Jahr`);
  setText('resultRoe', formatPercent(roe));
  setText('resultRoeAppreciation', formatPercent(roeWithAppreciation));

  renderVerdictScope(roe, roeWithAppreciation);
  renderRateStress(
    getRateStress({ loanAmount, equity, annualRent, maintenance, otherCosts: state.otherCosts }),
    freeCashFlowMonth,
  );
  updateAssumptionSummary();
  updateAppreciationVisibility();

  const assessment = getAssessment(roe);
  elements.assessmentBadge.className = `assessment-badge ${assessment.tone}`;
  setText('assessmentBadge', assessment.badge);
  setText('assessmentRange', assessment.range);
  setText('interpretationText', getInterpretation(roe, freeCashFlow));
  setText('summaryInsight', `💡 Dieses Objekt erwirtschaftet ${formatCurrency(freeCashFlowMonth)} freien Cashflow pro Monat und baut ${formatCurrency(principalYear1)} pro Jahr an Eigenkapital auf.`);
  elements.assessmentNote.innerHTML = getAssessmentNote(roe, freeCashFlow);
}

function attachEvents() {
  INPUT_KEYS.map((key) => elements[key]).filter(Boolean).forEach((input) => {
    input.addEventListener('input', () => {
      trackCalculatorStarted();
      recalculate();
      trackCalculatorCompleted();
    });
  });

  elements.maintenanceToggleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const newMode = button.dataset.maintenanceMode;
      if (!newMode || newMode === state.maintenanceMode) return;
      state.maintenanceMode = newMode;
      state.maintenanceValue = newMode === 'percent' ? defaults.maintenanceValue : Math.round(defaults.purchasePrice * (defaults.maintenanceValue / 100));
      elements.maintenanceValue.value = state.maintenanceValue;
      updateMaintenanceModeUI();
      trackCalculatorStarted();
      recalculate();
      trackCalculatorCompleted();
    });
  });

  elements.resetButton.addEventListener('click', () => {
    Object.assign(state, defaults);
    fillInputs();
    recalculate();
  });
}

fillInputs();
attachEvents();
recalculate();
observeResultVisibility();
observeStickyResult();
