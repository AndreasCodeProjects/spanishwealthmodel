const defaults = {
  purchasePrice: 143000,
  closingCostsPercent: 12,
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

const elements = {
  purchasePrice: document.getElementById('purchasePrice'),
  closingCostsPercent: document.getElementById('closingCostsPercent'),
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

function clamp(value, min, max = Infinity) {
  return Math.min(Math.max(value, min), max);
}

function readNumber(input, fallback = 0) {
  const value = Number.parseFloat(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function fillInputs() {
  elements.purchasePrice.value = state.purchasePrice;
  elements.closingCostsPercent.value = state.closingCostsPercent;
  elements.monthlyRent.value = state.monthlyRent;
  elements.vacancyMonths.value = state.vacancyMonths;
  elements.equity.value = state.equity;
  elements.interestRate.value = state.interestRate;
  elements.loanTerm.value = state.loanTerm;
  elements.maintenanceValue.value = state.maintenanceValue;
  elements.otherCosts.value = state.otherCosts;
  elements.appreciationRate.value = state.appreciationRate;
  updateMaintenanceModeUI();
}

function updateMaintenanceModeUI() {
  const percentMode = state.maintenanceMode === 'percent';
  elements.maintenanceLabel.textContent = percentMode
    ? 'Maintenance Reserve (% of Purchase Price)'
    : 'Maintenance Reserve (€/year)';
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
      badge: '⚠️ Below target return',
      range: 'ROE below 10%',
      tone: 'is-warning-soft',
    };
  }
  if (roe < 15) {
    return {
      badge: '⚠️ Solid, but can be improved',
      range: 'ROE between 10% and 15%',
      tone: 'is-warning',
    };
  }
  if (roe <= 25) {
    return {
      badge: '✅ Attractive',
      range: 'ROE between 15% and 25%',
      tone: 'is-positive',
    };
  }
  return {
    badge: '🔥 Strong investment',
    range: 'ROE above 25%',
    tone: 'is-strong',
  };
}

function getInterpretation(roe, freeCashFlow) {
  if (freeCashFlow < 0) {
    return 'Conservative pre-screening. The property does not fully support itself after financing. Review price, financing, or rental assumptions.';
  }

  if (roe < 10) {
    return 'The property is self-supporting, but the return is below the target range. Review purchase price, financing, or rental assumptions.';
  }

  if (roe < 15) {
    return 'Solid base case. Optimization potential exists in purchase price, financing, or rental income.';
  }

  if (roe <= 25) {
    return 'Attractive base case. The property supports itself and reaches a healthy target return under conservative assumptions.';
  }

  return 'Strong overall case. Validate assumptions carefully to confirm long-term sustainability.';
}


function getAssessmentNote(roe, freeCashFlow) {
  if (freeCashFlow < 0) {
    return `
      <p>This is a conservative pre-screening.</p>
      <p>The property does not fully support itself after financing under the current assumptions.</p>
      <p>Improvements are typically possible through:</p>
      <ul>
        <li>better purchase price</li>
        <li>optimized financing</li>
        <li>higher rental income</li>
      </ul>
      <p>Taxes are not included and may improve results in practice.</p>
    `;
  }

  if (roe < 10) {
    return `
      <p>This is a conservative pre-screening.</p>
      <p>The property generates positive cash flow but does not yet meet the target return.</p>
      <p>Improvements are typically possible through:</p>
      <ul>
        <li>better purchase price</li>
        <li>optimized financing</li>
        <li>higher rental income</li>
      </ul>
      <p>Taxes are not included and may improve results in practice.</p>
    `;
  }

  if (roe < 15) {
    return `
      <p>This is a conservative pre-screening.</p>
      <p>The property is self-supporting and offers a solid base case, but there is still room for improvement.</p>
      <p>Improvements are typically possible through:</p>
      <ul>
        <li>better purchase price</li>
        <li>optimized financing</li>
        <li>higher rental income</li>
      </ul>
      <p>Taxes are not included and may improve results in practice.</p>
    `;
  }

  if (roe <= 25) {
    return `
      <p>This is a conservative pre-screening.</p>
      <p>The property generates positive cash flow and meets the target return range.</p>
      <p>Further upside is typically possible through:</p>
      <ul>
        <li>better purchase price</li>
        <li>optimized financing</li>
        <li>higher rental income</li>
      </ul>
      <p>Taxes are not included and may improve results in practice.</p>
    `;
  }

  return `
    <p>This is a conservative pre-screening.</p>
    <p>The property generates positive cash flow and exceeds the target return range.</p>
    <p>Please validate key assumptions carefully, especially:</p>
    <ul>
      <li>purchase price realism</li>
      <li>financing terms</li>
      <li>sustainable rental income</li>
    </ul>
    <p>Taxes are not included and may improve results in practice.</p>
  `;
}

function recalculate() {
  state.purchasePrice = clamp(readNumber(elements.purchasePrice, defaults.purchasePrice), 0);
  state.closingCostsPercent = clamp(readNumber(elements.closingCostsPercent, defaults.closingCostsPercent), 0);
  state.monthlyRent = clamp(readNumber(elements.monthlyRent, defaults.monthlyRent), 0);
  state.vacancyMonths = clamp(readNumber(elements.vacancyMonths, defaults.vacancyMonths), 0, 12);
  state.equity = clamp(readNumber(elements.equity, defaults.equity), 0);
  state.interestRate = clamp(readNumber(elements.interestRate, defaults.interestRate), 0);
  state.loanTerm = clamp(readNumber(elements.loanTerm, defaults.loanTerm), 1);
  state.maintenanceValue = clamp(readNumber(elements.maintenanceValue, defaults.maintenanceValue), 0);
  state.otherCosts = clamp(readNumber(elements.otherCosts, defaults.otherCosts), 0);
  state.appreciationRate = clamp(readNumber(elements.appreciationRate, defaults.appreciationRate), 0);

  const closingCosts = state.purchasePrice * (state.closingCostsPercent / 100);
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
      ? 'Equity exceeds total investment. Loan Amount is therefore set to €0 and LTV to 0.0%.'
      : '';

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
  elements.resultOperatingCashFlow.textContent = `${formatCurrency(operatingCashFlow)} / year`;
  elements.resultFreeCashFlow.textContent = `${formatCurrency(freeCashFlow)} / year`;
  elements.resultFreeCashFlowMonth.textContent = `${formatCurrency(freeCashFlowMonth)} / month`;
  elements.resultPrincipalWealth.textContent = `${formatCurrency(principalYear1)} / year`;
  elements.resultEconomicEffect.textContent = `${formatCurrency(totalEconomicEffect)} / year`;
  elements.resultEconomicEffectAppreciation.textContent = `${formatCurrency(totalEconomicEffectWithAppreciation)} / year`;
  elements.resultRoe.textContent = formatPercent(roe);
  elements.resultRoeAppreciation.textContent = formatPercent(roeWithAppreciation);

  const assessment = getAssessment(roe);
  elements.assessmentBadge.className = `assessment-badge ${assessment.tone}`;
  elements.assessmentBadge.textContent = assessment.badge;
  elements.assessmentRange.textContent = assessment.range;
  elements.interpretationText.textContent = getInterpretation(roe, freeCashFlow);
  elements.summaryInsight.textContent = `💡 This property generates ${formatCurrency(freeCashFlowMonth)}/month free cash flow and builds ${formatCurrency(principalYear1)}/year in equity.`;
  elements.assessmentNote.innerHTML = getAssessmentNote(roe, freeCashFlow);
}

function attachEvents() {
  [
    elements.purchasePrice,
    elements.closingCostsPercent,
    elements.monthlyRent,
    elements.vacancyMonths,
    elements.equity,
    elements.interestRate,
    elements.loanTerm,
    elements.maintenanceValue,
    elements.otherCosts,
    elements.appreciationRate,
  ].forEach((input) => {
    input.addEventListener('input', recalculate);
  });

  elements.maintenanceToggleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const newMode = button.dataset.maintenanceMode;
      if (!newMode || newMode === state.maintenanceMode) return;
      state.maintenanceMode = newMode;
      state.maintenanceValue = newMode === 'percent' ? defaults.maintenanceValue : Math.round(defaults.purchasePrice * (defaults.maintenanceValue / 100));
      elements.maintenanceValue.value = state.maintenanceValue;
      updateMaintenanceModeUI();
      recalculate();
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
