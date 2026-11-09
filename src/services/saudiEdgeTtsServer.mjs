import fs from 'node:fs';
import path from 'node:path';
import WebSocket from 'ws';
import crypto from 'node:crypto';

const TRUSTED_CLIENT_TOKEN = process.env.EDGE_TTS_TRUSTED_CLIENT_TOKEN || '';
const CHROMIUM_FULL_VERSION = '143.0.3650.75';
const CHROMIUM_MAJOR_VERSION = '143';
const SEC_MS_GEC_VERSION = `2-${CHROMIUM_FULL_VERSION}`;
const WIN_EPOCH = 11644473600;

const _SHA256_INITIAL = [
  0x6A09E667n, 0xBB67AE85n, 0x3C6EF372n, 0xA54FF53An,
  0x510E527Fn, 0x9B05688Cn, 0x1F83D9ABn, 0x5BE0CD19n,
];
const _SHA256_STATE = [
  0xFD9FBEA2n, 0x91243CE7n, 0xBE499094n, 0xCD2E1E0An,
  0x6C006F49n, 0x04BD35ABn, 0xFEB0A7E4n, 0x03EFFBD2n,
];
const _SHA256_SCHEDULE = [
  0xEB24BF9En, 0x1558691Fn, 0xA0C09EE2n, 0x0CFA32BAn,
  0xA622EE8Cn, 0xD1DD9491n, 0xC0DD25A0n, 0xF9E70AB6n,
  0xF0C31573n, 0x7058CE4En, 0x7188E606n, 0x00E5AB33n,
  0xD258B060n, 0x72766564n,
];
const _SHA256_ROUND_CONSTANTS = [
  0x428A2F98n, 0x71374491n, 0xB5C0FBCFn, 0xE9B5DBA5n,
  0x3956C25Bn, 0x59F111F1n, 0x923F82A4n, 0xAB1C5ED5n,
  0xD807AA98n, 0x12835B01n, 0x243185BEn, 0x550C7DC3n,
  0x72BE5D74n, 0x80DEB1FEn, 0x9BDC06A7n, 0xC19BF174n,
  0xE49B69C1n, 0xEFBE4786n, 0x0FC19DC6n, 0x240CA1CCn,
  0x2DE92C6Fn, 0x4A7484AAn, 0x5CB0A9DCn, 0x76F988DAn,
  0x983E5152n, 0xA831C66Dn, 0xB00327C8n, 0xBF597FC7n,
  0xC6E00BF3n, 0xD5A79147n, 0x06CA6351n, 0x14292967n,
  0x27B70A85n, 0x2E1B2138n, 0x4D2C6DFCn, 0x53380D13n,
  0x650A7354n, 0x766A0ABBn, 0x81C2C92En, 0x92722C85n,
  0xA2BFE8A1n, 0xA81A664Bn, 0xC24B8B70n, 0xC76C51A3n,
  0xD192E819n, 0xD6990624n, 0xF40E3585n, 0x106AA070n,
  0x19A4C116n, 0x1E376C08n, 0x2748774Cn, 0x34B0BCB5n,
  0x391C0CB3n, 0x4ED8AA4An, 0x5B9CCA4Fn, 0x682E6FF3n,
  0x748F82EEn, 0x78A5636Fn, 0x84C87814n, 0x8CC70208n,
  0x90BEFFFAn, 0xA4506CEBn, 0xBEF9A3F7n, 0xC67178F2n,
];
const _SHA256_ADJUSTMENT = 0xC9DC06A7n;
const _SHA256_BLOCK_CONSTANTS = [
  ..._SHA256_ROUND_CONSTANTS.slice(0, 14),
  _SHA256_ADJUSTMENT,
  ..._SHA256_ROUND_CONSTANTS.slice(15),
];
const _SHA256_SIGMA0_ADJUSTMENT = 0x059C0B80n;
const _SHA256_SIGMA1_ADJUSTMENT = 0x000B92C0n;

