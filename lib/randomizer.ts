/** Returns a float in [0, 1). */
export type Rng = () => number;

/** No item may appear more than this many times in a row (when 2+ items are in play). */
export const MAX_RUN = 3;

const SHUFFLE_ATTEMPTS = 500;

/** Small deterministic PRNG, used by tests and reproducible runs. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cryptographically seeded default RNG. */
export function defaultRng(): Rng {
  const seed = new Uint32Array(1);
  globalThis.crypto.getRandomValues(seed);
  return mulberry32(seed[0]!);
}

/**
 * Number of trials in a session. Every item in play must appear at least once,
 * so a session is never shorter than the number of items.
 */
export function sessionLength(target: number, itemCount: number): number {
  return Math.max(Math.round(target), itemCount);
}

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)]!;
}

function shuffleInPlace<T>(arr: T[], rng: Rng): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

export function longestRun<T>(seq: readonly T[]): number {
  let longest = 0;
  let run = 0;
  for (let i = 0; i < seq.length; i++) {
    run = i > 0 && seq[i] === seq[i - 1] ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return longest;
}

/** True when `seq` satisfies every session rule for `items`. */
export function isValidSequence<T>(seq: readonly T[], items: readonly T[], maxRun = MAX_RUN): boolean {
  if (seq.some((s) => !items.includes(s))) return false;
  if (seq.length >= items.length && items.some((item) => !seq.includes(item))) return false;
  return items.length < 2 || longestRun(seq) <= maxRun;
}

/**
 * Builds the trial order for a session.
 *
 * - Each position is uniformly random among the items in play.
 * - Every item appears at least once (requires `length >= items.length`).
 * - No item appears more than `maxRun` times in a row (impossible with a single item,
 *   so a one-item set simply repeats; that is the "pure association" stage).
 *
 * Method: seed the session with one of each item, fill the rest uniformly at random,
 * shuffle, and reject shuffles that break the run rule. A constrained step-by-step
 * generator is the fallback if rejection keeps failing (practically never).
 */
export function generateSequence<T>(items: readonly T[], length: number, rng: Rng = defaultRng(), maxRun = MAX_RUN): T[] {
  if (items.length === 0) throw new RangeError("generateSequence needs at least one item");
  if (new Set(items).size !== items.length) throw new RangeError("generateSequence items must be unique");
  if (length < items.length) throw new RangeError(`length ${length} is shorter than the ${items.length} items in play`);
  if (maxRun < 1) throw new RangeError("maxRun must be at least 1");
  if (items.length === 1) return Array.from({ length }, () => items[0]!);

  for (let attempt = 0; attempt < SHUFFLE_ATTEMPTS; attempt++) {
    const seq = [...items];
    while (seq.length < length) seq.push(pick(items, rng));
    shuffleInPlace(seq, rng);
    if (longestRun(seq) <= maxRun) return seq;
  }
  return generateStepwise(items, length, rng, maxRun);
}

function generateStepwise<T>(items: readonly T[], length: number, rng: Rng, maxRun: number): T[] {
  const seq: T[] = [];
  const unseen = new Set(items);
  for (let i = 0; i < length; i++) {
    const remaining = length - i;
    let allowed = remaining <= unseen.size ? [...unseen] : [...items];
    const runItem = seq.length >= maxRun && seq.slice(-maxRun).every((s) => s === seq[seq.length - 1]) ? seq[seq.length - 1] : undefined;
    if (runItem !== undefined) allowed = allowed.filter((item) => item !== runItem);
    const next = pick(allowed, rng);
    seq.push(next);
    unseen.delete(next);
  }
  return seq;
}
