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