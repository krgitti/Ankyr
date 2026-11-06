/**
 * Exact rational arithmetic on BigInt.
 *
 * Every gear ratio, every period relation and every time interval in the
 * Mechanism is a rational number. Using exact rationals means that after
 * 10^6 simulated years there is still no drift: the phase of a dial is
 * computed as an exact fraction and only converted to a float when it has
 * been reduced modulo one turn. This is the numerical foundation of the
 * whole emulator (see docs/03-kinematics.md).
 */

const abs = (a: bigint) => (a < 0n ? -a : a);

const gcd = (a: bigint, b: bigint): bigint => {
  a = abs(a);
  b = abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
};

export class Q {
  readonly n: bigint; // numerator (sign carrier)
  readonly d: bigint; // denominator, always > 0

  private constructor(n: bigint, d: bigint) {
    this.n = n;
    this.d = d;
  }

  static of(n: number | bigint, d: number | bigint = 1n): Q {
    let nn = BigInt(n);
    let dd = BigInt(d);
    if (dd === 0n) throw new Error('Q: zero denominator');
    if (dd < 0n) {
      nn = -nn;
      dd = -dd;
    }
    const g = gcd(nn, dd) || 1n;
    return new Q(nn / g, dd / g);
  }

  /** Exact value of a double. */
  static fromNumber(x: number): Q {
    if (!Number.isFinite(x)) throw new Error(`Q.fromNumber: ${x}`);
    if (Number.isInteger(x)) return Q.of(x);
    let scale = 1;
    // Doubles are exact rationals with a power-of-two denominator; 2^40 of
    // precision is far beyond the 1e-6 days we ever feed in.
    while (!Number.isInteger(x * scale) && scale < 2 ** 40) scale *= 2;
    return Q.of(Math.round(x * scale), scale);
  }

  static readonly ZERO = Q.of(0);
  static readonly ONE = Q.of(1);

  add(o: Q) {
    return Q.of(this.n * o.d + o.n * this.d, this.d * o.d);
  }
  sub(o: Q) {
    return Q.of(this.n * o.d - o.n * this.d, this.d * o.d);
  }
  mul(o: Q) {
    return Q.of(this.n * o.n, this.d * o.d);
  }
  div(o: Q) {
    if (o.n === 0n) throw new Error('Q: division by zero');
    return Q.of(this.n * o.d, this.d * o.n);
  }
  mulInt(k: number | bigint) {
    return Q.of(this.n * BigInt(k), this.d);
  }
  neg() {
    return Q.of(-this.n, this.d);
  }
  abs() {
    return this.n < 0n ? this.neg() : this;
  }
  inv() {
    return Q.of(this.d, this.n);
  }
  cmp(o: Q) {
    const l = this.n * o.d;
    const r = o.n * this.d;
    return l < r ? -1 : l > r ? 1 : 0;
  }
  eq(o: Q) {
    return this.n === o.n && this.d === o.d;
  }
  isZero() {
    return this.n === 0n;
  }
  isNeg() {
    return this.n < 0n;
  }
  /** Floor division, also correct for negatives. */
  floor(): bigint {
    const q = this.n / this.d;
    return this.n % this.d === 0n || this.n >= 0n ? q : q - 1n;
  }
  ceil(): bigint {
    return -this.neg().floor();
  }
  /** Fractional part in [0, 1). */
  frac(): Q {
    const f = this.n - this.floor() * this.d;
    return Q.of(f, this.d);
  }
  /** Remainder in [0, m). */
  mod(m: Q | number | bigint): Q {
    const mm = m instanceof Q ? m : Q.of(m);
    const k = this.div(mm).floor();
    return this.sub(mm.mulInt(k));
  }
  toNumber() {
    // BigInt -> Number division can overflow for huge values; scale first.
    const scale = 1e12;
    const num = Number((this.n * BigInt(scale)) / this.d);
    return num / scale;
  }
  toString() {
    return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`;
  }
  valueOf() {
    return this.toNumber();
  }
  toJSON() {
    return this.toString();
  }
}

export const q = (n: number | bigint, d: number | bigint = 1n) => Q.of(n, d);

/**
 * Best rational approximation with a bounded denominator (continued fractions).
 * Used to show how the inscribed period relations, e.g. Venus (289, 462), sit
 * between the Babylonian (5, 8) and (720, 1151) relations.
 */
export function approximate(x: number, maxDenominator = 1000): Q {
  let h0 = 0n;
  let h1 = 1n;
  let k0 = 1n;
  let k1 = 0n;
  let v = x;
  for (let i = 0; i < 64; i++) {
    const a = BigInt(Math.floor(v));
    const h2 = a * h1 + h0;
    const k2 = a * k1 + k0;
    if (k2 > BigInt(maxDenominator)) break;
    h0 = h1;
    h1 = h2;
    k0 = k1;
    k1 = k2;
    const f = v - Math.floor(v);
    if (f < 1e-12) break;
    v = 1 / f;
  }
  return Q.of(h1, k1);
}
