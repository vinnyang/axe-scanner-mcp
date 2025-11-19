# Axe Scanner MCP Server

A standalone Model Context Protocol server that runs axe accessibility scans for a supplied URL using Playwright.


## Screenshot
![Screenshot 2025-11-18 at 16 07 24](https://github.com/user-attachments/assets/9f3a8677-1c46-4f35-b608-dcd604114ec1)

## Prerequisites

- Node.js 18 or newer
- Playwright browsers (`npx playwright install`), plus system dependencies if required (`npx playwright install --with-deps` on macOS/Linux)

## Installation

```bash
npm install
npm run build
```

## Usage

Run the server over stdio:

```bash
npm start
```

Or run directly from source with live compilation:

```bash
npm run dev
```

Run a one-off scan from the CLI:

```bash
npm run scan -- https://example.com
```

### Registered tool

`axe_scan_url`
Runs an axe accessibility scan and returns both a summary and the full axe results JSON.

Input arguments:

- `url` (string, required): Page to scan.
- `tags` (string[], optional, defaults to `["wcag2a"]`): Restrict analysis to specific tags. Leave empty to disable tag filtering.
- `runOnlyRules` (string[], optional): Restrict analysis to specific rule IDs. Cannot be combined with `tags`.
- `disableRules` (string[], optional): Skip specific rule IDs.
- `includeSelectors` (string[], optional): CSS selectors to scope the scan.
- `excludeSelectors` (string[], optional): CSS selectors to omit from the scan.
- `waitUntil` (`"load" | "domcontentloaded" | "networkidle" | "commit"`, optional): Navigation lifecycle to await. Defaults to `load`.
- `navigationTimeoutMs` (number, optional): Playwright navigation timeout in milliseconds.
- `legacyMode` (boolean, optional): Whether to run axe in legacy mode to avoid blank-page aggregation (disables cross-origin frame testing).
- `viewport` (object, optional): Override viewport `width`, `height`, `deviceScaleFactor`, and/or `userAgent`. Defaults to 1280×720 / DPR 1 / Playwright default UA.
- `browser` (`"chromium" | "firefox" | "webkit"`, optional): Browser engine to launch. Defaults to `chromium`.
- `headless` (boolean, optional): Run the browser in headless mode. Defaults to `true`.
- `postNavigationWaitMs` (number, optional): Milliseconds to wait after navigation (and optional selector wait) before running axe. Defaults to `1000`.
- `waitForSelector` (string, optional): CSS selector to wait for before the post-navigation delay.
- `axeOptions` (object, optional): Raw options passed to `axe.configure` via `builder.options(...)`.
- `includeSummary` (boolean, optional): When `true`, adds a short human-readable summary string alongside the full JSON payload. Defaults to `false`.

## Development

Rebuild on changes:

```bash
npm run build
```

Format of the tool response:

- `success`: indicates execution status.
- `url`: scanned URL.
- `summary`: counts of violations, passes, incomplete, and inapplicable rule results.
- `analysis`: raw axe results returned by `@axe-core/playwright`.

