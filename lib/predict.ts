import type { Paper, PaperRow, Prediction } from "@/lib/types";

export function toPct(marks: number, total: number) {
  return Math.round((marks / total) * 100);
}

/** Linear regression over paper percentages; predicts the next paper's score. */
export function predict(papers: { marks: number; total: number }[]): Prediction | null {
  const pts = papers.map((p) => toPct(p.marks, p.total));
  const n = pts.length;
  if (n < 2) return null;
  const meanX = (n - 1) / 2;
  const meanY = pts.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  pts.forEach((y, i) => {
    num += (i - meanX) * (y - meanY);
    den += (i - meanX) * (i - meanX);
  });
  const slope = den ? num / den : 0;
  const predicted = Math.max(0, Math.min(100, Math.round(meanY + slope * (n - meanX))));
  const trend: Prediction["trend"] = slope > 0.4 ? "improving" : slope < -0.4 ? "declining" : "steady";
  return { slope, predicted, trend };
}

export function paperRows(papers: Paper[]): PaperRow[] {
  return [...papers]
    .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""))
    .map((p) => ({ ...p, pct: toPct(p.marks, p.total) }));
}
