import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: npm run scan -- <url>');
    process.exit(1);
  }

  const client = new Client({
    name: 'axe-scan-cli',
    version: '0.1.0',
  });

  const transport = new StdioClientTransport({
    command: 'node',
    args: [join(__dirname, '../dist/index.js')],
    stderr: 'pipe',
  });

  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: 'axe_scan_url',
      arguments: { url },
    });

    const content = result.content || [];
    let output = '';

    if (Array.isArray(content)) {
      output = content
        .map((item: any) => {
          if (
            item &&
            typeof item === 'object' &&
            item.type === 'text' &&
            'text' in item
          ) {
            return item.text;
          }
          return JSON.stringify(item);
        })
        .join('\n');
    } else {
      output = JSON.stringify(content);
    }

    console.log(output);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
