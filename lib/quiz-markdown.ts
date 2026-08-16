export type ParsedQuestion = {
  question: string;
  options: string[];
  answer: number;
  feedback: string;
};

/**
 * Parses a simple markdown-style quiz format into questions.
 *
 * Expected format (repeated blocks separated by blank lines):
 *
 *   1. What is the chemical symbol for water?
 *   A. HO
 *   B. H2O
 *   C. WA
 *   D. OHH
 *   Answer: B
 *   Feedback: Water is H2O.
 *
 * - The question line starts with a number followed by "." or ")".
 * - Option lines start with A-D (case-insensitive) followed by ".", ")", or "-".
 * - "Answer:" must name the correct letter.
 * - "Feedback:" is optional.
 */
export function parseQuizMarkdown(md: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const lines = md
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let current: {
    question: string;
    options: string[];
    answer: number | null;
    feedback: string;
  } | null = null;

  const push = () => {
    if (!current || !current.question || current.options.length < 2 || current.answer == null) {
      current = null;
      return;
    }
    questions.push({
      question: current.question,
      options: current.options,
      answer: current.answer,
      feedback: current.feedback,
    });
    current = null;
  };

  const letterToIndex = (letter: string): number => {
    const c = letter.toUpperCase().charCodeAt(0);
    return c - 65;
  };

  for (const line of lines) {
    const ansMatch = line.match(/^answer\s*:\s*([A-Da-d])/);
    if (ansMatch) {
      if (!current) continue;
      current.answer = letterToIndex(ansMatch[1]);
      continue;
    }
    const fbMatch = line.match(/^feedback\s*:\s*(.*)$/i);
    if (fbMatch) {
      if (!current) continue;
      current.feedback = fbMatch[1].trim();
      continue;
    }
    const optMatch = line.match(/^\(?([A-Da-d])\)?[.)\-\u2013]\s*(.*)$/);
    if (optMatch && /^[A-Da-d]$/.test(optMatch[1])) {
      if (!current) continue;
      current.options.push(optMatch[2].trim());
      continue;
    }
    const qMatch = line.match(/^\d+[.)\-\u2013]\s*(.+)$/);
    if (qMatch) {
      push();
      current = { question: qMatch[1].trim(), options: [], answer: null, feedback: "" };
      continue;
    }
    if (current && current.question && current.options.length === 0 && current.answer == null) {
      current.question += " " + line;
    }
  }
  push();

  return questions;
}

/** Builds a sample markdown template the admin can edit. */
export function buildQuizTemplate(): string {
  const lines: string[] = [
    "1. What is the chemical symbol for water?",
    "A. HO",
    "B. H2O",
    "C. WA",
    "D. OHH",
    "Answer: B",
    "Feedback: Water is H2O - two hydrogen atoms bonded to one oxygen atom.",
    "",
    "2. Which organ pumps blood throughout the body?",
    "A. Liver",
    "B. Lung",
    "C. Brain",
    "D. Heart",
    "Answer: D",
    "Feedback: The heart is a muscular organ that pumps blood through the circulatory system.",
    "",
    "3. What is the process by which plants make food?",
    "A. Respiration",
    "B. Photosynthesis",
    "C. Digestion",
    "D. Transpiration",
    "Answer: B",
    "Feedback: Photosynthesis uses sunlight, water, and CO2 to produce glucose and oxygen.",
  ];
  return lines.join("\n");
}

/** Turns parsed questions back into the markdown format (for export). */
export function questionsToMarkdown(questions: ParsedQuestion[]): string {
  return questions
    .map((q, i) => {
      const opts = q.options.map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join("\n");
      const ans = `Answer: ${String.fromCharCode(65 + q.answer)}`;
      const fb = q.feedback ? `\nFeedback: ${q.feedback}` : "";
      return `${i + 1}. ${q.question}\n${opts}\n${ans}${fb}`;
    })
    .join("\n\n");
}

/* ── HTML import ────────────────────────────────────── */

const htmlDecode = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'");

const htmlText = (s: string) => htmlDecode(s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());

const cleanHtml = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)>/gi, "\n");

function letterIndex(t: string): number | null {
  const m = /^\s*\(?([A-Da-d])\)?[\s.:\-–]*/.exec(t);
  if (!m) return null;
  return m[1].toUpperCase().charCodeAt(0) - 65;
}

/**
 * Best-effort parser for HTML quiz exports. Looks for blocks whose class
 * contains "question", options in <li> or elements whose class contains
 * "option"/"choice", and the correct answer in elements whose class contains
 * "correct"/"solution"/"answer-key" or an "Answer:" line. Falls back to
 * converting the HTML to plain text and running the markdown parser.
 */
export function parseQuizHtml(html: string): ParsedQuestion[] {
  const h = cleanHtml(html);

  const questions: ParsedQuestion[] = [];
  const blockRe = /<([a-z0-9]+)[^>]*class="([^"]*question[^"]*)"[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(h))) {
    const inner = m[3];
    let qText = "";
    const qel = /<([a-z0-9]+)[^>]*class="([^"]*(?:prompt|question-text|question-title|title)[^"]*)"[^>]*>([\s\S]*?)<\/\1>/i.exec(inner);
    if (qel) qText = htmlText(qel[3]);
    if (!qText) qText = htmlText(inner).split("\n")[0] || "";
    if (!qText) continue;

    const opts: string[] = [];
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let x: RegExpExecArray | null;
    while ((x = liRe.exec(inner))) {
      const t = htmlText(x[1]);
      if (t) opts.push(t);
    }
    if (opts.length === 0) {
      const elRe = /<([a-z0-9]+)[^>]*class="([^"]*(?:option|choice|answer-item)[^"]*)"[^>]*>([\s\S]*?)<\/\1>/gi;
      while ((x = elRe.exec(inner))) {
        const t = htmlText(x[3]);
        if (t) opts.push(t);
      }
    }

    let answer: number | null = null;
    const keyRe = /<([a-z0-9]+)[^>]*class="([^"]*(?:correct|solution|answer-key|right-answer)[^"]*)"[^>]*>([\s\S]*?)<\/\1>/gi;
    while ((x = keyRe.exec(inner))) {
      const idx = letterIndex(htmlText(x[3]));
      if (idx != null) {
        answer = idx;
        break;
      }
    }
    if (answer == null) {
      const am = /answer\s*[:\-–]\s*\(?([A-Da-d])/i.exec(inner);
      if (am) answer = am[1].toUpperCase().charCodeAt(0) - 65;
    }

    if (opts.length >= 2 && answer != null) {
      questions.push({ question: qText, options: opts.slice(0, 4), answer, feedback: "" });
    }
  }

  if (questions.length) return questions;

  const asText = parseQuizMarkdown(htmlText(h));
  return asText;
}