/**
 * Cryptographic Salted Password Hashes & Strong Password Policy Engine
 * for the 69 Official @kas.sa Corporate Employees (مجموعة خالد السليم القابضة).
 *
 * SECURITY ARCHITECTURE:
 * - ZERO plaintext passwords are stored in source code or repository history.
 * - Each @kas.sa account is verified against a 256-round domain-salted SHA-256 digest.
 * - Excluded accounts (such as `o.saeed.hospitality@kas.sa` — مطبخ البوفيه) have NO hash and are permanently rejected.
 */

const KAS_PASSWORD_DOMAIN_SALT = 'KAS-ERP-STRONG-AUTH-2026-V2';
const KAS_PASSWORD_STRETCH_ROUNDS = 256;
const CUSTOM_PASSWORD_HASHES_STORAGE_KEY = 'ALSULAIM_STAFF_PASSWORD_HASHES_V1';

const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

/** Deterministic RFC 6234 SHA-256 hex digest (works identically in Browser, HTTP/HTTPS & Vitest jsdom). */
export function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLenHi = Math.floor((bytes.length * 8) / 0x100000000);
  const bitLenLo = (bytes.length * 8) >>> 0;
  const totalLen = ((bytes.length + 9 + 63) >> 6) << 6;
  const padded = new Uint8Array(totalLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 8, bitLenHi, false);
  view.setUint32(totalLen - 4, bitLenLo, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let offset = 0; offset < totalLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K256[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((v) => v.toString(16).padStart(8, '0'))
    .join('');
}

/** Computes the 256-round salted password digest for a given @kas.sa corporate email. */
export function computeKasPasswordDigest(email: string, password: string): string {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();
  let digest = sha256Hex(`${KAS_PASSWORD_DOMAIN_SALT}|${cleanEmail}|${cleanPass}`);
  for (let i = 1; i < KAS_PASSWORD_STRETCH_ROUNDS; i++) {
    digest = sha256Hex(`${digest}|${cleanEmail}`);
  }
  return digest;
}

/** Constant-time string comparison to prevent timing side-channels. */
function timingSafeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Authoritative Salted Password Hashes for the 69 Approved @kas.sa Accounts.
 * Note: `o.saeed.hospitality@kas.sa` is permanently excluded and absent from this map.
 */
export const KAS_EMPLOYEE_PASSWORD_HASHES: Readonly<Record<string, string>> = Object.freeze({
  'khalid@kas.sa': 'ff34f658502b381a3074e1edb4c57a58ff19709779813ad422d8c0787148f52c',
  'h.alsalim@kas.sa': 'a15aebc824ed5267129e1fc1b7112dfefcc72edcc57c90162c153a4be82ed8df',
  'n.alshetwi@kas.sa': 'd3e0b180c58d8a272758b82b918da3d62a24911b0e602fec789939ba3a808f3a',
  'a.salif.dev@kas.sa': '5940f9904b9e1eab033845c74e4036d5497a6114a95f868bfe73613820812393',
  'hr@kas.sa': 'bf0cc41690a091647c071eaaecaed89f21887aa21014945711a3f794f0ae12ef',
  'a.alanazi@kas.sa': 'b3cfae800f9191b6aa8e18d1a2d2228e689a5a8f8fe640836e5ec5b71e23ca7a',
  'a.alkinani.acc@kas.sa': '98c1b92c1203cfdc4caf8f57ca8b219bb71af2ad70dce05cd152771f6e6ce8f4',
  'a.eissa.acc@kas.sa': '6717aee164557984160193a39b527814b886008fa3806e6fb0d78840f568237b',
  'm.aljarm.acc@kas.sa': 'eaa64339f7da57e809a19f80b79974fe31105067bfc6eb9dd0452ed4e8291cad',
  'a.ibrahim.acc@kas.sa': 'cae33d109ae23de5b58172acc19458b73236dee973eb4ffac1fdf81ada41e1a7',
  'a.aljarm.imal@kas.sa': '881a46a296e54b354c7f6fe4cc85634cfcb45f40c73202644c5286ae72f11aec',
  'm.alata.trade@kas.sa': 'c9c3ac5cb32cd33f1681775bce8b6fde55f6e0e46ea32643756c4a90f5238721',
  'm.mohammed.acc@kas.sa': '113426622117949c0300fc4fa8f079eba33be0bf3c88159f9ff120090620567d',
  'h.hassan.safir@kas.sa': 'ab61d35d5a6411b483f57a5a470879e45acefad13eeb88e43bfe24dcd58f081e',
  'k.abdullatif.safir@kas.sa': '17f201f2141dbcde70571d167541e49aaacab4354febbd625bc70bf4598e3abb',
  's.ali.safir@kas.sa': 'cd6f1807d95e3f0f1ddc51bc1c6e84fa8fb41ae9eb41beb97f77daa0512a500c',
  'm.alabdullatif.topaz@kas.sa': '1ccb90ddb24b1ae55bdbd28469907103a099cacdafbba6cdf2399b887fdce0df',
  'a.eissa.topaz@kas.sa': '7abd2cfd16201ccf4c4e6877a3d25bd172fac1a6d41e61fa6f5e95f5986e5225',
  'i.hamdy.topaz@kas.sa': '85520a8516664839e7811f785ffe557535faf2686ec07722a3ddc888a352be07',
  'h.yousef.yaqoot@kas.sa': '7e78d0d79f2664fa0b9a6bb0a0f1cfcb3f6a923df0e2713c36f361f6165531f2',
  'r.othman.yaqoot@kas.sa': 'c300748027031a7e38063d69bacb42cdcab30f83301ee9b78f00cb3f797b241e',
  's.barakat.yaqoot@kas.sa': '667ded7071be162d668bd322ca808d5332f17bd45f83da43d1192077db0c7b5a',
  'a.abdelwahab.daralrowad@kas.sa': '4cf41ae98a1e9cb91d615d43ec49d68d75f58afbd68b9ddd2b1631a5e0d446eb',
  'h.alansari.daralrowad@kas.sa': 'a8f9d88a98b016f70fd556be1d8ca0b4e222080b8db2367df7c572ff5f08b366',
  'm.khalifa.sales@kas.sa': 'b3c733748f0301f36f9e54e41f8dd7f83a2849fe57320aa51aa9a1248fa225df',
  'm.alrahman.sales@kas.sa': '9d785677bdffe9fa4b8ed8a83f331bd64ab0ab4600433e0b1641308e9ae15214',
  'a.abdulhakim.sales@kas.sa': '271d150ea1274af982fcade1330bea17a77a0c75dbba761716b65a550e42ff4f',
  'r.elsayed.sales@kas.sa': 'aa0b0ebc415f8e625571fd62de34981f8bb739959e0b6954baa51edeed3a7de7',
  'a.allah.sales@kas.sa': '8d84167641caa9ed0cf1d2014e5e35497153b5b13e4026fa99f52434d35073ad',
  'm.hazzaa.sales@kas.sa': 'd683fb950b29b5928a27f9c580cc7afad221d1430ef86e4d0d0b619771d0ecab',
  'a.abubakar.sales@kas.sa': 'd8bd938ed794f2e02cd88fcb45128084dd977244f1207fc1b8218d36b4ff94ad',
  'm.fouda.followup@kas.sa': '56165ba932f3b5259c6e6712f4facd18a2ab14e9812aa6162c7aebe39c5ae88e',
  'i.mahmoud.followup@kas.sa': '524715e21085a7b65bb8b5ae17633a6f9a5e6794a51f365371626451e5aa43b6',
  'careers@kas.sa': 'c668c9fc43f609d896e434bed6d8208ff1aa577ee4bf08728f27d89d701856c2',
  'a.farahat@kas.sa': '884cebf37d9afdc8de706d4553e87ee51a83aa2fa81efcccbb6d3ef2fae2893e',
  'a.alazzam.housing@kas.sa': 'ffb4bcef12752f21a42f6bf77222358cd97c5b0f939b98e0e3fe1e29693a196e',
  'r.aljbr.housing@kas.sa': '7d1abaddfa70b99187a49584285030b98cf4015b2937e0e0edf52d5506f91b33',
  'l.sharabi.housing@kas.sa': '0e3618b908ce1236f9ce596285581fac9b39a0e7389857964a655eb3afca226d',
  'r.mohammed.housing@kas.sa': '3a2a7e4fd776afdbf695222e162ecbd6818ac7c6060a9a7e49636680381e1171',
  'f.ethiopian.housing@kas.sa': '7d2e0cbddaa68ec027d668035fcd3770a61a968e317766a8f547af8af426f98c',
  'c.gaspo.housing@kas.sa': '9cc59f2f8f982b71e73ca384e270a12da7e177dbde33bfe123a59d1987c52c26',
  'k.karini.housing@kas.sa': '31e9cb12c8709983a141003551179805b2ae88d901e06a5276aad01c65ba1c45',
  'm.housing.housing@kas.sa': '56dc38e3a2d004f2fce502773108c24274f1b4ec515b82879efad1a0ad3ab64e',
  'm.ahmed.housing@kas.sa': 'b53e31f9793804cfb7e45355e46d7faaa38aa2f99c6493c37a04eddd52fc0000',
  's.adebo.housing@kas.sa': '552e2761f03482b608fbcf2bf26bbd78119aea4baa0c1f856c75d8b3da5d753f',
  'l.lalis.housing@kas.sa': 'accb4bfd75b7c17c7caea56d13d4229eb8d5be8b8f95b767393aef746b74fc6d',
  'j.encajas.driver@kas.sa': '1a461a59060750bf917d57dff44c8087d9d77ae2d3ecd4ef95f62e8d8cef8c00',
  'm.rahman.driver@kas.sa': 'f69b413a5070f7969d1187d50cb79dfd7414faa7b0dca9254a0211a1c8ebae06',
  'a.hindi.driver@kas.sa': '2309bf0c08a441414d15056af2eee4d2c3e3939e8b75f13103b226fbc97f7dd5',
  'm.soliman.driver@kas.sa': 'c017c1fead6619d0ed9c7214181ca4e86240577c9119408996d270ab88b5cc5e',
  'm.alsaleh.imal@kas.sa': '8c125fdd7308e0d2b1b2174c192a5cc476a37df3007d349adbbf7cde82f92655',
  'g.hafez.imal@kas.sa': 'f18d956a61e6aefd6c9a7db29667a9c85e248d56bcc7fb00f361106e9902f030',
  'm.elsayed.imal@kas.sa': '1aa016e05216764cbf1bd09126d244dd7076debda1ea07846ecafe1045d986a9',
  'f.alhassan.trade@kas.sa': '1e47fe52fbd953571147bded3f966f454e76aaafefbb986d83bf7c4b0746e90b',
  'b.allaboudi.showroom@kas.sa': 'bfa56d65abf5deab2117956da90394cceb2fefe5a40f924922b78eb526f702a9',
  'm.ismail.trade@kas.sa': '072c15616f0cc1d5fb1994b56a4ff4969a7440a224e459ed3297b1ac709ac0ff',
  'h.salman.trade@kas.sa': 'aed6a17e18ec0934ebea493d5fa1f494b4b5d798b520c9b959dd5abdc1cd2ca7',
  'a.albashir.trade@kas.sa': '9c9e7140cf607d4853e63adfa01922c67070b3752904459c0fe24b51bf5c1d7f',
  'g.ahmed.trade@kas.sa': '07fa350fb92e227f7ff16e41d16494f3ebab3fa593ccea2bce8695fc0a3b68d9',
  'k.alshennawy.trade@kas.sa': '1fcec7b39891115c30b001495bc5ed5271dcf575fff2797dcbf68bec4947568b',
  'm.robel.trade@kas.sa': '8f648a3b640f51d959d9488a966e19a1e562efd46e622f58df8184d6e8ac8732',
  'b.pathan.trade@kas.sa': '54c881e7eb7e2673329261113213ec8c0f8c493851e611723e3822b862a6e68b',
  'mustafa.marketing@kas.sa': '1f44cecd5f6c0b451f088c337568aa9c653aa8d07d2ec771066beeed68d27f81',
  'm.alkhader.marketing@kas.sa': '57ec1ae42fb97dca3b35f9bc774c47b2496a67fb44e33d20f4133625663e99ba',
  'nagati.marketing@kas.sa': '6bba72fe84878806a47fac3405dd15b4cd9b5b3c67cee345202f53d88595edad',
  'm.almontaser.marketing@kas.sa': '53308588e74d18c67f1e2955f09aa6ca941c059337594e5346dad0cb4fae3fb5',
  'a.magdy.marketing@kas.sa': 'a213daf597fe1e27065c17be772cd7efb331f9b0a34eac34fdda4c703de5b201',
  'a.mirghani.marketing@kas.sa': '2eeebe048d3184ea1ae57ac532e6a68dd2f2245ba86a8ed828fb25b1c8ccc1ae',
  'feras.marketing@kas.sa': '5b65a831908d73c3eaca871cf798b150998b5881f4aaad461aa4c7087be1416c',
});

/** Validates corporate strong password complexity rules (>= 10 chars, upper, lower, digit, symbol). */
export function validateStrongPasswordPolicy(password: string): {
  valid: boolean;
  score: number;
  reason?: string;
} {
  const pwd = (password || '').trim();
  const hasMinLen = pwd.length >= 10;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasDigit = /[0-9]/.test(pwd);
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/.test(pwd);

  const score = [hasMinLen, hasUpper, hasLower, hasDigit, hasSymbol].filter(Boolean).length;

  if (!hasMinLen) {
    return { valid: false, score, reason: 'يجب ألا تقل كلمة المرور القوية عن 10 أحرف.' };
  }
  if (!hasUpper || !hasLower) {
    return { valid: false, score, reason: 'يجب أن تتضمن كلمة المرور أحرفاً إنجليزية كبيرة (A-Z) وصغيرة (a-z).' };
  }
  if (!hasDigit) {
    return { valid: false, score, reason: 'يجب أن تتضمن كلمة المرور رقماً واحداً على الأقل (0-9).' };
  }
  if (!hasSymbol) {
    return { valid: false, score, reason: 'يجب أن تتضمن كلمة المرور رمزاً خاصاً واحداً على الأقل مثل (!@#$%&*+=).' };
  }

  return { valid: true, score };
}

/** Generates a cryptographically strong 16-character password in the browser using WebCrypto. */
export function generateStrongClientPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*+=';
  const all = upper + lower + digits + symbols;

  const randIndex = (max: number): number => {
    const arr = new Uint32Array(1);
    globalThis.crypto.getRandomValues(arr);
    return arr[0] % max;
  };

  const chars = [
    upper[randIndex(upper.length)],
    upper[randIndex(upper.length)],
    upper[randIndex(upper.length)],
    lower[randIndex(lower.length)],
    lower[randIndex(lower.length)],
    lower[randIndex(lower.length)],
    digits[randIndex(digits.length)],
    digits[randIndex(digits.length)],
    digits[randIndex(digits.length)],
    symbols[randIndex(symbols.length)],
    symbols[randIndex(symbols.length)],
    symbols[randIndex(symbols.length)],
    all[randIndex(all.length)],
    all[randIndex(all.length)],
  ];

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return `Ks${chars.join('')}`;
}

