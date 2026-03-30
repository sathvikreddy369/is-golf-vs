import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateMatchCount, generateWinningNumbers, mapMatchTier, splitPrizePool } from "./draws.js";

describe("draw engine", () => {
  it("generates 5 unique random numbers in range", () => {
    const numbers = generateWinningNumbers("random", []);

    assert.equal(numbers.length, 5);
    assert.equal(new Set(numbers).size, 5);
    assert.ok(numbers.every((n) => n >= 1 && n <= 45));
  });

  it("weighted mode includes top-frequency values", () => {
    const sourceScores = [7, 7, 7, 12, 12, 19, 3, 4, 5, 6];
    const numbers = generateWinningNumbers("weighted", sourceScores);

    assert.equal(numbers.length, 5);
    assert.ok(numbers.includes(7));
    assert.ok(numbers.includes(12));
  });

  it("calculates match count using unique user scores", () => {
    const userScores = [2, 2, 4, 8, 16];
    const winningNumbers = [1, 2, 4, 6, 8];

    assert.equal(calculateMatchCount(userScores, winningNumbers), 3);
  });

  it("maps match count to expected tiers", () => {
    assert.equal(mapMatchTier(5), "match_5");
    assert.equal(mapMatchTier(4), "match_4");
    assert.equal(mapMatchTier(3), "match_3");
    assert.equal(mapMatchTier(2), null);
  });

  it("splits prize pool with PRD percentages and rollover", () => {
    const split = splitPrizePool(100_000, 20_000);

    assert.deepEqual(split, {
      tier5: 48_000,
      tier4: 42_000,
      tier3: 30_000,
    });
  });

  it("handles negative totals defensively", () => {
    const split = splitPrizePool(-1000, 0);

    assert.deepEqual(split, {
      tier5: 0,
      tier4: 0,
      tier3: 0,
    });
  });
});
