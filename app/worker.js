// Starts the engine (spend-web) in this worker. Messages the page sends
// while the wasm loads would otherwise be dropped (nothing listens yet), so
// they wait here and go to the engine's handler once it's set.
const early = [];
self.onmessage = (e) => early.push(e);
importScripts("./spend-web.js?v=26deb6edf688");
wasm_bindgen("./spend-web_bg.wasm?v=26deb6edf688").then(
  () => {
    for (const e of early.splice(0)) self.onmessage(e);
  },
  (err) => {
    console.error("Spend Tracker's engine couldn't start", err);
    self.postMessage({ event: "backend-state", payload: { state: "failed", reason: "crash", error: String(err) } });
  },
);
