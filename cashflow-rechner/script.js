const defaults = {
  purchasePrice: 143000,
  itpPercent: 10,
  ancillaryPercent: 2,
  monthlyRent: 1000,
  vacancyMonths: 1,
  equity: 60060,
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
  monthlyRent: document.getElementById('monthlyRent'),
  vacancyMonths: document.getElementById('vacancyMonths'),
  equity: document.getElementById('equity'),
  interestRate: document.getElementById('interestRate'),
  loanTerm: document.getElementById('loanTerm'),
  maintenanceValue: document.getElementById('maintenanceValue'),
  otherCosts: document.getElementById('otherCosts'),
  appreciationRate: document.getElementById('appreciationRate'),
  maintenanceLabel: document.getElementById('maintenanceLabel'),
  maintenanceToggleButtons: document.querySelectorAll('[data-maintenance-mode]'),
  equityHint: document.getElementById('equityHint'),
  resetButton: document.getElementById('resetButton'),
  resultTransferTax: document.getElementById('resultTransferTax'),
  resultAncillaryCosts: document.getElementById('resultAncillaryCosts'),
  resultClosingCosts: document.getElementById('resultClosingCosts'),
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
    elements.equity,
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
  return `${value.toFixed(1)}%`;
}

// Alle Eingabefelder, die aus `state` befuellt und ueberwacht werden.
const INPUT_KEYS = [
  'purchasePrice',
  'itpPercent',
  'ancillaryPercent',
  'monthlyRent',
  'vacancyMonths',
  'equity',
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

function getAssessment(roe) {
  if (roe < 10) {
    return {
      badge: '⚠️ Unter der Zielrendite',
      range: 'ROE unter 10 %',
      tone: 'is-warning-soft',
    };
  }
  if (roe < 15) {
    return {
      badge: '⚠️ Solide, aber ausbaufähig',
      range: 'ROE zwischen 10 % und 15 %',
      tone: 'is-warning',
    };
  }
  if (roe <= 25) {
    return {
      badge: '✅ Attraktiv',
      range: 'ROE zwischen 15 % und 25 %',
      tone: 'is-positive',
    };
  }
  return {
    badge: 'Starkes Modellergebnis',
    range: 'ROE über 25 %',
    tone: 'is-strong',
  };
}

function getInterpretation(roe, freeCashFlow) {
  if (freeCashFlow < 0) {
    return 'Konservative Vorauswahl. Das Objekt trägt sich nach Finanzierung nicht vollständig selbst. Prüfe Kaufpreis, Finanzierung oder die angesetzte Miete.';
  }

  if (roe < 10) {
    return 'Das Objekt deckt die angesetzten Kosten, die Rendite liegt aber unter dem Zielkorridor. Prüfe Kaufpreis, Finanzierung oder die angesetzte Miete.';
  }

  if (roe < 15) {
    return 'Solides Modellergebnis. Spielraum besteht beim Kaufpreis, bei der Finanzierung oder bei der Mieteinnahme.';
  }

  if (roe <= 25) {
    return 'Attraktiver Basisfall. Das Objekt trägt sich selbst und erreicht unter konservativen Annahmen eine gesunde Zielrendite.';
  }

  return 'Starkes Gesamtbild. Prüfe die Annahmen besonders sorgfältig, um die langfristige Tragfähigkeit abzusichern.';
}


function getAssessmentNote(roe, freeCashFlow) {
  if (freeCashFlow < 0) {
    return `
      <p>Dies ist eine konservative Vorauswahl.</p>
      <p>Unter den aktuellen Annahmen trägt sich das Objekt nach Finanzierung nicht vollständig selbst.</p>
      <p>Verbessern lässt sich das üblicherweise über:</p>
      <ul>
        <li>besserer Kaufpreis</li>
        <li>optimierte Finanzierung</li>
        <li>höhere Mieteinnahme</li>
      </ul>
      <p>Steuern sind nicht eingerechnet und verbessern das Ergebnis in der Praxis meist.</p>
    `;
  }

  if (roe < 10) {
    return `
      <p>Dies ist eine konservative Vorauswahl.</p>
      <p>Das Objekt erwirtschaftet einen positiven Cashflow, erreicht die Zielrendite aber noch nicht.</p>
      <p>Verbessern lässt sich das üblicherweise über:</p>
      <ul>
        <li>besserer Kaufpreis</li>
        <li>optimierte Finanzierung</li>
        <li>höhere Mieteinnahme</li>
      </ul>
      <p>Steuern sind nicht eingerechnet und verbessern das Ergebnis in der Praxis meist.</p>
    `;
  }

  if (roe < 15) {
    return `
      <p>Dies ist eine konservative Vorauswahl.</p>
      <p>Das gerechnete Szenario deckt seine Kosten und ergibt einen soliden Basisfall, Luft nach oben bleibt aber.</p>
      <p>Verbessern lässt sich das üblicherweise über:</p>
      <ul>
        <li>besserer Kaufpreis</li>
        <li>optimierte Finanzierung</li>
        <li>höhere Mieteinnahme</li>
      </ul>
      <p>Steuern sind nicht eingerechnet und verbessern das Ergebnis in der Praxis meist.</p>
    `;
  }

  if (roe <= 25) {
    return `
      <p>Dies ist eine konservative Vorauswahl.</p>
      <p>Das Objekt erwirtschaftet einen positiven Cashflow und liegt im Zielkorridor der Rendite.</p>
      <p>Zusätzlicher Spielraum ergibt sich üblicherweise über:</p>
      <ul>
        <li>besserer Kaufpreis</li>
        <li>optimierte Finanzierung</li>
        <li>höhere Mieteinnahme</li>
      </ul>
      <p>Steuern sind nicht eingerechnet und verbessern das Ergebnis in der Praxis meist.</p>
    `;
  }

  return `
    <p>Dies ist eine konservative Vorauswahl.</p>
    <p>Das Objekt erwirtschaftet einen positiven Cashflow und liegt über dem Zielkorridor der Rendite.</p>
    <p>Prüfe die zentralen Annahmen besonders sorgfältig, vor allem:</p>
    <ul>
      <li>ob der Kaufpreis realistisch ist</li>
      <li>die Finanzierungskonditionen</li>
      <li>ob die Miete dauerhaft erzielbar ist</li>
    </ul>
    <p>Steuern sind nicht eingerechnet und verbessern das Ergebnis in der Praxis meist.</p>
  `;
}

function recalculate() {
  state.purchasePrice = clamp(readNumber(elements.purchasePrice, defaults.purchasePrice), 0);
  state.itpPercent = clamp(readNumber(elements.itpPercent, defaults.itpPercent), 0);
  state.ancillaryPercent = clamp(readNumber(elements.ancillaryPercent, defaults.ancillaryPercent), 0);
  state.monthlyRent = clamp(readNumber(elements.monthlyRent, defaults.monthlyRent), 0);
  state.vacancyMonths = clamp(readNumber(elements.vacancyMonths, defaults.vacancyMonths), 0, 12);
  state.equity = clamp(readNumber(elements.equity, defaults.equity), 0);
  state.interestRate = clamp(readNumber(elements.interestRate, defaults.interestRate), 0);
  state.loanTerm = clamp(readNumber(elements.loanTerm, defaults.loanTerm), 1);
  state.maintenanceValue = clamp(readNumber(elements.maintenanceValue, defaults.maintenanceValue), 0);
  state.otherCosts = clamp(readNumber(elements.otherCosts, defaults.otherCosts), 0);
  state.appreciationRate = clamp(readNumber(elements.appreciationRate, defaults.appreciationRate), 0);

  const transferTax = state.purchasePrice * (state.itpPercent / 100);
  const ancillaryCosts = state.purchasePrice * (state.ancillaryPercent / 100);
  const closingCosts = transferTax + ancillaryCosts;
  const totalInvestment = state.purchasePrice + closingCosts;
  const rawLoanAmount = totalInvestment - state.equity;
  const loanAmount = Math.max(rawLoanAmount, 0);
  const ltv = state.purchasePrice > 0 ? (loanAmount / state.purchasePrice) * 100 : 0;
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
  const roe = state.equity > 0 ? (totalEconomicEffect / state.equity) * 100 : 0;
  const roeWithAppreciation = state.equity > 0 ? (totalEconomicEffectWithAppreciation / state.equity) * 100 : 0;

  elements.equityHint.textContent =
    rawLoanAmount < 0
      ? 'Dein Eigenkapital übersteigt die Gesamtinvestition. Die Darlehenssumme wird deshalb auf 0 € und der LTV auf 0,0 % gesetzt.'
      : '';

  elements.resultTransferTax.textContent = formatCurrency(transferTax);
  elements.resultAncillaryCosts.textContent = formatCurrency(ancillaryCosts);
  elements.resultClosingCosts.textContent = formatCurrency(closingCosts);
  elements.resultTotalInvestment.textContent = formatCurrency(totalInvestment);
  elements.resultLoanAmount.textContent = formatCurrency(loanAmount);
  elements.resultLtv.textContent = formatPercent(ltv);
  elements.resultAnnualRent.textContent = formatCurrency(annualRent);
  elements.resultMaintenance.textContent = formatCurrency(maintenance);
  elements.resultOtherCosts.textContent = formatCurrency(state.otherCosts);
  elements.resultAnnuity.textContent = formatCurrency(annuity);
  elements.resultInterestYear1.textContent = formatCurrency(interestYear1);
  elements.resultPrincipalYear1.textContent = formatCurrency(principalYear1);
  elements.resultOperatingCashFlow.textContent = `${formatCurrency(operatingCashFlow)} / Jahr`;
  elements.resultFreeCashFlow.textContent = `${formatCurrency(freeCashFlow)} / Jahr`;
  elements.resultFreeCashFlowMonth.textContent = `${formatCurrency(freeCashFlowMonth)} / month`;
  elements.resultPrincipalWealth.textContent = `${formatCurrency(principalYear1)} / Jahr`;
  elements.resultEconomicEffect.textContent = `${formatCurrency(totalEconomicEffect)} / Jahr`;
  elements.resultEconomicEffectAppreciation.textContent = `${formatCurrency(totalEconomicEffectWithAppreciation)} / Jahr`;
  elements.resultRoe.textContent = formatPercent(roe);
  elements.resultRoeAppreciation.textContent = formatPercent(roeWithAppreciation);

  const assessment = getAssessment(roe);
  elements.assessmentBadge.className = `assessment-badge ${assessment.tone}`;
  elements.assessmentBadge.textContent = assessment.badge;
  elements.assessmentRange.textContent = assessment.range;
  elements.interpretationText.textContent = getInterpretation(roe, freeCashFlow);
  elements.summaryInsight.textContent = `💡 Dieses Objekt erwirtschaftet ${formatCurrency(freeCashFlowMonth)} freien Cashflow pro Monat und baut ${formatCurrency(principalYear1)} pro Jahr an Eigenkapital auf.`;
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
