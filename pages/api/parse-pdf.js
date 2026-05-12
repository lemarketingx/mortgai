export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Read raw request body as a Buffer.
 */
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/**
 * Extract text content from a PDF buffer using a simple heuristic approach.
 * PDFs encode text in streams — this extracts readable ASCII/Hebrew sequences.
 * Not a full PDF parser; works on many standard mortgage report PDFs.
 */
function extractTextFromPdf(buffer) {
  const str = buffer.toString("latin1");
  const textParts = [];

  // Extract text from BT...ET blocks (standard PDF text blocks)
  const btEt = /BT([\s\S]*?)ET/g;
  let match;
  while ((match = btEt.exec(str)) !== null) {
    const block = match[1];
    // Extract strings inside parentheses (Tj operator)
    const strings = /\(([^)]{1,300})\)/g;
    let s;
    while ((s = strings.exec(block)) !== null) {
      const text = s[1].replace(/\\(\d{3})/g, (_, oct) =>
        String.fromCharCode(parseInt(oct, 8))
      );
      if (text.trim().length > 1) textParts.push(text.trim());
    }
  }

  return textParts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Parse mortgage fields from extracted PDF text using regex heuristics.
 * Returns an object with any found values; unknown fields are null.
 */
function parseMortgageFields(text) {
  function matchNumber(patterns) {
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m) {
        const raw = m[1].replace(/[,\s]/g, "");
        const n = parseFloat(raw);
        if (Number.isFinite(n) && n > 0) return n;
      }
    }
    return null;
  }

  const balance = matchNumber([
    /(?:יתרת?\s*(?:חוב|לסילוק|קרן)|payoff\s*balance)[^\d]{0,30}([\d,]+)/i,
    /(?:remaining\s*balance)[^\d]{0,30}([\d,]+)/i,
    /(?:balance)[^\d]{0,20}([\d,]+)/i,
  ]);

  const currentPayment = matchNumber([
    /(?:החזר\s*חודשי|תשלום\s*חודשי)[^\d]{0,30}([\d,]+)/i,
    /(?:monthly\s*payment)[^\d]{0,30}([\d,]+)/i,
  ]);

  const remainingYears = matchNumber([
    /(?:שנים\s*(?:שנותרו|לסיום)|תקופה\s*שנותרה)[^\d]{0,30}([\d.]+)/i,
    /(?:remaining\s*(?:years|term))[^\d]{0,30}([\d.]+)/i,
  ]);

  const remainingMonths = matchNumber([
    /(?:חודשים\s*(?:שנותרו|לסיום))[^\d]{0,30}([\d]+)/i,
    /(?:remaining\s*months)[^\d]{0,30}([\d]+)/i,
  ]);

  const currentRate = matchNumber([
    /(?:ריבית\s*(?:ממוצעת|קיימת|נוכחית))[^\d]{0,30}([\d.]+)/i,
    /(?:average\s*(?:interest|rate))[^\d]{0,30}([\d.]+)/i,
    /(?:interest\s*rate)[^\d]{0,30}([\d.]+)/i,
  ]);

  const refinanceCost = matchNumber([
    /(?:עמלת?\s*(?:פירעון|יציאה|מחזור)|עלות\s*מחזור)[^\d]{0,30}([\d,]+)/i,
    /(?:prepayment\s*(?:penalty|fee)|refinance\s*cost)[^\d]{0,30}([\d,]+)/i,
  ]);

  // Convert remaining months to years if no years found
  const computedRemainingYears =
    remainingYears ||
    (remainingMonths ? Math.round((remainingMonths / 12) * 10) / 10 : null);

  return {
    balance,
    currentPayment,
    remainingYears: computedRemainingYears,
    currentRate,
    refinanceCost,
  };
}

