export type DrawMode = "random" | "weighted";

function uniqueRandomNumbers(count: number, min: number, max: number) {
  const numbers = new Set<number>();
  while (numbers.size < count) {
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    numbers.add(value);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

export function generateWinningNumbers(mode: DrawMode, allScores: number[]) {
  if (mode === "random" || allScores.length === 0) {
    return uniqueRandomNumbers(5, 1, 45);
  }

  const frequency = new Map<number, number>();
  allScores.forEach((score) => {
    frequency.set(score, (frequency.get(score) ?? 0) + 1);
  });

  const weighted = Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([score]) => score)
    .filter((score) => score >= 1 && score <= 45);

  const selected = new Set<number>(weighted.slice(0, 3));

  while (selected.size < 5) {
    const value = Math.floor(Math.random() * 45) + 1;
    selected.add(value);
  }

  return Array.from(selected).sort((a, b) => a - b);
}

export function calculateMatchCount(userScores: number[], winningNumbers: number[]) {
  const scoreSet = new Set(userScores);
  return winningNumbers.reduce((count, n) => count + (scoreSet.has(n) ? 1 : 0), 0);
}

export function mapMatchTier(matchCount: number) {
  if (matchCount >= 5) return "match_5" as const;
  if (matchCount === 4) return "match_4" as const;
  if (matchCount === 3) return "match_3" as const;
  return null;
}

export function splitPrizePool(totalPoolCents: number, rolloverInCents: number) {
  const total = Math.max(0, totalPoolCents + rolloverInCents);
  return {
    tier5: Math.floor(total * 0.4),
    tier4: Math.floor(total * 0.35),
    tier3: Math.floor(total * 0.25),
  };
}
