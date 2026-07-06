export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_PAGES = 20;

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
 * Primary extraction: pdfjs-dist with full Unicode/CMap support.
 * This is what makes Hebrew bank reports readable — the legacy latin1
 * heuristic below can physically never produce Hebrew codepoints
 * (QA finding C-1, docs/QA_CALC_PDF_2026-07-06.md).
 */
async function extractTextWithPdfjs(buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: true,
  });
  try {
    const doc = await loadingTask.promise;
    const parts = [];
    const pages = Math.min(doc.numPages, MAX_PAGES);
    for (let p = 1; p <= pages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      parts.push(tc.items.map((item) => item.str).join(" "));
    }
    return parts.join("\n").replace(/\s+/g, " ").trim();
  } finally {
    try {
      const destroyed = loadingTask.destroy();
      if (destroyed?.catch) destroyed.catch(() => {});
    } catch {
      // cleanup only — never mask the extraction result
    }
  }
}

/**
 * Legacy fallback extraction for PDFs pdfjs cannot open: pull literal
 * strings out of BT...ET blocks. latin1-only, so effectively English-only.
 */
function extractTextFromPdfLegacy(buffer) {
  const str = buffer.toString("latin1");
  const textParts = [];

  const btEt = /BT([\s\S]*?)ET/g;
  let match;
  while ((match = btEt.exec(str)) !== null) {
    const block = match[1];
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

const HEBREW_RUN = /[֐-׿]+/g;
const HEBREW_WORD_SEQ = /[֐-׿]+(?:\s+[֐-׿]+)+/g;

/**
 * Some PDF generators store RTL text in visual order (letters and/or words
 * reversed). Produce normalized variants so the field patterns match
 * regardless of how the generator serialized the Hebrew.
 */
function textVariants(text) {
  const lettersFlipped = text.replace(HEBREW_RUN, (run) => [...run].reverse().join(""));
  const flipWords = (t) => t.replace(HEBREW_WORD_SEQ, (seq) => seq.split(/\s+/).reverse().join(" "));
  return [...new Set([text, lettersFlipped, flipWords(lettersFlipped), flipWords(text)])];
}

/**
 * Bidirectional Hebrew keyword↔number patterns.
 *
 * PDF text layers serialize RTL lines in either order — table layouts often
 * come out keyword-first ("יתרה לסילוק ₪ 850,000") while paragraph layouts
 * come out number-first ("850,000 יתרת חוב לסילוק:"). The gap between the
 * keyword and its number must not contain Hebrew letters, otherwise a
 * keyword would happily grab a number that belongs to the NEXT label.
 */
const GAP = "[^\\d\\u0590-\\u05FF]{0,30}";
function bidiPatterns(keywordSource, numberSource) {
  return [
    new RegExp(`(?:${keywordSource})${GAP}${numberSource}`),
    new RegExp(`${numberSource}${GAP}(?:${keywordSource})`),
  ];
}
const NUM = "([\\d][\\d,]*)";
const NUM_5PLUS = "([\\d][\\d,]{4,})";
const DECIMAL = "([\\d.]+)";

/**
 * Parse mortgage fields from extracted PDF text using regex heuristics.
 * Returns an object with any found values; unknown fields are null.
 * The user always reviews and confirms these values in the UI before use.
 */
function parseMortgageFields(text) {
  function matchNumber(patterns, validate = () => true) {
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m) {
        const raw = m[1].replace(/[,\s]/g, "");
        const n = parseFloat(raw);
        if (Number.isFinite(n) && n > 0 && validate(n)) return n;
      }
    }
    return null;
  }

  const balance = matchNumber([
    ...bidiPatterns("יתר[הת]\\s*(?:ה?חוב|משכנתא)?\\s*(?:לסילוק|סילוק|קרן)?", NUM_5PLUS),
    /(?:payoff\s*balance|remaining\s*balance)[^\d]{0,30}([\d,]+)/i,
    /(?:balance)[^\d]{0,20}([\d,]+)/i,
  ], (n) => n >= 10000);

  const currentPayment = matchNumber([
    ...bidiPatterns("(?:החזר|תשלום)\\s*חודשי", NUM),
    /(?:monthly\s*payment)[^\d]{0,30}([\d,]+)/i,
  ], (n) => n >= 100 && n <= 1000000);

  const remainingYears = matchNumber([
    ...bidiPatterns("שנים\\s*(?:שנותרו|נותרו|לסיום)|תקופה\\s*(?:שנותרה|נותרת)|יתרת\\s*תקופה", DECIMAL),
    /(?:remaining\s*(?:years|term))[^\d]{0,30}([\d.]+)/i,
  ], (n) => n > 0 && n <= 50);

  const remainingMonths = matchNumber([
    ...bidiPatterns("חודשים\\s*(?:שנותרו|נותרו|לסיום)", "([\\d]+)"),
    /(?:remaining\s*months)[^\d]{0,30}([\d]+)/i,
  ], (n) => n > 0 && n <= 600);

  const currentRate = matchNumber([
    ...bidiPatterns("ריבית\\s*(?:ממוצעת|קיימת|נוכחית|משוקללת)", DECIMAL),
    /(?:average\s*(?:interest|rate))[^\d]{0,30}([\d.]+)/i,
    /(?:interest\s*rate)[^\d]{0,30}([\d.]+)/i,
    ...bidiPatterns("ריבית", DECIMAL),
  ], (n) => n > 0 && n <= 25);

  const refinanceCost = matchNumber([
    ...bidiPatterns("עמלת?\\s*(?:פירעון(?:\\s*מוקדם)?|היוון|יציאה|מחזור)|עלות\\s*מחזור", NUM),
    /(?:prepayment\s*(?:penalty|fee)|refinance\s*cost)[^\d]{0,30}([\d,]+)/i,
  ], (n) => n <= 5000000);

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
 * Run parseMortgageFields over every RTL-normalization variant of the text
 * and merge: first non-null value per field wins.
 */
function parseMortgageFieldsAllVariants(text) {
  const merged = { balance: null, currentPayment: null, remainingYears: null, currentRate: null, refinanceCost: null };
  for (const variant of textVariants(text)) {
    const fields = parseMortgageFields(variant);
    for (const key of Object.keys(merged)) {
      if (merged[key] == null && fields[key] != null) merged[key] = fields[key];
    }
    if (Object.values(merged).every((v) => v != null)) break;
  }
  return merged;
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

  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/pdf")) {
    return res.status(400).json({ error: "INVALID_FILE_TYPE", message: "יש להעלות קובץ PDF בלבד." });
  }

  // Reject by declared length BEFORE reading: Next's middleware layer silently
  // truncates request bodies at 10MB, so an oversized upload would otherwise
  // arrive trimmed and be parsed "successfully" (QA finding C-4).
  const declaredLength = Number(req.headers["content-length"] || 0);
  if (declaredLength > MAX_PDF_BYTES) {
    return res.status(413).json({ error: "FILE_TOO_LARGE", message: "הקובץ גדול מדי. הגבלה: 10MB." });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch {
    return res.status(400).json({ error: "BODY_READ_FAILED", message: "לא ניתן לקרוא את הקובץ שנשלח." });
  }

  if (rawBody.length > MAX_PDF_BYTES) {
    return res.status(413).json({ error: "FILE_TOO_LARGE", message: "הקובץ גדול מדי. הגבלה: 10MB." });
  }

  // Check PDF magic bytes
  if (!rawBody.slice(0, 4).equals(Buffer.from("%PDF"))) {
    return res.status(400).json({ error: "INVALID_PDF", message: "הקובץ אינו PDF תקני." });
  }

  // Primary: pdfjs (Unicode-aware, reads Hebrew). Fallback: legacy latin1 scan.
  let extractedText = "";
  let textSource = "none";
  try {
    extractedText = await extractTextWithPdfjs(rawBody);
    if (extractedText.length > 0) textSource = "pdfjs";
  } catch {
    extractedText = "";
  }
  if (extractedText.length < 30) {
    try {
      const legacyText = extractTextFromPdfLegacy(rawBody);
      if (legacyText.length > extractedText.length) {
        extractedText = legacyText;
        textSource = "legacy";
      }
    } catch {
      // keep whatever we have
    }
  }

  // Try OpenAI-enhanced extraction first if text was found
  let fields = null;
  let extractionMethod = "none";

  if (extractedText.length > 50 && process.env.OPENAI_API_KEY) {
    fields = await extractWithOpenAI(extractedText);
    if (fields) extractionMethod = "openai";
  }

  // Fall back to heuristic extraction
  if (!fields && extractedText.length > 20) {
    const heuristic = parseMortgageFieldsAllVariants(extractedText);
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
      textSource,
      message: "לא הצלחנו לחלץ נתונים מה-PDF. ייתכן שהדוח מוגן, סרוק כתמונה, או בפורמט לא נתמך. אנא הזינו את הנתונים ידנית.",
      fields: null,
    });
  }

  return res.status(200).json({
    ok: true,
    parsed: true,
    extractionMethod,
    textSource,
    message: "הצלחנו לחלץ נתונים חלקיים. בדקו ואשרו לפני החישוב.",
    fields,
  });
}
