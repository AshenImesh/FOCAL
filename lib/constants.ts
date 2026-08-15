export const GRADES = ["6", "7", "8", "9", "10", "11"] as const;

export const SITE = {
  name: "FOCAL",
  tagline: "Science classes · Grades 6–11 · English Medium",
};

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function gradeOfPct(pct: number): { letter: string; cls: string } {
  if (pct >= 75) return { letter: "A", cls: "badge-a" };
  if (pct >= 60) return { letter: "B", cls: "badge-b" };
  if (pct >= 40) return { letter: "C", cls: "badge-c" };
  return { letter: "D", cls: "badge-d" };
}

export function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
