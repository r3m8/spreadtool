'use strict';

const CORS_PROXY = 'https://spreadtool.r3m8.workers.dev/?url=';

// Detect current language from URL (works with subdirectories like /spreadtool/en/)
const pathParts = window.location.pathname.split('/').filter(Boolean);
const isEnglish = pathParts.includes('en');
const currentLang = isEnglish ? 'en' : 'fr';

// On first visit to root (French site), redirect based on browser preference
if (!isEnglish && !localStorage.getItem('langChosen')) {
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang && browserLang.startsWith('en')) {
    localStorage.setItem('langChosen', 'en');
    const currentPath = window.location.pathname;
    const basePath = currentPath.replace(/\/[^\/]*$/, '');
    const fileName = currentPath.split('/').pop() || 'index.html';
    window.location.replace(`${basePath}/en/${fileName}`);
  }
}

const i18n = {
  currentLang: currentLang,
  translations: {},
  availableLangs: ['en', 'fr'],

  async init() {
    await this.load(currentLang);
    this.updateDOM();
  },

  async load(lang) {
    if (!this.availableLangs.includes(lang)) lang = 'fr';

    try {
      // Use relative path based on current location
      const basePath = isEnglish ? '../' : './';
      const response = await fetch(`${basePath}i18n/${lang}.json`);
      this.translations = await response.json();
    } catch (e) {
      console.error('Failed to load translations:', e);
      this.translations = {};
    }

    this.currentLang = lang;
    document.documentElement.lang = lang;
  },

  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) return key;
    }
    if (typeof value === 'string') {
      return value.replace(/\{(\w+)\}/g, (_, param) => params[param] ?? `{${param}}`);
    }
    return key;
  },

  updateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      el.innerHTML = this.t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });
    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = this.currentLang;
  }
};

// Language switcher - navigate to the other language version
function switchLanguage() {
  const currentPath = window.location.pathname;
  localStorage.setItem('langChosen', isEnglish ? 'fr' : 'en');
  
  // Get the current filename (handle both /path/to/file.html and /path/to/)
  const pathParts = currentPath.split('/').filter(Boolean);
  let fileName = pathParts.pop() || 'index.html';
  
  // If the last part doesn't end with .html, it's a directory
  if (!fileName.endsWith('.html')) {
    pathParts.push(fileName);  // Put it back as part of the path
    fileName = 'index.html';
  }
  
  // Use clean URLs: no "index.html" for home page
  const filePath = fileName === 'index.html' ? '' : fileName;
  
  if (isEnglish) {
    // We're in /en/ subdirectory, go up one level for French
    window.location.href = `../${filePath}`;
  } else {
    // We're in root, go to /en/ subdirectory
    window.location.href = `./en/${filePath}`;
  }
}

async function apiFetch(url) {
  const r = await fetch(CORS_PROXY + encodeURIComponent(url));
  if (!r.ok) {
    if (r.status === 422) {
      throw new Error(i18n.t('errors.yahoo30DayLimit'));
    }
    throw new Error(`API responded with HTTP ${r.status}.`);
  }
  return r.json();
}

async function resolveTicker(isin) {
  const url =
    `https://query2.finance.yahoo.com/v1/finance/search` +
    `?q=${encodeURIComponent(isin)}&quotesCount=5&newsCount=0`;
  const data   = await apiFetch(url);
  const quotes = data?.quotes;
  if (!quotes?.length)
    throw new Error(i18n.t('errors.tickerNotFound', { isin }));
  return { symbol: quotes[0].symbol, name: quotes[0].longname ?? quotes[0].shortname ?? '' };
}

function buildDateWithOffset(dateStr, hourVal, minVal, offsetMinutes) {
  const hh   = String(hourVal).padStart(2, '0');
  const mm   = String(minVal).padStart(2, '0');
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs  = Math.abs(offsetMinutes);
  const ohh  = String(Math.floor(abs / 60)).padStart(2, '0');
  const omm  = String(abs % 60).padStart(2, '0');
  const d    = new Date(`${dateStr}T${hh}:${mm}:00${sign}${ohh}:${omm}`);
  if (isNaN(d.getTime())) throw new Error('Invalid date, time or timezone.');
  return d;
}