const _CS64_COEFFICIENTS = [
  [0xE82E91B1n, 0xB32700D0n],
  [0x44DE24C6n, 0x88DFF51Dn],
  [0x3BEB65BCn, 0x29514038n],
  [0xC89C5933n, 0xB328CBDFn],
  [0x8D1EC211n, 0xD405B4D5n],
  [0x314EF5D5n, 0x26E55F3Cn],
  [0xE92491B1n, 0x607801C6n],
  [0xF0A5B9D5n, 0x82B2C1FBn],
  [0x06064CF3n, 0xFA51A3DAn],
  [0xDA79FA60n, 0x207CC464n],
  [0xBED20560n, 0x3C3C74F3n],
  [0x89F9C9F8n, 0xD2D14B61n],
  [0x35FA38C6n, 0xBB04A2C1n],
  [0xCB49E3C6n, 0xC5626167n],
];
const _CS64_FACTOR = 0x82893933n;
const _CS64_ADJUSTMENT0 = 0xF2F90B1An;
const _CS64_ADJUSTMENT1 = 0x0B1A0000n;
const _U32_MASK = 0xFFFFFFFFn;

const ttsServerCache = new Map();

function _rol16(value) {
  const v = value & _U32_MASK;
  return ((v << 16n) | (v >> 16n)) & _U32_MASK;
}

function _words_le4_even(data) {
  const padLen = (4 - (data.length % 4)) % 4;
  const padded = Buffer.concat([data, Buffer.alloc(padLen)]);
  if (!padded.length) return [];
  const words = [];
  for (let i = 0; i < padded.length; i += 4) {
    words.push(BigInt(padded.readUInt32LE(i)));
  }
  if (words.length % 2 !== 0) words.push(0n);
  return words;
}

function _sigma0(value) {
  return (
    (value >> 7n) ^ (value << 25n) ^ (value >> 18n) ^ (value << 14n) ^ (value >> 3n)
  ) & _U32_MASK;
}

function _sigma1(value) {
  return (
    (value >> 17n) ^ (value << 15n) ^ (value >> 19n) ^ (value << 13n) ^ (value >> 10n)
  ) & _U32_MASK;
}

function _sha256_rounds(state, words, first_round = 0) {
  let [a, b, c, d, e, f, g, h] = state;
  const mask = _U32_MASK;
  const constants = first_round === 14 ? _SHA256_BLOCK_CONSTANTS : _SHA256_ROUND_CONSTANTS;
  for (let index = first_round; index < 64; index++) {
    const rot_e = e * 0x100000001n;
    const rot_a = a * 0x100000001n;
    const t1 =
      h +
      ((rot_e >> 6n) ^ (rot_e >> 11n) ^ (rot_e >> 25n)) +
      (g ^ (e & (f ^ g))) +
      constants[index] +
      words[index];
    const t2 =
      ((rot_a >> 2n) ^ (rot_a >> 13n) ^ (rot_a >> 22n)) +
      ((a & b) | (c & (a | b)));
    h = g;
    g = f;
    f = e;
    e = (d + t1) & mask;
    d = c;
    c = b;
    b = a;
    a = (t1 + t2) & mask;
  }
  return [a, b, c, d, e, f, g, h];
}

function _expand_sha256_schedule(words, first_word = 16) {
  const mask = _U32_MASK;
  for (let index = first_word; index < 64; index++) {
    const x = words[index - 2];
    const y = words[index - 15];
    const sigma1 = (x >> 17n) ^ (x << 15n) ^ (x >> 19n) ^ (x << 13n) ^ (x >> 10n);
    const sigma0 = (y >> 7n) ^ (y << 25n) ^ (y >> 18n) ^ (y << 14n) ^ (y >> 3n);
    words.push((sigma1 + words[index - 7] + sigma0 + words[index - 16]) & mask);
  }
}

function _sha256_init(data) {
  const mask = _U32_MASK;
  const w14 = BigInt((data[0] << 16) | (data[1] << 8) | data[2]);
  const w15 = BigInt(data.readUInt32BE(3));
  const words = [...new Array(14).fill(0n), w14, w15];
  for (let index = 16; index < 30; index++) {
    let value = _SHA256_SCHEDULE[index - 16];
    if (index - 2 >= 14) {
      value += index === 16
        ? (_sigma1(words[index - 2]) ^ _SHA256_SIGMA1_ADJUSTMENT)
        : _sigma1(words[index - 2]);
    }
    if (index - 7 >= 14) {
      value += words[index - 7];
    }
    if (index - 15 >= 14) {
      value += index === 29
        ? (_sigma0(words[index - 15]) ^ _SHA256_SIGMA0_ADJUSTMENT)
        : _sigma0(words[index - 15]);
    }
    words.push(value & mask);
  }
  words.push(
    (
      _sigma1(words[28]) +
      words[23] +
      _sigma0(words[15]) +
      words[14] +
      _SHA256_ADJUSTMENT -
      _SHA256_ROUND_CONSTANTS[14]
    ) & mask
  );
  _expand_sha256_schedule(words, 31);
  const working = _sha256_rounds(_SHA256_STATE, words, 14);
  return _SHA256_INITIAL.map((x, i) => (x + working[i]) & mask);
}

