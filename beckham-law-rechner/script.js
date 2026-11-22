// Beckham-Regime gegen allgemeines IRPF.
//
// Steuertabellen aus offiziellen Quellen:
//   escala estatal general   AEAT, Art. 63.1.1 Ley IRPF (2026 unveraendert)
//   escala autonomica CV     Generalitat Valenciana, Llei 5/2026, ab 01.01.2026
//   Art. 93 LIRPF            AEAT, 24 % bis 600.000 EUR, darueber 47 %
//
// Unter dem Sonderregime gibt es keine Abzuege: kein mínimo personal, keine
// Sozialversicherung, keine Werbungskosten, kein Abschlag fuer Vermietung.
// Besteuert wird der Bruttobetrag.

const SKALEN = {
  estatal: [[0, 9.5], [12450, 12], [20200, 15], [35200, 18.5], [60000, 22.5], [300000, 24.5]],
  beckham: [[0, 24], [600000, 47]],
  autonomica: {
    valencia: [[0, 8.8], [12000, 11.7], [22000, 14.6], [32000, 17], [42000, 19.4],
               [52000, 21.9], [62000, 24.4], [72000, 26.1], [100000, 27.35],
               [150000, 28.35], [200000, 29.35]],
  },
};

const defaults = {
  grossSalary: 80000,
  region: 'valencia',
  flatCount: 1,
  rentPerFlat: 12600,
  costsPerFlat: 1400,
  interestPerFlat: 3220,
  purchasePricePerFlat: 167000,
  buildingShare: 60,
  acquisitionCostsPerFlat: 18370,
  depreciationAmount: 3300,
  buildingMode: 'percent',
  cadastralBuilding: 10227,
  cadastralTotal: 17642,
  rentReduction: 50,
  ssRate: 6.5,
  ssCeiling: 61214,
  flatRateExpenses: 2000,
  personalAllowance: 5550,
};

const state = { ...defaults };

const INPUT_KEYS = [
  'grossSalary', 'flatCount', 'rentPerFlat', 'costsPerFlat', 'interestPerFlat',
  'purchasePricePerFlat', 'acquisitionCostsPerFlat', 'buildingShare',
  'depreciationAmount', 'cadastralBuilding', 'cadastralTotal',
  'rentReduction', 'ssRate', 'ssCeiling',
  'flatRateExpenses',
  'personalAllowance',
];

const elements = { buildingToggles: document.querySelectorAll('[data-building-mode]') };
[...INPUT_KEYS, 'region', 'resetButton', 'assumptionSummary', 'buildingLabel', 'ibiFields', 'amountField', 'shareFields'].forEach((k) => {
  elements[k] = document.getElementById(k);
});

const AUSGABE_IDS = [
  'headlineValue', 'headlineUnit', 'headlineLabel',
  'breakevenValue', 'breakevenNote',
  'taxBeckham', 'taxGeneral', 'netBeckham', 'netGeneral', 'resultDepreciation',
  'depreciationBasis',
  'grossBeckham', 'grossGeneral', 'rentBeckham', 'rentGeneral',
  'ssBeckham', 'ssGeneral', 'diffYear', 'diffMonth', 'verlaufBody',
];
AUSGABE_IDS.forEach((k) => { elements[k] = document.getElementById(k); });

function setText(key, value) {
  const el = elements[key];
  if (!el) {
    console.warn(`[beckham] Feld "${key}" nicht gefunden - uebersprungen.`);
    return;
  }
  // Abgeleitete Werte stehen teils in readonly-Feldern, dort zaehlt value.
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    el.value = value;
  } else {
    el.textContent = value;
  }
}

const euro = (v) => new Intl.NumberFormat('de-DE', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
}).format(v);

const zahl = (v) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(v);

function clamp(v, min, max = Infinity) {
  return Math.min(Math.max(v, min), max);
}

function readNumber(input, fallback) {
  const v = Number.parseFloat(input ? input.value : NaN);
  return Number.isFinite(v) ? v : fallback;
}

// Progressive Steuer: jede Stufe gilt fuer den Teil oberhalb ihrer Schwelle.
function tarif(basis, skala) {
  let steuer = 0;
  for (let i = 0; i < skala.length; i += 1) {
    const [schwelle] = skala[i];
    const satz = skala[i][1];
    const obergrenze = i + 1 < skala.length ? skala[i + 1][0] : Infinity;
    if (basis <= schwelle) break;
    steuer += ((Math.min(basis, obergrenze) - schwelle) * satz) / 100;
  }
  return steuer;
}

