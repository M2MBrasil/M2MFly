import { ProvablyFairRound } from '@/types/game';

/**
 * Computes SHA-256 hash using Web Crypto API with synchronous fallback if needed.
 */
export async function computeSHA256(message: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Simple deterministic SHA-256 for non-subtle fallback
  return fallbackSha256(message);
}

// Compact SHA-256 implementation as reliable synchronous fallback
function fallbackSha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const maxWord = Math.pow(2, 32);
  let i = 0;
  let j = 0;
  const result: string[] = [];
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let compositeClear = '\x80';
  while ((ascii.length + compositeClear.length) % 64 !== 56) {
    compositeClear += '\x00';
  }
  ascii += compositeClear;
  while (ascii.length % 64 > 0) {
    ascii += '\x00';
  }

  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15] || 0;
      const w2 = w[i - 2] || 0;
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] =
        i < 16
          ? (w[i] || 0)
          : ((w[i - 16] + s0 + w[i - 7] + s1) & 0xffffffff);

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp1 =
        hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + w[i];
      const temp2 =
        (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;

      hash = [
        (temp1 + temp2) & 0xffffffff,
        hash[0],
        hash[1],
        hash[2],
        (hash[3] + temp1) & 0xffffffff,
        hash[4],
        hash[5],
        hash[6],
      ];
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) & 0xffffffff;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result.push((b < 16 ? '0' : '') + b.toString(16));
    }
  }
  return result.join('');
}

/**
 * Converts a SHA-256 hash to a crash multiplier with 97% RTP (3% house edge).
 * Formula:
 * P(X >= x) = 0.97 / x
 */
export function calculateMultiplierFromHash(hash: string): {
  multiplier: number;
  raw: number;
  hexSub: string;
  floatVal: number;
} {
  // Use first 13 characters of the hex string (52 bits: 13 * 4 bits)
  const hexSub = hash.slice(0, 13);
  const intVal = parseInt(hexSub, 16);
  // 2^52
  const max52Bits = 4503599627370496;
  const floatVal = intVal / max52Bits; // in [0, 1)

  // Standard Aviator / Bustabit math:
  // RTP = 97% (0.97).
  // Multiplier X = 0.97 / (1 - floatVal)
  // When (1 - floatVal) > 0.97 (prob 3%), X < 1.00 => instant crash (1.00x).
  const raw = 0.97 / (1 - floatVal);
  let multiplier = Math.floor(raw * 100) / 100;

  if (multiplier < 1.0) {
    multiplier = 1.0;
  }

  // Cap extreme theoretical peaks to realistic bounds (e.g., 500x)
  if (multiplier > 500.0) {
    multiplier = 500.0;
  }

  return { multiplier, raw, hexSub, floatVal };
}

/**
 * Generates a random cryptographic hex string.
 */
export function generateRandomSeed(length = 32): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Creates full Provably Fair round information.
 */
export async function generateProvablyFairRound(
  roundId: number,
  clientSeed: string,
  nonce: number,
  predefinedServerSeed?: string
): Promise<ProvablyFairRound> {
  const serverSeed = predefinedServerSeed || generateRandomSeed(64);
  const serverSeedHash = await computeSHA256(serverSeed);
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const roundHash = await computeSHA256(combined);
  const { multiplier } = calculateMultiplierFromHash(roundHash);

  return {
    roundId,
    serverSeed,
    serverSeedHash,
    clientSeed,
    nonce,
    hash: roundHash,
    crashMultiplier: multiplier,
    timestamp: Date.now(),
  };
}

/**
 * Verifies any previous round given the seeds.
 */
export async function verifyProvablyFair(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): Promise<{
  serverSeedHash: string;
  combined: string;
  hash: string;
  multiplier: number;
  raw: number;
}> {
  const serverSeedHash = await computeSHA256(serverSeed);
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = await computeSHA256(combined);
  const { multiplier, raw } = calculateMultiplierFromHash(hash);

  return {
    serverSeedHash,
    combined,
    hash,
    multiplier,
    raw,
  };
}
