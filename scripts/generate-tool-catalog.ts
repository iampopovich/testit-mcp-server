import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildToolBundles } from "../src/server-bootstrap.js";
import type { McpToolDefinition } from "../src/tools/types.js";

interface ToolCategory {
  name: string;
  tools: McpToolDefinition[];
}

interface ToolCatalog {
  generatedAt: string;
  totalTools: number;
  categories: ToolCategory[];
}

function buildCatalog(): ToolCatalog {
  const noopClient = new Proxy(
    {},
    {
      get() {
        throw new Error("Client access is not expected while generating tool catalog.");
      },
    },
  );

  const categories: ToolCategory[] = buildToolBundles(noopClient as never).map((bundle) => ({
    name: bundle.category,
    tools: bundle.tools,
  }));

  const totalTools = categories.reduce((acc, category) => acc + category.tools.length, 0);

  return {
    generatedAt: new Date().toISOString(),
    totalTools,
    categories,
  };
}

async function main(): Promise<void> {
  const catalog = buildCatalog();
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const outputPath = path.resolve(scriptDir, "../docs/tools.json");
  await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  process.stdout.write(`Generated ${catalog.totalTools} tools in ${outputPath}\n`);
}

await main();
