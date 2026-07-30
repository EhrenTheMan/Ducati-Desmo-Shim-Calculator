# Ducati Desmo Shim Calculator

A lightweight, browser-only calculator for Ducati desmodromic valve service.  
It helps you decide opening and closing shim changes from measured clearances and your target specs.

## Features

- Opening and closing shim calculations with shim-size grid snapping
- Engine/layout presets (Testastretta, Superquadro, Desmoquattro, Desmodue, V4, and custom)
- Editable target/check specs, including separate exhaust specs
- Keep/no-adjust policy (target range or check range)
- Service record fields (bike, date, odometer, notes)
- Export options: `.txt` report, `.csv` table, `.json` data
- Import saved `.json` files
- Local snapshot saves in browser storage
- No backend, no build step, no network dependency

## Quick start

1. Clone or download this repository.
2. Open `index.html` in a browser.

Optional local server:

```bash
cd Ducati-Desmo-Shim-Calculator
python -m http.server 8000
```

Then open `http://localhost:8000`.

## How it works

For both opening and closing sides:

- `new shim = current shim + (measured clearance - target clearance)`
- `resulting clearance = measured clearance - (new shim - current shim)`

A thicker shim reduces clearance.  
The app picks the closest available shim size to land in (or nearest to) the target window.

## Data & persistence

- State is saved in browser cookies and `localStorage`
- Snapshots are saved in `localStorage`
- You can export `.json` files as backups
- Data does not leave your browser

## Important note

Spec presets are convenience defaults. Always verify final values against your exact workshop manual and service requirements.
