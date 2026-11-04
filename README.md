# Spend Tracker website

Static pages, no build step: `index.html` (home), `support.html` (tips) and `privacy.html` (the privacy policy for the Play listing and Google's sign-in screen).

Published at `https://vasanthakumarv.github.io/SpendTracker/`.

## Publishing

Push to GitHub, then Settings → Pages → Deploy from a branch → `main`, `/ (root)`.

## Still hidden

These are in HTML comments until they exist. Fill in the placeholder and remove the comment around it.

| Placeholder | Page | What |
|---|---|---|
| `PLAY_STORE_URL` | index.html | `https://play.google.com/store/apps/details?id=io.github.vasanthakumarv.spendtracker` once listed |
| `DESKTOP_DOWNLOAD_URL` | index.html | e.g. a GitHub Releases page |
| `KOFI_URL` | support.html | your Ko-fi page |
| `UPI_ID` | support.html | your UPI ID, e.g. `name@okbank` |
| `upi-qr.png` | support.html | QR image from your UPI app, saved next to the page |

If UPI or Ko-fi go live, mention them under "Optional tips" in privacy.html, and change its effective date.