function steuerAllgemein(basis) {
  const auto = SKALEN.autonomica[state.region] || SKALEN.autonomica.valencia;
  const estatal = tarif(basis, SKALEN.estatal) - tarif(state.personalAllowance, SKALEN.estatal);
  const autonomica = tarif(basis, auto) - tarif(state.personalAllowance, auto);
  return Math.max(estatal, 0) + Math.max(autonomica, 0);
}

// Abschreibung: 3 % jaehrlich auf den Gebaeudewert (valor de construcción), nicht
// auf den Kaufpreis. Der Grundstuecksanteil wird nicht abgeschrieben.
const AFA_SATZ = 3;

// Der Katasterwert liegt meist weit unter dem Kaufpreis. Massgeblich ist deshalb
// nicht sein Betrag, sondern das Verhaeltnis von Gebaeude zu Gesamtwert - dieser
// Anteil wird auf den Kaufpreis angewendet.
function gebaeudeanteil() {
  if (state.buildingMode === 'ibi') {
    return state.cadastralTotal > 0
      ? (state.cadastralBuilding / state.cadastralTotal) * 100
      : 0;
  }
  return state.buildingShare;
}



// Massgeblich ist der hoehere Wert aus Anschaffungskosten und Katasterwert,
// in beiden Faellen ohne Grund und Boden. In aller Regel gewinnt der Kaufpreis,
// weil Katasterwerte deutlich darunter liegen.
function abschreibungsbasis() {
  // Anschaffungskosten sind Kaufpreis PLUS Erwerbsnebenkosten, davon der Gebaeudeanteil.
  const anschaffung = state.purchasePricePerFlat + state.acquisitionCostsPerFlat;
  const ausAnschaffung = anschaffung * (gebaeudeanteil() / 100);
  const ausKataster = state.buildingMode === 'ibi' ? state.cadastralBuilding : 0;
  return { anschaffung, ausAnschaffung, ausKataster, basis: Math.max(ausAnschaffung, ausKataster) };
}

function abschreibung() {
  if (state.buildingMode === 'amount') return state.depreciationAmount;
  return (abschreibungsbasis().basis * AFA_SATZ) / 100;
}

// Netto-Mieteinkunft je Wohnung nach Abzuegen und Abschlag (nur im allgemeinen Regime).
function mieteNachAbschlag() {
  const netto = Math.max(
    state.rentPerFlat - state.costsPerFlat - state.interestPerFlat - abschreibung(),
    0,
  );
  return netto * (1 - state.rentReduction / 100);
}

// Der Arbeitnehmeranteil haengt am Gehalt und ist nach oben gedeckelt.
function sozialversicherung() {
  return (Math.min(state.grossSalary, state.ssCeiling) * state.ssRate) / 100;
}

function szenarien(anzahl) {
  const mieteBrutto = anzahl * state.rentPerFlat;

  // Beckham: 24 % auf alles, keine Abzuege
  const steuerB = tarif(state.grossSalary + mieteBrutto, SKALEN.beckham);

  // Allgemein: Abzuege beim Gehalt, Abzuege und Abschlag bei der Miete
  const sv = sozialversicherung();
  const arbeit = Math.max(state.grossSalary - sv - state.flatRateExpenses, 0);
  const steuerA = steuerAllgemein(arbeit + anzahl * mieteNachAbschlag());

  // Netto: Brutto minus Steuer minus Sozialversicherung (faellt in beiden Faellen an)
  const brutto = state.grossSalary + mieteBrutto;
  return {
    mieteBrutto,
    sv,
    steuerB,
    steuerA,
    nettoB: brutto - steuerB - sv,
    nettoA: brutto - steuerA - sv,
  };
}

// Iterativ, nicht dividiert: jede Wohnung verschiebt den Grenzsteuersatz.
function breakEven(maxN = 40) {
  for (let n = 0; n <= maxN; n += 1) {
    const s = szenarien(n);
    if (s.steuerA <= s.steuerB) return n;
  }
  return null;
}

function updateAssumptionSummary() {
  if (!elements.assumptionSummary) return;
  elements.assumptionSummary.textContent = [
    `Kosten ${euro(state.costsPerFlat)}`,
    `Zinsen ${euro(state.interestPerFlat)}`,
    `Gebäudeanteil ${zahl(gebaeudeanteil())} %`,
    `Abschreibung ${euro(abschreibung())}`,
    `Abschlag ${zahl(state.rentReduction)} %`,
    `Sozialversicherung ${zahl(state.ssRate)} % bis ${euro(state.ssCeiling)}`,
  ].join(' · ');
}

