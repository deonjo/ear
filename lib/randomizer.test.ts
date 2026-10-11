import { describe, expect, it } from "vitest";
import { WHITE_CHORD_IDS, CHORDS } from "./chords";
import { MAX_RUN, generateSequence, isValidSequence, longestRun, mulberry32, sessionLength } from "./randomizer";

const ALL = CHORDS.map((c) => c.id);

describe("generateSequence", () => {
  it("repeats the only item when one chord is in play (pure association stage)", () => {
    expect(generateSequence(["red"], 20, mulberry32(1))).toEqual(Array(20).fill("red"));
  });

  it.each([2, 3, 5, 9, 14])("satisfies every rule with %i items across many seeds", (n) => {
    const items = ALL.slice(0, n);
    for (let seed = 0; seed < 400; seed++) {
      for (const length of [n, 10, 20, 30].filter((l) => l >= n)) {
        const seq = generateSequence(items, length, mulberry32(seed));
        expect(seq).toHaveLength(length);
        for (const item of items) expect(seq).toContain(item);
        expect(longestRun(seq)).toBeLessThanOrEqual(MAX_RUN);
        expect(isValidSequence(seq, items)).toBe(true);
      }
    }
  });

  it("is roughly uniform across items and positions", () => {
    const items = WHITE_CHORD_IDS.slice(0, 4);
    const counts = new Map(items.map((i) => [i, 0]));
    const firstPosition = new Map(items.map((i) => [i, 0]));
    const rng = mulberry32(42);
    const runs = 4000;
    for (let r = 0; r < runs; r++) {
      const seq = generateSequence(items, 20, rng);
      seq.forEach((s) => counts.set(s, counts.get(s)! + 1));
      firstPosition.set(seq[0]!, firstPosition.get(seq[0]!)! + 1);
    }
    const expected = (runs * 20) / items.length;
    for (const c of counts.values()) expect(Math.abs(c - expected) / expected).toBeLessThan(0.03);
    const expectedFirst = runs / items.length;
    for (const c of firstPosition.values()) expect(Math.abs(c - expectedFirst) / expectedFirst).toBeLessThan(0.1);
  });

  it("with two chords, still never plays one more than three times in a row", () => {
    for (let seed = 0; seed < 2000; seed++) {
      expect(longestRun(generateSequence(["red", "yellow"], 30, mulberry32(seed)))).toBeLessThanOrEqual(3);
    }
  });

  it("does not always produce the same order", () => {
    const a = generateSequence(ALL.slice(0, 5), 20, mulberry32(1));
    const b = generateSequence(ALL.slice(0, 5), 20, mulberry32(2));
    expect(a).not.toEqual(b);
  });

  it("rejects impossible requests", () => {
    expect(() => generateSequence([], 10)).toThrow(RangeError);
    expect(() => generateSequence(ALL, 10)).toThrow(RangeError);
    expect(() => generateSequence(["red", "red"], 10)).toThrow(RangeError);
  });
});

describe("sessionLength", () => {
  it("uses the target, but never fewer trials than items in play", () => {
    expect(sessionLength(20, 3)).toBe(20);
    expect(sessionLength(10, 14)).toBe(14);
  });
});

describe("isValidSequence", () => {
  it("flags runs longer than three and missing items", () => {
    expect(isValidSequence(["red", "red", "red", "red", "yellow"], ["red", "yellow"])).toBe(false);
    expect(isValidSequence(["red", "red", "yellow"], ["red", "yellow", "blue"])).toBe(false);
    expect(isValidSequence(["red", "red", "red", "yellow"], ["red", "yellow"])).toBe(true);
  });
});
