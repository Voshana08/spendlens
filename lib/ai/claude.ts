import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReceiptData = {
  merchant: string;
  amount: number;
  date: string; // YYYY-MM-DD
  items: Array<{ description: string; amount: number }>;
  suggestedCategory: string;
};

export type StatementTransaction = {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  suggestedCategory: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Strip markdown code fences Claude sometimes wraps JSON in */
function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return text.trim();
}

const CATEGORIES =
  "Food, Transport, Utilities, Entertainment, Shopping, Health, Salary, Other";

// ── Receipt parser ────────────────────────────────────────────────────────────

export async function parseReceipt(pdfBuffer: Buffer): Promise<ReceiptData> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        // Cache the system prompt — it never changes between receipt calls
        text: `You are a receipt data extractor. You will receive a receipt PDF and must return ONLY a valid JSON object with no prose, no markdown, no code fences — just the raw JSON.

The JSON must have exactly this shape:
{
  "merchant": "string — store or business name",
  "amount": number — total amount as a positive decimal,
  "date": "YYYY-MM-DD",
  "items": [{ "description": "string", "amount": number }],
  "suggestedCategory": "one of: ${CATEGORIES}"
}

Rules:
- If a field cannot be determined, use a sensible default ("Unknown" for strings, 0 for numbers, today's date for date).
- amount must be the final total paid, not subtotals.
- items may be an empty array if no line items are visible.`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBuffer.toString("base64"),
            },
          } as Anthropic.DocumentBlockParam,
          {
            type: "text",
            text: "Extract the receipt data and return the JSON object.",
          },
        ],
      },
    ],
  });

  const raw =
    message.content[0].type === "text" ? message.content[0].text : "";

  let parsed: ReceiptData;
  try {
    parsed = JSON.parse(extractJSON(raw));
  } catch {
    throw new Error(
      `parseReceipt: Claude returned non-JSON response.\n\nRaw response:\n${raw}`
    );
  }

  return parsed;
}

// ── Bank statement parser ─────────────────────────────────────────────────────

export async function parseBankStatement(
  pdfBuffer: Buffer
): Promise<StatementTransaction[]> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: `You are a bank statement data extractor. You will receive a bank statement PDF and must return ONLY a valid JSON array with no prose, no markdown, no code fences — just the raw JSON array.

Each element must have exactly this shape:
{
  "date": "YYYY-MM-DD",
  "description": "string — cleaned transaction description",
  "amount": number — positive decimal,
  "type": "INCOME" or "EXPENSE",
  "suggestedCategory": "one of: ${CATEGORIES}"
}

Rules:
- Credits, deposits, and refunds are INCOME. Debits, withdrawals, and purchases are EXPENSE.
- amount is always positive — type indicates direction.
- Omit balance carry-forward rows and header/footer rows.
- description should be the cleaned merchant or reference name, not raw bank codes.
- Suggest the most specific matching category from the list.
- If the statement contains no parseable transactions return an empty array [].`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBuffer.toString("base64"),
            },
          } as Anthropic.DocumentBlockParam,
          {
            type: "text",
            text: "Extract all transactions from this bank statement and return the JSON array.",
          },
        ],
      },
    ],
  });

  const raw =
    message.content[0].type === "text" ? message.content[0].text : "";

  let parsed: StatementTransaction[];
  try {
    parsed = JSON.parse(extractJSON(raw));
  } catch {
    throw new Error(
      `parseBankStatement: Claude returned non-JSON response.\n\nRaw response:\n${raw}`
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      `parseBankStatement: Expected JSON array, got ${typeof parsed}`
    );
  }

  return parsed;
}
