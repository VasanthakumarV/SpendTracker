
// Dates are stored as Gregorian calendar days, so they are always shown in the
// Gregorian calendar (ar-SA would otherwise default to Hijri month names for
// Gregorian month buckets); digits and names still follow the locale.
const loc = (l) => (l && l.length ? l : undefined);
export function fmt_money(amount, currency, locale, compact) {
  try {
    const o = { style: 'currency', currency };
    if (compact) { o.notation = 'compact'; o.maximumFractionDigits = 1; }
    return new Intl.NumberFormat(loc(locale), o).format(amount);
  } catch (_) { return currency + ' ' + amount.toFixed(2); }
}
export function fmt_percent(x, locale) {
  try { return new Intl.NumberFormat(loc(locale), { style: 'percent', maximumFractionDigits: 0 }).format(x); }
  catch (_) { return Math.round(x * 100) + '%'; }
}
function parseIso(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
export function fmt_day(iso, locale) {
  try { return new Intl.DateTimeFormat(loc(locale), { calendar: 'gregory',  weekday: 'short', day: 'numeric', month: 'short' }).format(parseIso(iso)); }
  catch (_) { return iso; }
}
// The day of the week, in full ("Monday").
export function fmt_weekday(iso, locale) {
  try { return new Intl.DateTimeFormat(loc(locale), { calendar: 'gregory', weekday: 'long' }).format(parseIso(iso)); }
  catch (_) { return iso; }
}
// Day, month and year, no weekday ("1 Sep 2025").
export function fmt_date(iso, locale) {
  try { return new Intl.DateTimeFormat(loc(locale), { calendar: 'gregory', day: 'numeric', month: 'short', year: 'numeric' }).format(parseIso(iso)); }
  catch (_) { return iso; }
}
// Day, month as a word, year ("04 Nov 2026"), whatever the locale's own order,
// for date fields.
export function fmt_date_field(iso, locale) {
  try {
    const parts = new Intl.DateTimeFormat(loc(locale), { calendar: 'gregory', day: '2-digit', month: 'short', year: 'numeric' }).formatToParts(parseIso(iso));
    const part = (t) => parts.find((p) => p.type === t).value;
    // Japanese and Chinese months are numbers: only their own order reads.
    if (/^\p{Nd}+$/u.test(part('month'))) return parts.map((p) => p.value).join('');
    return [part('day'), part('month').replace(/\.$/, ''), part('year')].join(' ');
  } catch (_) { return iso; }
}
// Like fmt_day, plus the year ("Sun, 1 Nov 2026"), for lists that can span years.
export function fmt_day_year(iso, locale) {
  try { return new Intl.DateTimeFormat(loc(locale), { calendar: 'gregory', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(parseIso(iso)); }
  catch (_) { return iso; }
}
export function fmt_long_date(iso, locale) {
  try { return new Intl.DateTimeFormat(loc(locale), { calendar: 'gregory',  dateStyle: 'full' }).format(parseIso(iso)); }
  catch (_) { return iso; }
}
export function fmt_month(year, month, locale) {
  try { return new Intl.DateTimeFormat(loc(locale), { calendar: 'gregory',  month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1)); }
  catch (_) { return year + '-' + String(month).padStart(2, '0'); }
}
export function fmt_year(year, locale) {
  try { return new Intl.DateTimeFormat(loc(locale), { calendar: 'gregory', year: 'numeric' }).format(new Date(year, 6, 1)); }
  catch (_) { return String(year); }
}
export function fmt_month_short(year, month, locale) {
  try { return new Intl.DateTimeFormat(loc(locale), { calendar: 'gregory',  month: 'short' }).format(new Date(year, month - 1, 1)); }
  catch (_) { return String(month); }
}
// Money with 3 significant digits, compact: "€1.25K", "₹8.72K", "$950".
export function fmt_money_short(x, currency, locale) {
  try {
    return new Intl.NumberFormat(loc(locale), { style: 'currency', currency, currencyDisplay: 'narrowSymbol', notation: 'compact', maximumSignificantDigits: 3 }).format(x);
  } catch (_) { return String(Math.round(x)); }
}
export function fmt_number_compact(x, locale) {
  try { return new Intl.NumberFormat(loc(locale), { notation: 'compact', maximumFractionDigits: 1 }).format(x); }
  catch (_) { return String(Math.round(x)); }
}
export function fmt_relative(ms, locale) {
  const s = Math.round((ms - Date.now()) / 1000);
  const abs = Math.abs(s);
  try {
    const rtf = new Intl.RelativeTimeFormat(loc(locale), { numeric: 'auto' });
    if (abs < 45) return rtf.format(0, 'second');
    if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
    return rtf.format(Math.round(s / 86400), 'day');
  } catch (_) { return new Date(ms).toLocaleString(); }
}
export function fmt_datetime(ms, locale) {
  try { return new Intl.DateTimeFormat(loc(locale), { calendar: 'gregory',  dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms)); }
  catch (_) { return new Date(ms).toISOString(); }
}
export function system_locale() {
  return (navigator.languages && navigator.languages[0]) || navigator.language || 'en-US';
}
export function system_tz() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (_) { return 'UTC'; }
}
export function today_iso() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
export function region_of(locale) {
  try { return new Intl.Locale(locale).maximize().region || ''; } catch (_) { return ''; }
}
export function is_rtl(locale) {
  try {
    const l = new Intl.Locale(locale);
    const info = l.textInfo || (l.getTextInfo && l.getTextInfo());
    if (info && info.direction) return info.direction === 'rtl';
    return ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb'].includes(l.language);
  } catch (_) { return false; }
}
// Intl constructors are slow (~0.1–1 ms each); lists call these per item, so
// results are cached.
const NAME_CACHE = new Map();
function cached(key, f) {
  let v = NAME_CACHE.get(key);
  if (v === undefined) { v = f(); NAME_CACHE.set(key, v); }
  return v;
}
const DISPLAY_NAMES = new Map();
export function currency_name(code, locale) {
  return cached('c|' + locale + '|' + code, () => {
    try {
      let dn = DISPLAY_NAMES.get(locale);
      if (!dn) { dn = new Intl.DisplayNames(loc(locale), { type: 'currency' }); DISPLAY_NAMES.set(locale, dn); }
      return dn.of(code) || code;
    } catch (_) { return code; }
  });
}
// Search terms for a currency: its symbols and English name (so "dollar"
// or "$" finds USD whatever the display language).
export function currency_terms(code) {
  return cached('t|' + code, () => currency_terms_uncached(code));
}
function currency_terms_uncached(code) {
  const out = [];
  for (const d of ['symbol', 'narrowSymbol']) {
    try {
      const p = new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: d }).formatToParts(0);
      const c = p.find((x) => x.type === 'currency');
      if (c) out.push(c.value);
    } catch (_) {}
  }
  try { out.push(new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) || ''); } catch (_) {}
  return out.join(' ');
}
// An amount for an editable field, grouped the locale's way ("1,234",
// "1.234,5", "12,34,567"), with Latin digits so it stays easy to edit.
// Fractions only when there are any, except for 3-decimal currencies, where
// "1,234" would read as 1.234.
export function fmt_amount_input(n, digits, locale) {
  const whole = Number.isInteger(n) && digits !== 3;
  try {
    return new Intl.NumberFormat(loc(locale), { numberingSystem: "latn", useGrouping: true, minimumFractionDigits: whole ? 0 : digits, maximumFractionDigits: digits }).format(n);
  } catch (_) { return String(n); }
}
export function fmt_int(n, locale) {
  try { return new Intl.NumberFormat(loc(locale), { maximumFractionDigits: 0 }).format(n); } catch (_) { return String(n); }
}
// First day of the week for a locale: 1 = Monday … 7 = Sunday (Monday when
// the platform can't tell).
export function first_weekday(locale) {
  try {
    const l = new Intl.Locale(loc(locale) || navigator.language || 'en');
    const w = (l.getWeekInfo && l.getWeekInfo()) || l.weekInfo;
    return (w && w.firstDay) || 1;
  } catch (_) { return 1; }
}
// "8 Nov" / "Nov 8" (no weekday), for compact ranges.
export function fmt_day_short(iso, locale) {
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat(loc(locale), { day: 'numeric', month: 'short', calendar: 'gregory', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, d));
  } catch (_) { return iso; }
}
// Compact locale-aware range: "1–7 Nov", "29 Nov – 5 Dec".
export function fmt_day_range(a, b, locale, with_year) {
  try {
    const d = (iso) => { const [y, m, dd] = iso.split('-').map(Number); return Date.UTC(y, m - 1, dd); };
    const opts = { day: 'numeric', month: 'short', calendar: 'gregory', timeZone: 'UTC' };
    if (with_year) opts.year = 'numeric';
    const f = new Intl.DateTimeFormat(loc(locale), opts);
    return f.formatRange ? f.formatRange(d(a), d(b)) : f.format(d(a)) + ' – ' + f.format(d(b));
  } catch (_) { return a + ' – ' + b; }
}
// Current time, hours and minutes ("18:04", "6:04 PM").
export function fmt_time_now(locale) {
  try { return new Intl.DateTimeFormat(loc(locale), { timeStyle: 'short' }).format(new Date()); }
  catch (_) { return new Date().toTimeString().slice(0, 5); }
}
export function document_lang() {
  return document.documentElement.lang || navigator.language || 'en';
}
export function language_name(tag) {
  return cached('l|' + tag, () => {
    try { return new Intl.DisplayNames([tag], { type: 'language' }).of(tag) || tag; } catch (_) { return tag; }
  });
}
export function apply_document_locale(locale, rtl) {
  document.documentElement.lang = locale;
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';
}
