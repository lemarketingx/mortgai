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

/**
 * Use OpenAI GPT-4o to extract structured mortgage data from PDF text.
 * Only called when OPENAI_API_KEY is set.
 */
async function extractWithOpenAI(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are a mortgage data extraction assistant. Extract the following fields from this Israeli mortgage PDF text. Return a JSON object with these keys (use null for missing fields):
- balance: remaining payoff balance in ILS (number)
- currentPayment: current monthly payment in ILS (number)
- remainingYears: remaining term in years (number, can be decimal)
- currentRate: current average interest rate as a percentage (number, e.g. 4.5)
- refinanceCost: refinance / prepayment penalty cost in ILS (number)

PDF text:
${text.slice(0, 6000)}

Return ONLY valid JSON, no explanation.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 256,
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content?.trim() || "";
    const parsed = JSON.parse(content.replace(/^```json\n?/, "").replace(/\n?```$/, ""));
    return typeof parsed === "object" && parsed !== null ? parsed : null;
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
  if (extractedText.length > 50 && process.env.OPENAI_API_KEY) {
    fields = await extractWithOpenAI(extractedText);
  }

  // Fall back to heuristic extraction
  if (!fields && extractedText.length > 50) {
    fields = parseMortgageFields(extractedText);
  }

  const hasAnyField = fields && Object.values(fields).some((v) => v !== null && v !== undefined);

  if (!hasAnyField) {
    return res.status(200).json({
      ok: false,
      parsed: false,
      message: "לא הצלחנו לחלץ נתונים מה-PDF. ייתכן שהדוח מוגן, סרוק כתמונה, או בפורמט לא נתמך. אנא הזינו את הנתונים ידנית.",
      fields: null,
    });
  }

  return res.status(200).json({
    ok: true,
    parsed: true,
    message: "הצלחנו לחלץ נתונים חלקיים. בדקו ואשרו לפני החישוב.",
    fields,
  });
}