async function getPriceAt(ticker, dateStr, hourVal, minVal, offsetMinutes) {
  const txDate  = buildDateWithOffset(dateStr, hourVal, minVal, offsetMinutes);
  const txUnix  = Math.floor(txDate.getTime() / 1000);
  const period1 = txUnix - 120;
  const period2 = txUnix + 180;

  const url =
    `https://query2.finance.yahoo.com/v8/finance/chart/` +
    `${encodeURIComponent(ticker)}` +
    `?period1=${period1}&period2=${period2}&interval=1m`;

  const data   = await apiFetch(url);
  const result = data?.chart?.result?.[0];

  if (!result)
    throw new Error(i18n.t('errors.noChartData'));

  const timestamps = result.timestamp                      ?? [];
  const closes     = result.indicators?.quote?.[0]?.close ?? [];
  const highs      = result.indicators?.quote?.[0]?.high  ?? [];
  const lows       = result.indicators?.quote?.[0]?.low   ?? [];
  const currency   = result.meta?.currency                ?? '';

  if (!timestamps.length)
    throw new Error(i18n.t('errors.noBars'));

  let bestIdx = -1, bestDiff = Infinity;
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] == null) continue;
    const diff = Math.abs(timestamps[i] - txUnix);
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  }

  if (bestIdx === -1)
    throw new Error(i18n.t('errors.nullCloses'));

  if (bestDiff > 300)
    throw new Error(i18n.t('errors.farBar', { minutes: Math.round(bestDiff / 60) }));

  const typicalPrice = (highs[bestIdx] + lows[bestIdx] + closes[bestIdx]) / 3;

  return {
    price:       typicalPrice,
    barTimeUTC:  new Date(timestamps[bestIdx] * 1000),
    diffSeconds: bestDiff,
    currency,
  };
}

function fmtPrice(n, currency) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 4, maximumFractionDigits: 4,
  }) + (currency ? ` ${currency}` : '');
}

function fmtPct(n) {
  return (n >= 0 ? '+' : '') +
    n.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + '%';
}

function fmtBp(n) {
  return (n >= 0 ? '+' : '') +
    (n * 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' bp';
}

function fmtTimeDelta(s) {
  if (s <= 60)  return i18n.t('status.exactMinute');
  if (s < 3600) return i18n.t('status.minutesAway', { minutes: Math.round(s / 60) });
  return i18n.t('status.hoursAway', { hours: Math.round(s / 3600) });
}

function fmtBarTime(utcDate, offsetMinutes) {
  const sign    = offsetMinutes >= 0 ? '+' : '−';
  const abs     = Math.abs(offsetMinutes);
  const ohh     = String(Math.floor(abs / 60)).padStart(2, '0');
  const omm     = String(abs % 60).padStart(2, '0');
  const label   = `UTC${sign}${ohh}:${omm}`;
  const shifted = new Date(utcDate.getTime() + offsetMinutes * 60_000);
  const time    = shifted.toISOString().slice(11, 16);
  return `${time} ${label}`;
}

function setStatus(msg, isError = false) {
  const el = document.getElementById('status');
  if (isError) {
    const prefix = i18n.t('status.error') || 'Error:';
    el.textContent = `${prefix} ${msg}`;
  } else {
    el.textContent = msg;
  }
  el.className   = isError ? 'error' : '';
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function setSpread(spread, spreadPct, currency) {
  const spreadEl  = document.getElementById('res-spread');
  const pctEl     = document.getElementById('res-spread-pct');
  const block     = document.getElementById('spread-block');
  const verdict   = document.getElementById('res-spread-verdict');
  const card      = document.getElementById('results-card');

  const isGood = spread <= 0;
  const cls    = isGood ? 'positive' : 'negative';

  spreadEl.textContent =
    (spread >= 0 ? '+' : '') +
    spread.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }) +
    (currency ? ` ${currency}` : '');
  spreadEl.className = `spread-value ${cls}`;

  pctEl.textContent = `${fmtPct(spreadPct)} (${fmtBp(spreadPct)})`;
  pctEl.className   = cls;

  block.className = `spread-block ${isGood ? 'is-good' : 'is-bad'}`;

  verdict.textContent = isGood
    ? i18n.t('results.spread.positive')
    : i18n.t('results.spread.negative');
  verdict.className = `spread-verdict ${cls}`;
  verdict.classList.remove('hidden');

  card.classList.remove('outcome-good', 'outcome-bad');
  card.classList.add(isGood ? 'outcome-good' : 'outcome-bad');
}

