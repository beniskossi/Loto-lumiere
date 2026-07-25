export class PCG32 {
  private state: bigint;
  private inc: bigint;

  constructor(seed: bigint, seq: bigint = 1n) {
    this.state = 0n;
    this.inc = (seq << 1n) | 1n;
    this.random();
    this.state = this.state + seed;
    this.random();
  }

  random(): number {
    const oldState = this.state;
    this.state = oldState * 6364136223846793005n + this.inc;
    // Need to emulate 64-bit unsigned arithmetic
    this.state = BigInt.asUintN(64, this.state);

    const xorshifted = BigInt.asUintN(32, ((oldState >> 18n) ^ oldState) >> 27n);
    const rot = Number(oldState >> 59n);
    const rotated = (Number(xorshifted) >>> rot) | (Number(xorshifted) << ((32 - rot) & 31));
    return (rotated >>> 0) / 4294967296.0;
  }
}