function renderVerlauf(bis) {
  if (!elements.verlaufBody) return;
  const zeilen = [];
  for (let n = 0; n <= bis; n += 1) {
    const s = szenarien(n);
    const diff = s.nettoA - s.nettoB;
    const klassen = [];
    if (n === state.flatCount) klassen.push('ist-jetzt');
    if (diff >= 0 && (n === 0 || szenarien(n - 1).nettoA - szenarien(n - 1).nettoB < 0)) {
      klassen.push('ist-kipp');
    }
    zeilen.push(
      `<tr class="${klassen.join(' ')}"><td>${n === 1 ? '1 Wohnung' : `${n} Wohnungen`}</td>`
      + `<td>${euro(s.steuerB)}</td><td>${euro(s.steuerA)}</td>`
      + `<td>${diff >= 0 ? '+' : ''}${euro(diff)}</td></tr>`,
    );
  }
  elements.verlaufBody.innerHTML = zeilen.join('');
}

function recalculate() {
  state.grossSalary = clamp(readNumber(elements.grossSalary, defaults.grossSalary), 0);
  state.flatCount = Math.round(clamp(readNumber(elements.flatCount, defaults.flatCount), 0, 40));
  state.rentPerFlat = clamp(readNumber(elements.rentPerFlat, defaults.rentPerFlat), 0);
  state.costsPerFlat = clamp(readNumber(elements.costsPerFlat, defaults.costsPerFlat), 0);
  state.interestPerFlat = clamp(readNumber(elements.interestPerFlat, defaults.interestPerFlat), 0);
  state.purchasePricePerFlat = clamp(
    readNumber(elements.purchasePricePerFlat, defaults.purchasePricePerFlat), 0,
  );
  state.buildingShare = clamp(readNumber(elements.buildingShare, defaults.buildingShare), 0, 100);
  state.cadastralBuilding = clamp(
    readNumber(elements.cadastralBuilding, defaults.cadastralBuilding), 0,
  );
  state.cadastralTotal = clamp(readNumber(elements.cadastralTotal, defaults.cadastralTotal), 0);
  state.acquisitionCostsPerFlat = clamp(
    readNumber(elements.acquisitionCostsPerFlat, defaults.acquisitionCostsPerFlat), 0,
  );
  state.depreciationAmount = clamp(
    readNumber(elements.depreciationAmount, defaults.depreciationAmount), 0,
  );
  state.rentReduction = clamp(readNumber(elements.rentReduction, defaults.rentReduction), 0, 100);
  state.ssRate = clamp(readNumber(elements.ssRate, defaults.ssRate), 0, 100);
  state.ssCeiling = clamp(readNumber(elements.ssCeiling, defaults.ssCeiling), 0);
  state.flatRateExpenses = clamp(
    readNumber(elements.flatRateExpenses, defaults.flatRateExpenses), 0,
  );
  state.personalAllowance = clamp(
    readNumber(elements.personalAllowance, defaults.personalAllowance), 0,
  );
  if (elements.region) state.region = elements.region.value || 'valencia';

  const jetzt = szenarien(state.flatCount);
  const differenz = jetzt.nettoA - jetzt.nettoB;   // positiv = ohne Beckham besser

  setText('headlineValue', `${differenz >= 0 ? '+' : ''}${euro(differenz)}`);
  setText('headlineLabel', differenz >= 0
    ? 'Ohne Beckham bleibt dir mehr'
    : 'So viel kostet dich das Ende von Beckham');
  setText('headlineUnit', `pro Jahr — das sind ${euro(Math.abs(differenz) / 12)} im Monat`);

  setText('grossBeckham', euro(state.grossSalary));
  setText('grossGeneral', euro(state.grossSalary));
  setText('rentBeckham', euro(jetzt.mieteBrutto));
  setText('rentGeneral', euro(jetzt.mieteBrutto));
  setText('taxBeckham', euro(jetzt.steuerB));
  setText('taxGeneral', euro(jetzt.steuerA));
  setText('ssBeckham', euro(jetzt.sv));
  setText('ssGeneral', euro(jetzt.sv));
  setText('netBeckham', euro(jetzt.nettoB));
  setText('netGeneral', euro(jetzt.nettoA));
  setText('diffYear', `${differenz >= 0 ? '+' : ''}${euro(differenz)} / Jahr`);
  setText('diffMonth', `${differenz >= 0 ? '+' : ''}${euro(differenz / 12)} / Monat`);

  const basis = abschreibungsbasis();
  setText('resultDepreciation', `${euro(abschreibung())} je Wohnung und Jahr`);
  if (state.buildingMode === 'amount') {
    setText('depreciationBasis', 'Von dir eingetragen — der Rechner prüft diesen Wert nicht.');
  } else if (state.buildingMode === 'ibi' && basis.ausKataster > basis.ausAnschaffung) {
    setText('depreciationBasis',
      `Grundlage: Katasterwert des Gebäudes (${euro(basis.ausKataster)}) — hier der höhere Wert.`);
  } else {
    const vergleich = state.buildingMode === 'ibi'
      ? ` — höher als der Katasterwert von ${euro(basis.ausKataster)}.`
      : '. Liegt dein Katasterwert darüber, zählt dieser.';
    setText('depreciationBasis',
      `Grundlage: ${euro(basis.anschaffung)} Anschaffungskosten, davon ${zahl(gebaeudeanteil())} % Gebäude = ${euro(basis.ausAnschaffung)}${vergleich}`);
  }

  const be = breakEven();
  if (be === null) {
    setText('breakevenValue', 'über 40 Wohnungen');
    setText('breakevenNote', 'Mit diesen Annahmen gleicht sich der Nachteil im geprüften Bereich nicht aus. Prüfe Gehalt, Miete und Abschreibung.');
  } else if (be === 0) {
    setText('breakevenValue', 'keine einzige');
    setText('breakevenNote', 'Bei diesem Gehalt ist das allgemeine Regime schon ohne Immobilien günstiger als Beckham — weil dort Sozialversicherung, Werbungskosten und mínimo personal abziehbar sind.');
  } else {
    setText('breakevenValue', be === 1 ? '1 Wohnung' : `${be} Wohnungen`);
    const fehlen = be - state.flatCount;
    const bestand = state.flatCount === 1 ? 'eine Wohnung' : `${state.flatCount} Wohnungen`;
    setText('breakevenNote', fehlen > 0
      ? `Du hast ${bestand}. Es fehlen also noch ${fehlen === 1 ? 'eine' : fehlen}.`
      : `Du hast ${bestand} — das reicht dafür bereits aus.`);
  }

  renderVerlauf(Math.max((be === null ? 6 : be) + 2, state.flatCount + 2));
  updateAssumptionSummary();
}

