
export function plural_category(lang, n) {
  try { return new Intl.PluralRules(lang).select(n); } catch (_) { return n === 1 ? 'one' : 'other'; }
}