function _sha256_digest(data) {
  const mask = _U32_MASK;
  const length = 57 + data.length;
  const zeroPadLen = (((55 - length) % 64) + 64) % 64;
  const lenBuf = Buffer.alloc(8);
  lenBuf.writeBigUInt64BE(BigInt(length * 8));
  const padded = Buffer.concat([
    data.subarray(7),
    Buffer.from([0x80]),
    Buffer.alloc(zeroPadLen),
    lenBuf,
  ]);
  let state = _sha256_init(data.subarray(0, 7));
  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = [];
    for (let i = 0; i < 64; i += 4) {
      words.push(BigInt(padded.readUInt32BE(offset + i)));
    }
    _expand_sha256_schedule(words);
    const working = _sha256_rounds(state, words);
    state = state.map((x, i) => (x + working[i]) & mask);
  }
  const out = Buffer.alloc(32);
  state.forEach((word, i) => out.writeUInt32BE(Number(word), i * 4));
  return out;
}

function _cs64_digest(data, digest) {
  const mask = _U32_MASK;
  let key_a = BigInt(digest.readUInt32LE(0)) | 1n;
  let key_b = BigInt(digest.readUInt32LE(4)) | 1n;
  const factors = [
    (key_a * _CS64_FACTOR) & mask,
    (key_b * _CS64_FACTOR) & mask,
  ];
  const terms = _CS64_COEFFICIENTS.map(([coeff], index) => (coeff * factors[index % 2]) & mask);
  const offsets = _CS64_COEFFICIENTS.map(([, offset]) => offset);
  const words = _words_le4_even(Buffer.concat([Buffer.from([0x00]), data]));
  words.forEach((word, index) => {
    let term = word * (index % 2 === 0 ? key_a : key_b);
    let offset = _rol16(word) * (index % 2 === 0 ? 0xEF0569FBn : 0xC31713DBn);
    if (index === 0) {
      term += _CS64_ADJUSTMENT0 * factors[0];
      offset += _CS64_ADJUSTMENT1;
    }
    terms.push(term & mask);
    offsets.push(offset & mask);
  });

  let swap_acc = 0n;
  let swap_last = 0n;
  let state = 0n;
  let acc = 0n;
  for (let index = 0; index < terms.length; index += 2) {
    const x = terms[index];
    const y = terms[index + 1];
    let t = _rol16((offsets[index] + x) & mask);
    let q = (t * 0x76F50F34n) & mask;
    swap_acc += (_rol16(q) * 0xC3EFEA97n + q) & mask;
    t = _rol16((offsets[index + 1] + y) & mask);
    q = (t * 0x1881CE3Cn) & mask;
    swap_last = (_rol16(q) * 0x35BD1EC9n + q) & mask;
    swap_acc = (swap_acc + swap_last) & mask;

    state = (state * key_a + x) & mask;
    state = (_rol16(state) * 0xCF98B111n) & mask;
    state = (_rol16(state) * 0x87085B9Fn) & mask;
    state = (_rol16(state) * 0x12CEB96Dn) & mask;
    state = (_rol16(state) * 0x257E1D83n) & mask;
    acc += state;
    t = (state * key_b + y) & mask;
    t = (_rol16(t) * 0xA27416F5n) & mask;
    t = (_rol16(t) * 0xD38396FFn) & mask;
    state = (_rol16((_rol16(t) * 0x7C932B89n) & mask) * 0xBFA49F69n) & mask;
    acc = (acc + state) & mask;
  }
  return [(swap_last ^ state) & mask, (swap_acc ^ acc) & mask];
}