function fillInputs() {
  INPUT_KEYS.forEach((key) => {
    const el = elements[key];
    if (!el) {
      console.warn(`[beckham] Eingabefeld "${key}" nicht gefunden - uebersprungen.`);
      return;
    }
    el.value = state[key];
  });
  if (elements.region) elements.region.value = state.region;
  updateBuildingModeUI();
}

function updateBuildingModeUI() {
  const ausIbi = state.buildingMode === 'ibi';
  const direkt = state.buildingMode === 'amount';
  if (elements.ibiFields) elements.ibiFields.hidden = !ausIbi;
  if (elements.amountField) elements.amountField.hidden = !direkt;
  if (elements.shareFields) elements.shareFields.hidden = direkt;
  if (elements.buildingShare) {
    elements.buildingShare.readOnly = ausIbi;
    elements.buildingShare.classList.toggle('feld-abgeleitet', ausIbi);
    if (ausIbi) elements.buildingShare.value = Math.round(gebaeudeanteil() * 10) / 10;
  }
  if (elements.buildingLabel) {
    elements.buildingLabel.textContent = ausIbi
      ? 'Gebäudeanteil, aus dem Bescheid errechnet (%)'
      : 'Gebäudeanteil an den Anschaffungskosten (%)';
  }
  elements.buildingToggles.forEach((b) => {
    b.classList.toggle('is-active', b.dataset.buildingMode === state.buildingMode);
  });
}

function attachEvents() {
  elements.buildingToggles.forEach((button) => {
    button.addEventListener('click', () => {
      const modus = button.dataset.buildingMode;
      if (!modus || modus === state.buildingMode) return;
      // Beim Zurueckschalten den errechneten Anteil uebernehmen, damit nichts springt.
      if (modus === 'percent') state.buildingShare = gebaeudeanteil();
      state.buildingMode = modus;
      if (elements.buildingShare) {
        elements.buildingShare.value = Math.round(gebaeudeanteil() * 10) / 10;
      }
      updateBuildingModeUI();
      recalculate();
    });
  });
  INPUT_KEYS.map((k) => elements[k]).filter(Boolean).forEach((input) => {
    input.addEventListener('input', recalculate);
  });
  if (elements.region) elements.region.addEventListener('change', recalculate);
  if (elements.resetButton) {
    elements.resetButton.addEventListener('click', () => {
      Object.assign(state, defaults);
      fillInputs();
      recalculate();
    });
  }
}

fillInputs();
attachEvents();
recalculate();