export function getStoredCustomPasswordHashes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CUSTOM_PASSWORD_HASHES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return {};
}

export function saveCustomEmployeePassword(email: string, newPlainPassword: string): void {
  const cleanEmail = (email || '').trim().toLowerCase();
  const check = validateStrongPasswordPolicy(newPlainPassword);
  if (!check.valid) {
    throw new Error(check.reason || 'كلمة المرور الجديدة لا تستوفي معايير القوة المؤسسية.');
  }
  const digest = computeKasPasswordDigest(cleanEmail, newPlainPassword);
  try {
    const current = getStoredCustomPasswordHashes();
    current[cleanEmail] = digest;
    localStorage.setItem(CUSTOM_PASSWORD_HASHES_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore storage errors
  }
}

/** Verifies whether the supplied password matches the employee's active strong password (custom or issued). */
export function verifyKasEmployeePassword(email: string, password: string): boolean {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();
  if (!cleanEmail || !cleanPass) return false;

  const customHashes = getStoredCustomPasswordHashes();
  const expectedHash = customHashes[cleanEmail] || KAS_EMPLOYEE_PASSWORD_HASHES[cleanEmail];
  if (!expectedHash) return false;

  const actualDigest = computeKasPasswordDigest(cleanEmail, cleanPass);
  return timingSafeHexEqual(actualDigest, expectedHash);
}

/** Verifies specifically against either the active password OR the originally issued password hash. */
export function verifyInitialOrActiveKasPassword(email: string, password: string): boolean {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();
  if (!cleanEmail || !cleanPass) return false;

  const actualDigest = computeKasPasswordDigest(cleanEmail, cleanPass);
  const customHashes = getStoredCustomPasswordHashes();
  if (customHashes[cleanEmail] && timingSafeHexEqual(actualDigest, customHashes[cleanEmail])) {
    return true;
  }
  const issuedHash = KAS_EMPLOYEE_PASSWORD_HASHES[cleanEmail];
  return Boolean(issuedHash && timingSafeHexEqual(actualDigest, issuedHash));
}