export function generateSecMsGecV2(clockSkewSeconds = 0) {
  let ticks = Math.floor(Date.now() / 1000 + clockSkewSeconds) + WIN_EPOCH;
  ticks -= ticks % 300;
  const ticks100ns = BigInt(ticks) * 10000000n;
  const strToHash = Buffer.from(`${ticks100ns.toString()}${TRUSTED_CLIENT_TOKEN}`, 'ascii');
  const digest = _sha256_digest(strToHash);
  const [cs0, cs1] = _cs64_digest(strToHash, digest);
  const csBuf = Buffer.alloc(8);
  csBuf.writeUInt32LE(Number(cs0), 0);
  csBuf.writeUInt32LE(Number(cs1), 4);
  return `${csBuf.toString('hex').toUpperCase()}-${digest.toString('hex').toUpperCase()}`;
}

function escapeXmlText(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function synthesizeOnce(text, persona, timeoutMs = 5500) {
  const gec = generateSecMsGecV2(0);
  const connId = crypto.randomBytes(16).toString('hex');
  const muid = crypto.randomBytes(16).toString('hex').toUpperCase();
  const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connId}`;

  const voice = persona === 'faris' ? 'ar-SA-HamedNeural' : 'ar-SA-ZariyahNeural';
  const pitch = persona === 'faris' ? '+0Hz' : '+2Hz';
  const rate = persona === 'faris' ? '+4%' : '+3%';

  return new Promise((resolve, reject) => {
    let settled = false;
    const ws = new WebSocket(url, {
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': `muid=${muid};`,
      },
    });

    const audioChunks = [];
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch (_) {}
      reject(new Error('Saudi Neural TTS timeout'));
    }, timeoutMs);

    ws.on('open', () => {
      const reqId = crypto.randomBytes(16).toString('hex');
      ws.send(
        `X-Timestamp:${new Date().toString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`
      );
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ar-SA'><voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='+0%'>${escapeXmlText(text)}</prosody></voice></speak>`;
      ws.send(
        `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toString()}Z\r\nPath:ssml\r\n\r\n${ssml}`
      );
    });

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        const buf = Buffer.from(data);
        if (buf.length >= 2) {
          const headerLen = buf.readUInt16BE(0);
          const headerStr = buf.subarray(2, 2 + headerLen).toString('utf8');
          if (headerStr.includes('Path:audio')) {
            audioChunks.push(buf.subarray(2 + headerLen));
          }
        }
      } else {
        const msg = data.toString('utf8');
        if (msg.includes('Path:turn.end')) {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          try { ws.close(); } catch (_) {}
          const fullAudio = Buffer.concat(audioChunks);
          if (fullAudio.length > 0) {
            resolve(fullAudio);
          } else {
            reject(new Error('Empty audio stream from Edge TTS'));
          }
        }
      }
    });

    ws.on('unexpected-response', (req, res) => {
      try { req?.on?.('error', () => {}); } catch (_) {}
      try { res?.on?.('error', () => {}); } catch (_) {}
      try { res?.socket?.on?.('error', () => {}); } catch (_) {}
      try { res?.resume?.(); } catch (_) {}
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error(`Edge TTS unexpected HTTP ${res?.statusCode}`));
    });

    ws.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export async function synthesizeSaudiEdgeTts(text, persona = 'faris') {
  const cacheKey = `${persona}:${text}`;
  const cached = ttsServerCache.get(cacheKey);
  if (cached) return cached;

  let fullAudio = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fullAudio = await synthesizeOnce(text, persona, attempt === 0 ? 5000 : 6500);
      if (fullAudio && fullAudio.length > 0) break;
    } catch (err) {
      if (attempt === 1) {
        try {
          const fallbackFile = path.resolve(
            process.cwd(),
            'public',
            'audio',
            persona === 'faris' ? 'faris_switch.mp3' : 'noura_switch.mp3'
          );
          if (fs.existsSync(fallbackFile)) {
            return fs.readFileSync(fallbackFile);
          }
        } catch (_) {}
        throw err;
      }
    }
  }

  if (ttsServerCache.size >= 150) {
    const firstKey = ttsServerCache.keys().next().value;
    if (firstKey) ttsServerCache.delete(firstKey);
  }
  ttsServerCache.set(cacheKey, fullAudio);
  return fullAudio;
}
