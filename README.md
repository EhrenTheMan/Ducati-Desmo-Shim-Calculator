# Ducati Desmo Shim Calculator

A browser-based calculator for checking and adjusting opening and closing valve clearances on Ducati desmodromic engines.

**Live app:** [desmo.ilovemyhonda.fit](https://desmo.ilovemyhonda.fit)

## Features

- Presets for common Ducati engine families, plus custom manual entry.
- Support for L-twin, V4, and single-cylinder head layouts with two or four valves per cylinder.
- Separate intake and exhaust clearance specifications where required.
- Calculates the ideal replacement shim and snaps it to the available shim sizes.
- Shows the resulting clearance, check-range warnings, and a consolidated shim shopping list.
- Saves work in the browser and exports reports as `.txt`, `.json`, or `.csv`.
- Prints a service worksheet and imports previously exported JSON data.

## Supported presets

The calculator includes presets for:

- Testastretta and Testastretta 11° / DVT
- Superquadro
- Desmosedici Stradale V4
- Desmoquattro
- Desmodue 2-valve
- Desmo singles
- Other/custom configurations

Presets marked **verify** are starting points only. Always compare clearance specifications with the workshop manual for the exact motorcycle.

## Using the calculator

1. Select the engine family and head layout.
2. Choose a clearance preset, or enter the values from the workshop manual.
3. Check the available opening and closing shim ranges and increments.
4. Add service details if desired.
5. For each cylinder and valve, enter the measured clearance and current shim thickness in millimetres.
6. Review the calculated new shims and the **Shims to buy** summary.
7. Download or print a report for your records.

The default keep rule retains a shim only when the measured clearance is inside the target range. It can be changed to use the wider check/service-limit range instead.

## Calculation

For both opening and closing shims:

```text
new shim = current shim + (measured clearance - target clearance)
resulting clearance = measured clearance - (new shim - current shim)
```

Thicker shims produce smaller clearances. When a shim grid is configured, the calculator chooses the available size that produces a result closest to the target.

## Privacy and storage

The app is a static client-side application. Measurements and service information stay in the browser; no server or account is required. Browser cookies and local storage are used for persistence. Download the JSON export for a portable backup, especially when using the app from a `file://` URL or clearing browser data.

## Development

There is no build step or dependency installation. The project consists of:

- `index.html` — application markup
- `app.js` — calculator logic, presets, persistence, and exports
- `styles.css` — responsive styling

To develop locally, serve the repository with any static web server and open `index.html` in a browser. For example:

```sh
python3 -m http.server
```

Then visit <http://localhost:8000>.

## Safety

This tool is an aid for service calculations, not a substitute for the motorcycle's workshop manual or qualified mechanical inspection. Verify all specifications, measurements, shim dimensions, and final clearances before operating the engine.

## Contributing

Bug reports and improvements are welcome. When changing a preset, include the source workshop-manual reference and explain which engine models the values apply to.
