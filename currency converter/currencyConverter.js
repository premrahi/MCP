import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "currency-converter",
  version: "1.0.0",
});

server.registerTool(
  "convert_currency",
  {
    title: "Currency Converter",
    description: "Convert an amount from one currency to another using the latest rates.",
    inputSchema: {
      amount: z.number().positive().describe("Amount to be converted, e.g. 100"),
      fromCurrency: z.string().length(3).describe("Base currency code, e.g. INR"),
      toCurrency: z.string().length(3).describe("Target currency code, e.g. USD"),
    },
  },
  async ({ amount, fromCurrency, toCurrency }) => {
    try {
      const from = fromCurrency.toUpperCase();
      const to = toCurrency.toUpperCase();

      if (from === to) {
        return { content: [{ type: "text", text: `${amount} ${from} = ${amount} ${to}` }] };
      }

      const res = await fetch(
        `https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`
      );
      if (!res.ok) {
        throw new Error(`Rate API failed (${res.status}). Check the currency codes.`);
      }

      const data = await res.json();
      const rate = data.rates?.[to];
      if (rate === undefined) throw new Error(`No rate found for ${from} → ${to}`);

      const converted = (amount * rate).toFixed(2);
      return {
        content: [
          {
            type: "text",
            text: `${amount} ${from} = ${converted} ${to} (rate: ${rate}, date: ${data.date})`,
          },
        ],
      };
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${err.message}` }],
      };
    }
  }
);

async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP currency converter server started! 🌐"); // stderr, not stdout
}

startServer().catch((error) => {
  console.error("Failed to start MCP server", error);
  process.exit(1);
});