const OPENAI_SCHEMA = {
  type: "object",
  properties: {
    bankName: { type: ["string", "null"], description: "Name of the bank or lender (e.g. Bank Hapoalim, Bank Leumi)" },
    balance: { type: ["number", "null"], description: "Remaining payoff balance in ILS (יתרת חוב לסילוק)" },
    currentPayment: { type: ["number", "null"], description: "Current monthly payment in ILS (החזר חודשי)" },
    remainingYears: { type: ["number", "null"], description: "Remaining term in years (can be decimal, e.g. 12.5)" },
    currentRate: { type: ["number", "null"], description: "Current average interest rate as percentage (e.g. 4.5 means 4.5%)" },
    refinanceCost: { type: ["number", "null"], description: "Prepayment penalty / refinance cost in ILS (עמלת פירעון)" },
    tracks: {
      type: ["array", "null"],
      description: "Individual mortgage tracks (מסלולים) if multiple tracks exist",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Track name (e.g. פריים, קל״צ, משתנה)" },
          balance: { type: ["number", "null"] },
          rate: { type: ["number", "null"] },
          remainingYears: { type: ["number", "null"] },
        },
      },
    },
    confidence: {
      type: "object",
      description: "Confidence score 0-1 per extracted field",
      properties: {
        bankName: { type: "number" },
        balance: { type: "number" },
        currentPayment: { type: "number" },
        remainingYears: { type: "number" },
        currentRate: { type: "number" },
        refinanceCost: { type: "number" },
      },
    },
  },
  required: ["balance", "currentPayment", "remainingYears", "currentRate", "refinanceCost", "confidence"],
};

async function extractWithOpenAI(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const systemPrompt = `You are an expert Israeli mortgage document parser. Extract structured data from mortgage PDF text.

Rules:
- Hebrew numbers: "מיליון" = 1,000,000; "אלף" = 1,000; commas are thousands separators
- Percentages: if you see "4.5%" or "4.5 אחוז" return 4.5 (not 0.045)
- All monetary amounts in ILS (Israeli New Shekel)
- If a field is ambiguous or missing, return null
- Assign confidence 0-1 per field: 1.0 = explicit clear match, 0.5 = inferred, 0.0 = not found
- If multiple mortgage tracks exist, populate the tracks array
- Return ONLY valid JSON matching the schema exactly`;

  const userPrompt = `Extract mortgage data from this PDF text:\n\n${text.slice(0, 7000)}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content?.trim() || "";
    const parsed = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) return null;
    // Ensure confidence object exists
    if (!parsed.confidence || typeof parsed.confidence !== "object") {
      parsed.confidence = {};
    }
    return parsed;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch {
    return res.status(400).json({ error: "BODY_READ_FAILED", message: "לא ניתן לקרוא את הקובץ שנשלח." });
  }

  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/pdf")) {
    return res.status(400).json({ error: "INVALID_FILE_TYPE", message: "יש להעלות קובץ PDF בלבד." });
  }

  if (rawBody.length > 10 * 1024 * 1024) {
    return res.status(413).json({ error: "FILE_TOO_LARGE", message: "הקובץ גדול מדי. הגבלה: 10MB." });
  }

  // Check PDF magic bytes
  if (!rawBody.slice(0, 4).equals(Buffer.from("%PDF"))) {
    return res.status(400).json({ error: "INVALID_PDF", message: "הקובץ אינו PDF תקני." });
  }

  let extractedText = "";
  try {
    extractedText = extractTextFromPdf(rawBody);
  } catch {
    extractedText = "";
  }

  // Try OpenAI-enhanced extraction first if text was found
  let fields = null;
  let extractionMethod = "none";

  if (extractedText.length > 50 && process.env.OPENAI_API_KEY) {
    fields = await extractWithOpenAI(extractedText);
    if (fields) extractionMethod = "openai";
  }

  // Fall back to heuristic extraction
  if (!fields && extractedText.length > 50) {
    const heuristic = parseMortgageFields(extractedText);
    if (heuristic) {
      fields = {
        ...heuristic,
        bankName: null,
        tracks: null,
        confidence: {
          balance: heuristic.balance != null ? 0.6 : 0,
          currentPayment: heuristic.currentPayment != null ? 0.6 : 0,
          remainingYears: heuristic.remainingYears != null ? 0.5 : 0,
          currentRate: heuristic.currentRate != null ? 0.6 : 0,
          refinanceCost: heuristic.refinanceCost != null ? 0.5 : 0,
          bankName: 0,
        },
      };
      extractionMethod = "heuristic";
    }
  }

  const coreFields = ["balance", "currentPayment", "remainingYears", "currentRate", "refinanceCost"];
  const hasAnyField = fields && coreFields.some((k) => fields[k] != null);

  if (!hasAnyField) {
    return res.status(200).json({
      ok: false,
      parsed: false,
      extractionMethod: "none",
      message: "לא הצלחנו לחלץ נתונים מה-PDF. ייתכן שהדוח מוגן, סרוק כתמונה, או בפורמט לא נתמך. אנא הזינו את הנתונים ידנית.",
      fields: null,
    });
  }

  return res.status(200).json({
    ok: true,
    parsed: true,
    extractionMethod,
    message: "הצלחנו לחלץ נתונים חלקיים. בדקו ואשרו לפני החישוב.",
    fields,
  });
}
