import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { chromium, firefox, webkit } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const BrowserNameSchema = z.enum(["chromium", "firefox", "webkit"]);

const AxeScanSchema = z.object({
  url: z.string().url(),
  tags: z.array(z.string()).default(["wcag2a"]),
  runOnlyRules: z.array(z.string()).optional(),
  disableRules: z.array(z.string()).optional(),
  includeSelectors: z.array(z.string()).optional(),
  excludeSelectors: z.array(z.string()).optional(),
  waitUntil: z.enum(["load", "domcontentloaded", "networkidle", "commit"]).optional(),
  navigationTimeoutMs: z.number().int().positive().optional(),
  legacyMode: z.boolean().optional(),
  viewport: z
    .object({
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      deviceScaleFactor: z.number().positive().optional(),
      userAgent: z.string().optional()
    })
    .optional(),
  browser: BrowserNameSchema.default("chromium"),
  headless: z.boolean().default(true),
  postNavigationWaitMs: z.number().int().nonnegative().default(1000),
  waitForSelector: z.string().optional(),
  axeOptions: z.record(z.unknown()).optional(),
  includeSummary: z.boolean().default(false)
});

type AxeScanArgs = z.infer<typeof AxeScanSchema>;

async function analyzeAccessibility(args: AxeScanArgs) {
  const browserLauncher =
    args.browser === "firefox" ? firefox : args.browser === "webkit" ? webkit : chromium;
  const browser = await browserLauncher.launch({ headless: args.headless });
  const context = await browser.newContext({
    viewport: {
      width: args.viewport?.width ?? 1280,
      height: args.viewport?.height ?? 720
    },
    deviceScaleFactor: args.viewport?.deviceScaleFactor ?? 1,
    userAgent: args.viewport?.userAgent
  });
  try {
    const page = await context.newPage();
    await page.goto(args.url, {
      waitUntil: args.waitUntil ?? "load",
      timeout: args.navigationTimeoutMs
    });
    if (args.waitForSelector) {
      await page.waitForSelector(args.waitForSelector, {
        timeout: args.navigationTimeoutMs
      });
    }
    if (args.postNavigationWaitMs > 0) {
      await page.waitForTimeout(args.postNavigationWaitMs);
    }
    let builder = new AxeBuilder({ page });
    if (args.runOnlyRules && args.runOnlyRules.length > 0) {
      builder = builder.withRules(args.runOnlyRules);
    } else if (args.tags && args.tags.length > 0) {
      builder = builder.withTags(args.tags);
    }
    if (args.disableRules && args.disableRules.length > 0) {
      builder = builder.disableRules(args.disableRules);
    }
    if (args.includeSelectors) {
      for (const selector of args.includeSelectors) {
        builder = builder.include(selector);
      }
    }
    if (args.excludeSelectors) {
      for (const selector of args.excludeSelectors) {
        builder = builder.exclude(selector);
      }
    }
    if (typeof args.legacyMode === "boolean") {
      builder = builder.setLegacyMode(args.legacyMode);
    }
    if (args.axeOptions) {
      builder = builder.options(args.axeOptions);
    }
    const analysis = await builder.analyze();
    const summary = {
      violations: analysis.violations.length,
      passes: analysis.passes.length,
      incomplete: analysis.incomplete.length,
      inapplicable: analysis.inapplicable.length
    };
    return { analysis, summary };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  const server = new McpServer({
    name: "axe-scanner-mcp",
    version
  });

  server.registerTool(
    "axe_scan_url",
    {
      description: "Run an axe accessibility scan against a URL",
      inputSchema: AxeScanSchema
    },
    async (rawArgs) => {
      try {
        const parsed = AxeScanSchema.parse(rawArgs);
        const result = await analyzeAccessibility(parsed);
        const payload: Record<string, unknown> = {
          success: true,
          url: parsed.url,
          summary: result.summary,
          analysis: result.analysis
        };

        if (parsed.includeSummary) {
          payload.summaryText = [
            `Axe scan completed for ${parsed.url}.`,
            `Violations: ${result.summary.violations}.`,
            `Passed rules: ${result.summary.passes}.`,
            `Incomplete checks: ${result.summary.incomplete}.`,
            `Inapplicable rules: ${result.summary.inapplicable}.`
          ].join(" ");
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                payload,
                null,
                2
              )
            }
          ]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const hint =
          error instanceof Error && error.message.includes("Executable doesn't exist")
            ? "Playwright browsers are missing. Run `npx playwright install` (add --with-deps on macOS/Linux if prompted)."
            : undefined;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: message,
                  hint
                },
                null,
                2
              )
            }
          ]
        };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(() => {
  process.exit(1);
});

