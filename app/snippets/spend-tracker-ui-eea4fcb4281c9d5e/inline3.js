
const LETTERS = "asdfghjklqwertyuiopzxcvbnm";
const CLICKABLE = 'a[href], button, input:not([type=hidden]), select, textarea, summary, label:has(> input.sr-only), [role=button], [role=tab], [role=option], [role=switch], [role=checkbox], [role=menuitem], [tabindex]:not([tabindex="-1"])';

let state = null; // { root, items: [{el, code, badge}], typed }

function visible(el) {
  if (el.closest("[inert], [aria-hidden=true]")) return null;
  if (el.disabled || el.getAttribute("aria-disabled") === "true") return null;
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return null;
  if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return null;
  const s = getComputedStyle(el);
  if (s.visibility === "hidden" || s.pointerEvents === "none" || Number(s.opacity) === 0) return null;
  // Not covered: what's at its centre (clamped to the screen) is it or inside it.
  const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
  const y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
  const top = document.elementFromPoint(x, y);
  if (!top || !(el === top || el.contains(top) || top.contains(el) || (el.tagName === "INPUT" && el.labels && [...el.labels].some((l) => l.contains(top))))) return null;
  return r;
}

function targets() {
  const dialogs = [...document.querySelectorAll('[role=dialog][aria-modal=true], [role=dialog], [role=listbox]')].filter((d) => d.getBoundingClientRect().height > 0);
  const scope = dialogs.length ? dialogs[dialogs.length - 1] : document;
  const seen = new Set();
  const out = [];
  for (const el of scope.querySelectorAll(CLICKABLE)) {
    // A label wrapping a hidden file input stands for it.
    const target = el;
    if (seen.has(target)) continue;
    // Skip controls nested in another clickable already listed (e.g. an icon inside a button).
    if (target.parentElement && target.parentElement.closest(CLICKABLE) && seen.has(target.parentElement.closest(CLICKABLE))) continue;
    if (target.matches("input.sr-only")) continue;
    const r = visible(target);
    if (!r) continue;
    seen.add(target);
    out.push({ el: target, r });
  }
  return out;
}

// Prefix-free codes, as short as possible: single letters for as many
// targets as can have one, two letters (starting with the letters left
// over) for the rest.
function codes(n) {
  const all = [""];
  let used = 0;
  while (all.length - used < n || all.length === 1) {
    const prefix = all[used++];
    for (const ch of LETTERS) all.push(prefix + ch);
  }
  return all.slice(used, used + n);
}

function close() {
  if (!state) return;
  state.root.remove();
  removeEventListener("keydown", onKey, true);
  removeEventListener("mousedown", close, true);
  removeEventListener("scroll", close, true);
  removeEventListener("resize", close, true);
  removeEventListener("blur", close);
  state = null;
}

function open() {
  const found = targets();
  if (!found.length) return;
  // Navigation first (home row), then main actions and the header, then
  // everything else in reading order.
  const rank = (x) => (x.el.closest("nav") ? 3 : x.el.matches(".btn-primary") ? 2 : x.el.closest("header") ? 1 : 0);
  found.sort((a, b) => (rank(b) - rank(a)) || (Math.round(a.r.top / 8) - Math.round(b.r.top / 8)) || (a.r.left - b.r.left));
  const list = codes(found.length);
  const root = document.createElement("div");
  root.className = "kbd-hints";
  root.setAttribute("aria-hidden", "true");
  const items = found.map(({ el, r }, i) => {
    const badge = document.createElement("span");
    badge.className = "kbd-hint";
    badge.textContent = list[i].toUpperCase();
    // Top-left corner of the target, kept on screen.
    badge.style.left = Math.max(2, Math.min(r.left - 4, innerWidth - 30)) + "px";
    badge.style.top = Math.max(2, Math.min(r.top - 6, innerHeight - 20)) + "px";
    root.append(badge);
    return { el, code: list[i], badge };
  });
  document.body.append(root);
  state = { root, items, typed: "" };
  addEventListener("keydown", onKey, true);
  addEventListener("mousedown", close, true);
  addEventListener("scroll", close, true);
  addEventListener("resize", close, true);
  addEventListener("blur", close);
}

function activate(el) {
  close();
  const field = el.matches("input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=file]), textarea, select");
  if (field) {
    el.focus();
    if (el.tagName === "SELECT" && el.showPicker) try { el.showPicker(); } catch (_) {}
    return;
  }
  el.focus({ preventScroll: true });
  el.click();
}

function onKey(e) {
  if (!state) return;
  if (e.key === "Alt") return; // handled on key up
  e.preventDefault();
  e.stopPropagation();
  if (e.key === "Escape") return close();
  if (e.key === "Backspace") {
    if (!state.typed) return close();
    state.typed = state.typed.slice(0, -1);
  } else {
    const letter = e.metaKey || e.ctrlKey ? undefined : letterOf(e.key, e.code);
    if (!letter) return close();
    state.typed += letter;
  }
  const typed = state.typed;
  const exact = state.items.find((i) => i.code === typed);
  if (exact) return activate(exact.el);
  const left = state.items.filter((i) => i.code.startsWith(typed));
  if (!left.length) {
    state.typed = typed.slice(0, -1);
    return;
  }
  for (const i of state.items) {
    const on = i.code.startsWith(typed);
    i.badge.classList.toggle("kbd-hint-off", !on);
    i.badge.innerHTML = on ? `<b>${typed.toUpperCase()}</b>${i.code.slice(typed.length).toUpperCase()}` : i.code.toUpperCase();
  }
}

// Alt pressed and released on its own toggles the hints (unless turned off
// in Settings).
let armed = false;
let enabled = true;
let letterOf = () => undefined;
export function set_enabled(on) {
  enabled = on;
  if (!on) close();
}
export function install(letter) {
  letterOf = letter;
  addEventListener("keydown", (e) => {
    if (e.key === "Alt") armed = !e.repeat && !e.ctrlKey && !e.metaKey && !e.shiftKey;
    else armed = false;
  }, true);
  addEventListener("mousedown", () => { armed = false; }, true);
  addEventListener("keyup", (e) => {
    if (e.key !== "Alt" || !armed || !enabled) return;
    armed = false;
    e.preventDefault();
    if (state) close(); else open();
  }, true);
}