const HISTORY_KEY = 'spread-calculator-history';
const MAX_HISTORY = 100;

function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  if (faqItems.length === 0) return;
  faqItems.forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('open');
    });
  });
}

const historyManager = {
  entries: [],

  load() {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      this.entries = stored ? JSON.parse(stored) : [];
    } catch (e) {
      this.entries = [];
    }
    this.render();
  },

  save() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.entries));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
    this.render();
  },

  add(entry) {
    this.entries.unshift(entry);
    if (this.entries.length > MAX_HISTORY) {
      this.entries = this.entries.slice(0, MAX_HISTORY);
    }
    this.save();
  },

  remove(index) {
    this.entries.splice(index, 1);
    this.save();
  },

  clear() {
    this.entries = [];
    this.save();
  },

  calculateAverage() {
    if (this.entries.length === 0) return null;
    const sum = this.entries.reduce((acc, entry) => acc + entry.spreadPct, 0);
    return sum / this.entries.length;
  },

  render() {
    const listEl = document.getElementById('history-list');
    const emptyEl = document.getElementById('history-empty');
    const avgEl = document.getElementById('avg-spread');

    if (!listEl || !emptyEl || !avgEl) return;

    if (this.entries.length === 0) {
      listEl.classList.add('hidden');
      emptyEl.classList.remove('hidden');
      avgEl.textContent = '—';
      return;
    }

    emptyEl.classList.add('hidden');
    listEl.classList.remove('hidden');

    const avg = this.calculateAverage();
    avgEl.textContent = avg !== null 
      ? `${i18n.t('history.average')}: ${avg >= 0 ? '+' : ''}${avg.toFixed(3)}%`
      : '—';
    avgEl.className = `avg-spread ${avg !== null && avg <= 0 ? 'positive' : 'negative'}`;

    listEl.innerHTML = this.entries.map((entry, index) => {
      const date = new Date(entry.timestamp);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const spreadClass = entry.spread <= 0 ? 'positive' : 'negative';
      
      return `
        <div class="history-item">
          <div class="history-item-info">
            <span class="history-item-date">${dateStr} ${timeStr}</span>
            <span class="history-item-ticker">${entry.ticker}</span>
            <span class="history-item-spread ${spreadClass}">${entry.spread >= 0 ? '+' : ''}${entry.spread.toFixed(4)} ${entry.currency}</span>
            <span class="history-item-pct ${spreadClass}">${entry.spreadPct >= 0 ? '+' : ''}${entry.spreadPct.toFixed(3)}% (${(entry.spreadPct * 100).toFixed(0)} bp)</span>
          </div>
          <button class="history-item-delete" data-index="${index}" title="Remove">×</button>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.history-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.remove(index);
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  await i18n.init();

  // Set up language switcher
  const langSelect = document.getElementById('lang-select');
  langSelect?.addEventListener('change', () => {
    switchLanguage();
  });

  historyManager.load();
  initFAQ();

  document.getElementById('clear-history')?.addEventListener('click', () => {
    if (historyManager.entries.length > 0 && confirm(i18n.t('history.confirmClear'))) {
      historyManager.clear();
    }
  });

  const btn = document.getElementById('calc-btn');
  if (!btn) return; // We're on a page without the calculator (e.g., FAQ)

  const browserOffsetMin = -(new Date().getTimezoneOffset());
  const tzSelect = document.getElementById('tz-offset');
  let closest = null, minDiff = Infinity;
  for (const opt of tzSelect.options) {
    const diff = Math.abs(Number(opt.value) - browserOffsetMin);
    if (diff < minDiff) { minDiff = diff; closest = opt; }
  }
  if (closest) closest.selected = true;

  const resultsCard = document.getElementById('results-card');
  const placeholder = document.getElementById('results-placeholder');
  const loadingCard = document.getElementById('results-loading');

  btn.addEventListener('click', async () => {
    const isin          = document.getElementById('isin').value.trim().toUpperCase();
    const units         = parseFloat(document.getElementById('units').value);
    const totalPaid     = parseFloat(document.getElementById('total-paid').value);
    const fees          = parseFloat(document.getElementById('fees').value) || 0;
    const dateStr       = document.getElementById('tx-date').value;
    const timeVal       = document.getElementById('tx-time').value;
    const [hourVal, minVal] = timeVal ? timeVal.split(':').map(Number) : [NaN, NaN];
    const offsetMinutes = parseInt(document.getElementById('tz-offset').value, 10);

    if (!isin)                          return setStatus(i18n.t('errors.isinRequired'), true);
    if (!units || units <= 0)           return setStatus(i18n.t('errors.unitsInvalid'), true);
    if (!totalPaid || totalPaid <= 0)   return setStatus(i18n.t('errors.totalPaidInvalid'), true);
    if (fees < 0)                       return setStatus(i18n.t('errors.feesNegative'), true);
    if (!dateStr)                       return setStatus(i18n.t('errors.dateRequired'), true);
    if (!timeVal || isNaN(hourVal) || isNaN(minVal))
                                        return setStatus(i18n.t('errors.timeInvalid'), true);

    btn.disabled = true;
    resultsCard.classList.add('hidden');
    
    placeholder.classList.add('hidden');
    loadingCard.classList.remove('hidden');
    loadingCard.classList.add('visible');
    
    const loadingText = loadingCard.querySelector('p');
    loadingText.textContent = i18n.t('status.resolving');

    try {
      const { symbol: ticker, name } = await resolveTicker(isin);
      loadingText.textContent = i18n.t('status.fetching', { ticker, name: name ? ' — ' + name : '' });

      const { price: yahooPrice, barTimeUTC, diffSeconds, currency } =
        await getPriceAt(ticker, dateStr, hourVal, minVal, offsetMinutes);

      setStatus('');

      const unitPriceExclFees = (totalPaid - fees) / units;
      const unitPriceInclFees =  totalPaid         / units;
      const spread            = unitPriceInclFees - yahooPrice;
      const spreadPct         = (spread / yahooPrice) * 100;

      setText('res-ticker', name || ticker);
      setText('res-yahoo-price', fmtPrice(yahooPrice, currency));
      setText('res-unit-price',      fmtPrice(unitPriceExclFees, currency));
      setText('res-unit-price-fees', fmtPrice(unitPriceInclFees, currency));
      setSpread(spread, spreadPct, currency);

      historyManager.add({
        timestamp: Date.now(),
        isin,
        ticker: name || ticker,
        units,
        totalPaid,
        fees,
        yahooPrice,
        unitPriceInclFees,
        spread,
        spreadPct,
        currency
      });

      loadingCard.classList.remove('visible');
      setTimeout(() => {
        loadingCard.classList.add('hidden');
        resultsCard.classList.remove('hidden');
      }, 350);

    } catch (err) {
      setStatus(err.message ?? i18n.t('errors.unexpected'), true);
      loadingCard.classList.remove('visible');
      setTimeout(() => {
        loadingCard.classList.add('hidden');
        placeholder.classList.remove('hidden');
      }, 350);
    } finally {
      btn.disabled = false;
    }
  });
});
