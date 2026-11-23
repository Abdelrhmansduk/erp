import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

export const FIXED_HR_FROM_EMAIL = 'HR@kas.sa';
export const FIXED_HR_FROM_NAME = 'Reem Bin Hussain - HR';
export const MANDATORY_HR_CC_EMAIL = 'Khalid@kas.sa';
export const KAS_GROUP_LOGO_CID = 'kas-group-logo@kas.sa';

const EXCLUDED_EMAILS = new Set(['o.saeed.hospitality@kas.sa']);
const LOCAL_GATEWAY_CONFIG_FILE = '.hr-mail-gateway.local';

function sanitizeHeaderValue(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

export function sanitizeRecipientEmails(emails, fallbackEmails = []) {
  const source = Array.isArray(emails) ? emails : [];
  const seen = new Set();
  const clean = [];

  for (const raw of source) {
    const email = sanitizeHeaderValue(raw);
    const lower = email.toLowerCase();
    if (!email || !email.includes('@') || EXCLUDED_EMAILS.has(lower) || seen.has(lower)) {
      continue;
    }
    seen.add(lower);
    clean.push(email);
  }

  if (clean.length === 0 && fallbackEmails.length > 0) {
    for (const fb of fallbackEmails) {
      const email = sanitizeHeaderValue(fb);
      const lower = email.toLowerCase();
      if (email && !EXCLUDED_EMAILS.has(lower) && !seen.has(lower)) {
        seen.add(lower);
        clean.push(email);
      }
    }
  }

  return clean;
}

export function enforceMandatoryCc(ccEmails) {
  const cleaned = sanitizeRecipientEmails(ccEmails || []);
  const hasMandatory = cleaned.some(
    (e) => e.toLowerCase() === MANDATORY_HR_CC_EMAIL.toLowerCase()
  );
  return hasMandatory ? cleaned : [MANDATORY_HR_CC_EMAIL, ...cleaned];
}

function getGatewayConfigPath() {
  return path.resolve(process.cwd(), LOCAL_GATEWAY_CONFIG_FILE);
}

const SAFE_ASCII_CHARS = Array.from({ length: 128 }, (_, code) => String.fromCharCode(code));

function reconstructSafeAscii(rawValue) {
  const str = String(rawValue ?? '');
  const len = str.length;
  let out = '';
  for (let i = 0; i < len; i += 1) {
    const code = str.charCodeAt(i);
    if (code >= 32 && code < 127) {
      out += SAFE_ASCII_CHARS[code];
    }
  }
  return out.trim();
}

function readLocalGatewayFile() {
  try {
    const filePath = getGatewayConfigPath();
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return {
      provider: reconstructSafeAscii(parsed.provider),
      tenantId: reconstructSafeAscii(parsed.tenantId),
      clientId: reconstructSafeAscii(parsed.clientId),
      clientSecret: reconstructSafeAscii(parsed.clientSecret),
      graphAccessToken: reconstructSafeAscii(parsed.graphAccessToken),
      smtpHost: reconstructSafeAscii(parsed.smtpHost),
      smtpPort: parsed.smtpPort !== undefined ? Number(parsed.smtpPort) || 587 : undefined,
      smtpSecure: parsed.smtpSecure !== undefined ? Boolean(parsed.smtpSecure) : undefined,
      smtpUser: reconstructSafeAscii(parsed.smtpUser),
      smtpPass: reconstructSafeAscii(parsed.smtpPass),
      resendApiKey: reconstructSafeAscii(parsed.resendApiKey),
      resendFromEmail: reconstructSafeAscii(parsed.resendFromEmail),
    };
  } catch {
    return {};
  }
}

export function saveLocalGatewayConfig(config) {
  const existing = readLocalGatewayFile();
  const next = {
    provider: config.provider || existing.provider || 'smtp',
    tenantId: sanitizeHeaderValue(config.tenantId ?? existing.tenantId ?? ''),
    clientId: sanitizeHeaderValue(config.clientId ?? existing.clientId ?? ''),
    clientSecret:
      config.clientSecret !== undefined && config.clientSecret !== ''
        ? String(config.clientSecret)
        : existing.clientSecret || '',
    graphAccessToken:
      config.graphAccessToken !== undefined && config.graphAccessToken !== ''
        ? String(config.graphAccessToken)
        : existing.graphAccessToken || '',
    smtpHost: sanitizeHeaderValue(config.smtpHost ?? existing.smtpHost ?? 'smtp.office365.com') || 'smtp.office365.com',
    smtpPort: Number(config.smtpPort ?? existing.smtpPort ?? 587) || 587,
    smtpSecure: Boolean(config.smtpSecure ?? existing.smtpSecure ?? false),
    smtpUser: sanitizeHeaderValue(config.smtpUser ?? existing.smtpUser ?? FIXED_HR_FROM_EMAIL) || FIXED_HR_FROM_EMAIL,
    smtpPass:
      config.smtpPass !== undefined && config.smtpPass !== ''
        ? String(config.smtpPass)
        : existing.smtpPass || '',
    resendApiKey:
      config.resendApiKey !== undefined && config.resendApiKey !== ''
        ? String(config.resendApiKey)
        : existing.resendApiKey || '',
    resendFromEmail: sanitizeHeaderValue(
      config.resendFromEmail ?? existing.resendFromEmail ?? 'HR@kas-erp.com'
    ) || 'HR@kas-erp.com',
    updatedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(getGatewayConfigPath(), JSON.stringify(next, null, 2), 'utf8');
  } catch (err) {
    const e = new Error(
      'تعذر حفظ ملف إعدادات البريد المحلي في بيئة التشغيل الحالية؛ يُرجى ضبط متغيرات البيئة (HR_SMTP_* أو AZURE_*) في إعدادات الخادم.',
      { cause: err }
    );
    e.code = 'GATEWAY_STORAGE_READONLY';
    throw e;
  }

  return getMaskedGatewayStatus(next);
}

export function loadEffectiveGatewayConfig(overrideConfig = null) {
  const localCfg = readLocalGatewayFile();
  const env = process.env;

  const pick = (overrideVal, localVal, envVal, fallback = '') => {
    if (overrideVal !== undefined && overrideVal !== null && String(overrideVal).trim() !== '') {
      return overrideVal;
    }
    if (localVal !== undefined && localVal !== null && String(localVal).trim() !== '') {
      return localVal;
    }
    if (envVal !== undefined && envVal !== null && String(envVal).trim() !== '') {
      return envVal;
    }
    return fallback;
  };

  const smtpPortRaw = pick(
    overrideConfig?.smtpPort,
    localCfg.smtpPort,
    env.HR_SMTP_PORT,
    '587'
  );
  const smtpPort = Number(smtpPortRaw) || 587;

  const smtpSecureRaw =
    overrideConfig?.smtpSecure ??
    localCfg.smtpSecure ??
    (env.HR_SMTP_SECURE ? env.HR_SMTP_SECURE === 'true' : smtpPort === 465);

  const tlsRejectRaw =
    overrideConfig?.tlsRejectUnauthorized ??
    (env.HR_SMTP_TLS_REJECT_UNAUTHORIZED
      ? env.HR_SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
      : true);

  return {
    provider: sanitizeHeaderValue(
      pick(overrideConfig?.provider, localCfg.provider, env.HR_MAIL_PROVIDER, '')
    ).toLowerCase(),
    tenantId: sanitizeHeaderValue(
      pick(
        overrideConfig?.tenantId,
        localCfg.tenantId,
        env.HR_MAIL_TENANT_ID || env.AZURE_TENANT_ID,
        ''
      )
    ),
    clientId: sanitizeHeaderValue(
      pick(
        overrideConfig?.clientId,
        localCfg.clientId,
        env.HR_MAIL_CLIENT_ID || env.AZURE_CLIENT_ID,
        ''
      )
    ),
    clientSecret: String(
      pick(
        overrideConfig?.clientSecret,
        localCfg.clientSecret,
        env.HR_MAIL_CLIENT_SECRET || env.AZURE_CLIENT_SECRET,
        ''
      )
    ),
    graphAccessToken: String(
      pick(
        overrideConfig?.graphAccessToken,
        localCfg.graphAccessToken,
        env.HR_MAIL_GRAPH_ACCESS_TOKEN,
        ''
      )
    ),
    smtpHost: sanitizeHeaderValue(
      pick(overrideConfig?.smtpHost, localCfg.smtpHost, env.HR_SMTP_HOST, '')
    ),
    smtpPort,
    smtpSecure: Boolean(smtpSecureRaw),
    smtpUser: sanitizeHeaderValue(
      pick(overrideConfig?.smtpUser, localCfg.smtpUser, env.HR_SMTP_USER, FIXED_HR_FROM_EMAIL)
    ),
    smtpPass: String(
      pick(overrideConfig?.smtpPass, localCfg.smtpPass, env.HR_SMTP_PASS, '')
    ),
    resendApiKey: String(
      pick(overrideConfig?.resendApiKey, localCfg.resendApiKey, env.RESEND_API_KEY, '')
    ),
    resendFromEmail: sanitizeHeaderValue(
      pick(
        overrideConfig?.resendFromEmail,
        localCfg.resendFromEmail,
        env.RESEND_FROM_EMAIL,
        'HR@kas-erp.com'
      )
    ),
    tlsRejectUnauthorized: Boolean(tlsRejectRaw),
    source: Object.keys(localCfg).length > 0 ? 'local_gateway_file' : 'environment',
  };
}

export function resolveActiveProvider(cfg) {
  const hasGraph = Boolean(
    cfg.graphAccessToken || (cfg.tenantId && cfg.clientId && cfg.clientSecret)
  );
  const effectiveSmtpHost = cfg.smtpHost || (cfg.smtpPass ? 'smtp.office365.com' : '');
  const hasSmtp = Boolean(effectiveSmtpHost && cfg.smtpUser && cfg.smtpPass);
  const hasResend = Boolean(cfg.resendApiKey);

  if (cfg.provider === 'microsoft_graph' && hasGraph) return 'microsoft_graph';
  if (cfg.provider === 'smtp' && hasSmtp) return 'smtp';
  if (cfg.provider === 'resend' && hasResend) return 'resend';

  if (hasGraph) return 'microsoft_graph';
  if (hasSmtp) return 'smtp';
  if (hasResend) return 'resend';
  return 'none';
}

export function getMaskedGatewayStatus(inputConfig = null) {
  const cfg = loadEffectiveGatewayConfig(inputConfig);
  const activeProvider = resolveActiveProvider(cfg);
  const tenantHint = cfg.tenantId
    ? `${cfg.tenantId.slice(0, 6)}...${cfg.tenantId.slice(-4)}`
    : '';

  return {
    configured: activeProvider !== 'none',
    activeProvider,
    fromEmail: FIXED_HR_FROM_EMAIL,
    fromName: FIXED_HR_FROM_NAME,
    mandatoryCc: MANDATORY_HR_CC_EMAIL,
    smtpHost: cfg.smtpHost || 'smtp.office365.com',
    smtpPort: cfg.smtpPort || 587,
    smtpSecure: Boolean(cfg.smtpSecure),
    smtpUser: cfg.smtpUser || FIXED_HR_FROM_EMAIL,
    hasSmtpPassword: Boolean(cfg.smtpPass),
    hasGraphCredentials: Boolean(
      cfg.graphAccessToken || (cfg.tenantId && cfg.clientId && cfg.clientSecret)
    ),
    hasResendKey: Boolean(cfg.resendApiKey),
    tenantIdHint: tenantHint,
    source: cfg.source,
  };
}

function loadOfficialGroupLogoBase64(providedBase64) {
  if (typeof providedBase64 === 'string' && providedBase64.trim().length > 100) {
    return reconstructSafeAscii(
      providedBase64.replace(/^data:image\/png;base64,/i, '').replace(/[\r\n\s]+/g, '')
    );
  }
  const candidates = [
    path.resolve(process.cwd(), 'public/logos/khalid-alsulaim-trading-group.png'),
    path.resolve(process.cwd(), 'public/logos/group-logo.png'),
  ];
  for (const filePath of candidates) {
    try {
      const b64 = fs.readFileSync(filePath).toString('base64');
      if (b64.length > 0) {
        return reconstructSafeAscii(b64);
      }
    } catch {
      // keep trying
    }
  }
  return '';
}

function wrapBase64Lines(base64Str, lineLen = 76) {
  const clean = String(base64Str || '').replace(/[\r\n\s]+/g, '');
  const lines = [];
  for (let i = 0; i < clean.length; i += lineLen) {
    lines.push(clean.slice(i, i + lineLen));
  }
  return lines.join('\r\n');
}

function encodeQuotedPrintableUtf8(str) {
  const bytes = Buffer.from(String(str || ''), 'utf8');
  const lines = [];
  let line = '';
  for (const b of bytes) {
    if (b === 0x0d) continue;
    if (b === 0x0a) {
      lines.push(line);
      line = '';
      continue;
    }
    const token =
      b === 0x09 || (b >= 0x20 && b <= 0x7e && b !== 0x3d)
        ? String.fromCharCode(b)
        : `=${b.toString(16).toUpperCase().padStart(2, '0')}`;
    if (line.length + token.length > 74) {
      lines.push(`${line}=`);
      line = token;
    } else {
      line += token;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines.join('\r\n');
}

function ensureSignatureInHtml(htmlBody, cidSrc = `cid:${KAS_GROUP_LOGO_CID}`, includeReemSignature = true) {
  const raw = String(htmlBody || '').trim();
  if (includeReemSignature === false) {
    return raw;
  }
  if (raw.includes('Reem Bin Hussain') && raw.includes('International HR &amp; Talent Acquisition Consultant')) {
    return raw;
  }
  const signatureBlock = `
<div dir="ltr" align="left" style="margin-top:20px;padding-top:14px;border-top:1px solid #E0E0E0;font-family:'Times New Roman',Times,Georgia,serif;color:#141414;text-align:left;direction:ltr;background-color:#FFFFFF;">
  <div dir="ltr" align="left" style="margin-bottom:10px;background-color:#FFFFFF;display:inline-block;padding:4px 8px;border-radius:6px;text-align:left;direction:ltr;"><img src="${cidSrc}" alt="KHALID AL-SULAIM TRADING GROUP" width="135" style="display:block;border:0;height:auto;background-color:#FFFFFF;" /></div>
  <div dir="ltr" align="left" style="font-size:15px;line-height:1.6;text-align:left;direction:ltr;">
    <div dir="ltr" align="left" style="text-align:left;direction:ltr;">Reem Bin Hussain</div>
    <div dir="ltr" align="left" style="text-align:left;direction:ltr;">International HR &amp; Talent Acquisition Consultant</div>
    <div dir="ltr" align="left" style="text-align:left;direction:ltr;">Email: <a href="mailto:HR@kas.sa" style="color:#141414;text-decoration:none;">HR@kas.sa</a></div>
    <div dir="ltr" align="left" style="text-align:left;direction:ltr;">Mobile: +966 553452122</div>
  </div>
</div>`;
  return raw ? `${raw}${signatureBlock}` : signatureBlock;
}

function ensureSignatureInPlainText(plainText, includeReemSignature = true) {
  const raw = String(plainText || '').trim();
  if (includeReemSignature === false) {
    return raw;
  }
  if (raw.includes('Reem Bin Hussain') && raw.includes('Mobile: +966 553452122')) {
    return raw;
  }
  const footer = [
    '\u200EReem Bin Hussain\u200E',
    '\u200EInternational HR & Talent Acquisition Consultant\u200E',
    '\u200EEmail: HR@kas.sa\u200E',
    '\u200EMobile: +966 553452122\u200E',
  ].join('\r\n');
  return raw ? `${raw}\r\n\r\n${footer}` : footer;
}

export function buildServerLiveMimeMessage({
  subject,
  toEmails,
  ccEmails,
  cidHtmlBody,
  plainTextBody,
  inlineLogoBase64,
  attachments,
  messageId,
  liveMimeMessage,
  includeUnsentHeader = false,
  includeReemSignature = true,
}) {
  if (typeof liveMimeMessage === 'string' && liveMimeMessage.trim().length > 80) {
    const cleaned = liveMimeMessage
      .replace(/^X-Unsent:.*\r?\n/gim, '')
      .replace(/\r?\n/g, '\r\n');
    const withUnsent = includeUnsentHeader ? `X-Unsent: 1\r\n${cleaned}` : cleaned;
    return withUnsent.endsWith('\r\n') ? withUnsent : `${withUnsent}\r\n`;
  }

  const rand = crypto.randomBytes(6).toString('hex');
  const mixedBoundary = `----=_NextPart_Mixed_KAS_LIVE_${rand}`;
  const relatedBoundary = `----=_NextPart_Related_KAS_LIVE_${rand}`;
  const altBoundary = `----=_NextPart_Alt_KAS_LIVE_${rand}`;

  const cleanSubject = sanitizeHeaderValue(
    subject || 'Official HR Correspondence - HR@kas.sa'
  );
  const encodedSubject = `=?UTF-8?B?${Buffer.from(cleanSubject, 'utf8').toString('base64')}?=`;
  const logoBase64 = loadOfficialGroupLogoBase64(inlineLogoBase64);
  const safeHtml = ensureSignatureInHtml(
    cidHtmlBody,
    `cid:${KAS_GROUP_LOGO_CID}`,
    includeReemSignature
  );
  const safePlain = ensureSignatureInPlainText(plainTextBody || cleanSubject, includeReemSignature);
  const fullHtml = `<!DOCTYPE html><html lang="ar"><head><meta charset="UTF-8"><title>${cleanSubject}</title></head><body style="margin:0;padding:20px;background-color:#FFFFFF;">${safeHtml}</body></html>`;

  const normalizedAtts = Array.isArray(attachments)
    ? attachments.filter((a) => a && a.fileName && a.base64Content)
    : [];

  const relatedLines = [
    `Content-Type: multipart/related; type="multipart/alternative"; boundary="${relatedBoundary}"`,
    '',
    `--${relatedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    '',
    `--${altBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64Lines(Buffer.from(safePlain, 'utf8').toString('base64')),
    '',
    `--${altBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    encodeQuotedPrintableUtf8(fullHtml),
    '',
    `--${altBoundary}--`,
  ];

  if (logoBase64 && includeReemSignature !== false) {
    relatedLines.push(
      '',
      `--${relatedBoundary}`,
      'Content-Type: image/png; name="khalid-alsulaim-trading-group.png"',
      'Content-Transfer-Encoding: base64',
      `Content-ID: <${KAS_GROUP_LOGO_CID}>`,
      'Content-Disposition: inline; filename="khalid-alsulaim-trading-group.png"',
      '',
      wrapBase64Lines(logoBase64)
    );
  }

  relatedLines.push('', `--${relatedBoundary}--`);

  const msgIdClean = String(
    messageId || `hr-kas-${Date.now()}-${crypto.randomBytes(4).toString('hex')}@kas.sa`
  ).replace(/[<>]/g, '');

  const lines = [
    ...(includeUnsentHeader ? ['X-Unsent: 1'] : []),
    `From: "${FIXED_HR_FROM_NAME}" <${FIXED_HR_FROM_EMAIL}>`,
    `Reply-To: "${FIXED_HR_FROM_NAME}" <${FIXED_HR_FROM_EMAIL}>`,
    `To: ${toEmails.join(', ')}`,
    `Cc: ${ccEmails.join(', ')}`,
    `Subject: ${encodedSubject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${msgIdClean}>`,
    'MIME-Version: 1.0',
  ];

  if (normalizedAtts.length === 0) {
    lines.push(...relatedLines, '');
    return lines.join('\r\n');
  }

  lines.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`, '', `--${mixedBoundary}`, ...relatedLines);

  for (const att of normalizedAtts) {
    const safeName = sanitizeHeaderValue(att.fileName);
    const encodedName = `=?UTF-8?B?${Buffer.from(safeName, 'utf8').toString('base64')}?=`;
    const cleanB64 = String(att.base64Content)
      .replace(/^data:[^;]*;base64,/i, '')
      .replace(/[\r\n\s]+/g, '');
    lines.push(
      '',
      `--${mixedBoundary}`,
      `Content-Type: ${sanitizeHeaderValue(att.mimeType || 'application/octet-stream')}; name="${encodedName}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${encodedName}"`,
      '',
      wrapBase64Lines(cleanB64)
    );
  }

  lines.push('', `--${mixedBoundary}--`, '');
  return lines.join('\r\n');
}

export function openLocalWindowsOutlookDraft(payload = {}) {
  const toEmails = sanitizeRecipientEmails(payload?.toEmails || [], [FIXED_HR_FROM_EMAIL]);
  const ccEmails = enforceMandatoryCc(payload?.ccEmails || []);
  const messageId = `hr-kas-draft-${Date.now()}-${crypto.randomBytes(4).toString('hex')}@kas.sa`;
  const emlDraftContent =
    typeof payload?.emlContent === 'string' && payload.emlContent.includes('X-Unsent: 1')
      ? payload.emlContent
      : buildServerLiveMimeMessage({
          subject: payload?.subject || 'Official HR Correspondence - HR@kas.sa',
          toEmails,
          ccEmails,
          cidHtmlBody: payload?.cidHtmlBody || payload?.htmlBody || '',
          plainTextBody: payload?.plainTextBody || '',
          inlineLogoBase64: payload?.inlineLogoBase64,
          attachments: payload?.attachments || [],
          messageId,
          liveMimeMessage: payload?.liveMimeMessage,
          includeUnsentHeader: true,
          includeReemSignature: payload?.includeReemSignature !== false,
        });

  const privateTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kas-hr-draft-'));
  try {
    fs.chmodSync(privateTempDir, 0o700);
  } catch {
    // ignore chmod on filesystems without POSIX permissions
  }
  const safeStamp = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const tempEmlPath = path.join(privateTempDir, `KAS_HR_Official_${safeStamp}.eml`);
  fs.writeFileSync(tempEmlPath, emlDraftContent, {
    encoding: 'utf8',
    mode: 0o600,
    flag: 'wx',
  });

  const isTestEnv = Boolean(process.env.VITEST || process.env.NODE_ENV === 'test');
  let launchedProcess = false;

  if (!isTestEnv && process.platform === 'win32') {
    try {
      const child = spawn('cmd.exe', ['/c', 'start', '', tempEmlPath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();
      launchedProcess = true;
    } catch {
      launchedProcess = false;
    }
  }

  return {
    ok: true,
    openedDesktopDraft: true,
    launchedProcess,
    tempEmlPath,
    messageId,
    acceptedRecipients: toEmails,
    ccRecipients: ccEmails,
  };
}

// ============================================================================
// DRIVER A: MICROSOFT 365 GRAPH API (https://graph.microsoft.com/v1.0/users/HR@kas.sa/sendMail)
// ============================================================================

async function acquireMicrosoftGraphToken(cfg, fetchFn = fetch) {
  if (cfg.graphAccessToken) {
    return cfg.graphAccessToken;
  }
  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(cfg.tenantId)}/oauth2/v2.0/token`;
  const form = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const tokenRes = await fetchFn(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenJson?.access_token) {
    const detail = tokenJson?.error_description || tokenJson?.error || `HTTP ${tokenRes.status}`;
    throw new Error(`فشل توثيق Microsoft 365 OAuth 2.0: ${detail}`);
  }
  return tokenJson.access_token;
}

export async function sendViaMicrosoftGraph({
  config,
  subject,
  toEmails,
  ccEmails,
  cidHtmlBody,
  inlineLogoBase64,
  attachments,
  fetchFn = fetch,
  verifyOnly = false,
}) {
  const token = await acquireMicrosoftGraphToken(config, fetchFn);
  if (verifyOnly) {
    return {
      ok: true,
      provider: 'microsoft_graph',
      verified: true,
      fromEmail: FIXED_HR_FROM_EMAIL,
      mandatoryCc: MANDATORY_HR_CC_EMAIL,
    };
  }

  const logoBase64 = loadOfficialGroupLogoBase64(inlineLogoBase64);
  const safeHtml = ensureSignatureInHtml(cidHtmlBody, `cid:${KAS_GROUP_LOGO_CID}`);
  const graphAttachments = [];

  if (logoBase64) {
    graphAttachments.push({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: 'khalid-alsulaim-trading-group.png',
      contentType: 'image/png',
      isInline: true,
      contentId: KAS_GROUP_LOGO_CID,
      contentBytes: logoBase64,
    });
  }

  if (Array.isArray(attachments)) {
    for (const att of attachments) {
      if (!att?.fileName || !att?.base64Content) continue;
      graphAttachments.push({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: sanitizeHeaderValue(att.fileName),
        contentType: sanitizeHeaderValue(att.mimeType || 'application/octet-stream'),
        isInline: false,
        contentBytes: String(att.base64Content)
          .replace(/^data:[^;]*;base64,/i, '')
          .replace(/[\r\n\s]+/g, ''),
      });
    }
  }

  const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(FIXED_HR_FROM_EMAIL)}/sendMail`;
  const payload = {
    message: {
      subject: sanitizeHeaderValue(subject),
      body: {
        contentType: 'HTML',
        content: safeHtml,
      },
      from: {
        emailAddress: {
          name: FIXED_HR_FROM_NAME,
          address: FIXED_HR_FROM_EMAIL,
        },
      },
      replyTo: [
        {
          emailAddress: {
            name: FIXED_HR_FROM_NAME,
            address: FIXED_HR_FROM_EMAIL,
          },
        },
      ],
      toRecipients: toEmails.map((address) => ({ emailAddress: { address } })),
      ccRecipients: ccEmails.map((address) => ({ emailAddress: { address } })),
      attachments: graphAttachments,
    },
    saveToSentItems: true,
  };

  const sendRes = await fetchFn(graphUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!sendRes.ok) {
    const errJson = await sendRes.json().catch(() => ({}));
    const msg = errJson?.error?.message || errJson?.error?.code || `HTTP ${sendRes.status}`;
    throw new Error(`فشل الإرسال عبر Microsoft Graph (${FIXED_HR_FROM_EMAIL}): ${msg}`);
  }

  const requestId =
    sendRes.headers?.get?.('request-id') ||
    `m365-${Date.now()}-${crypto.randomBytes(4).toString('hex')}@kas.sa`;

  return {
    ok: true,
    provider: 'microsoft_graph',
    messageId: requestId,
    acceptedRecipients: toEmails,
    ccRecipients: ccEmails,
    sentAt: new Date().toISOString(),
  };
}

// ============================================================================
// DRIVER B: DIRECT ENCRYPTED SMTP TRANSPORT (node:net + node:tls, RFC 5321 / 3207)
// ============================================================================

function attachSmtpSocketReader(socket) {
  let buffer = '';
  let multiLines = [];
  const lineQueue = [];
  const waiters = [];

  const rejectAll = (err) => {
    while (waiters.length > 0) {
      const w = waiters.shift();
      clearTimeout(w.timer);
      w.reject(err);
    }
  };

  const tryResolve = () => {
    while (lineQueue.length > 0 && waiters.length > 0) {
      const next = lineQueue.shift();
      const w = waiters.shift();
      clearTimeout(w.timer);
      w.resolve(next);
    }
  };

  const onData = (chunk) => {
    buffer += chunk.toString('utf8');
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() ?? '';

    for (const rawLine of parts) {
      if (!rawLine) continue;
      const match = rawLine.match(/^(\d{3})([-\s])(.*)$/);
      if (!match) continue;
      const code = Number(match[1]);
      const sep = match[2];
      const text = match[3] || '';
      multiLines.push(text);
      if (sep === ' ') {
        lineQueue.push({ code, lines: multiLines, raw: rawLine });
        multiLines = [];
        tryResolve();
      }
    }
  };

  const onError = (err) => rejectAll(err);
  const onClose = () => rejectAll(new Error('انقطع الاتصال بخادم SMTP قبل اكتمال الجلسة.'));

  socket.on('data', onData);
  socket.on('error', onError);
  socket.on('close', onClose);

  return {
    readReply(timeoutMs = 15000) {
      if (lineQueue.length > 0) {
        return Promise.resolve(lineQueue.shift());
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const idx = waiters.findIndex((item) => item.resolve === resolve);
          if (idx >= 0) waiters.splice(idx, 1);
          reject(new Error('انتهت مهلة استجابة خادم SMTP.'));
        }, timeoutMs);
        waiters.push({ resolve, reject, timer });
      });
    },
    async command(cmdText, expectedCodes = [250]) {
      socket.write(`${cmdText}\r\n`);
      const reply = await this.readReply();
      if (!expectedCodes.includes(reply.code)) {
        throw new Error(`خطأ SMTP (${reply.code}): ${reply.lines.join(' ')}`);
      }
      return reply;
    },
    detach() {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('close', onClose);
      while (waiters.length > 0) {
        const w = waiters.shift();
        clearTimeout(w.timer);
      }
    },
  };
}

function dotStuffMime(mimeMessage) {
  return String(mimeMessage || '')
    .replace(/\r?\n/g, '\r\n')
    .split('\r\n')
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n');
}

export async function sendViaDirectSmtp({
  config,
  subject,
  toEmails,
  ccEmails,
  cidHtmlBody,
  plainTextBody,
  inlineLogoBase64,
  attachments,
  liveMimeMessage,
  verifyOnly = false,
}) {
  const host = sanitizeHeaderValue(config.smtpHost || 'smtp.office365.com');
  const port = Number(config.smtpPort) || 587;
  const user = sanitizeHeaderValue(config.smtpUser || FIXED_HR_FROM_EMAIL);
  const pass = String(config.smtpPass || '').trim();
  const useImplicitTls = Boolean(config.smtpSecure) || port === 465;
  const rejectUnauthorized = config.tlsRejectUnauthorized !== false;

  if (!host || !user || !pass) {
    const e = new Error('بيانات خادم SMTP غير مكتملة.');
    e.code = 'MAIL_GATEWAY_NOT_CONFIGURED';
    throw e;
  }

  let activeSocket = await new Promise((resolve, reject) => {
    const conn = useImplicitTls
      ? tls.connect({ host, port, servername: host, rejectUnauthorized })
      : net.createConnection({ host, port });

    const connectTimer = setTimeout(() => {
      conn.destroy();
      reject(new Error(`انتهت مهلة الاتصال بخادم البريد ${host}:${port}. تحقق من الشبكة أو المنفذ.`));
    }, 15000);

    const onErr = (err) => {
      clearTimeout(connectTimer);
      reject(new Error(`تعذر الاتصال بخادم البريد ${host}:${port}: ${err.message}`));
    };
    conn.once('error', onErr);
    conn.once(useImplicitTls ? 'secureConnect' : 'connect', () => {
      clearTimeout(connectTimer);
      conn.off('error', onErr);
      resolve(conn);
    });
  });

  let reader = attachSmtpSocketReader(activeSocket);

  try {
    const greeting = await reader.readReply();
    if (greeting.code !== 220) {
      throw new Error(`رفض خادم SMTP بدء الاتصال (${greeting.code}): ${greeting.lines.join(' ')}`);
    }

    let ehloReply = await reader.command('EHLO kas.sa', [250]);
    const capabilities = ehloReply.lines.map((l) => l.toUpperCase()).join(' ');

    if (!useImplicitTls && capabilities.includes('STARTTLS')) {
      await reader.command('STARTTLS', [220]);
      reader.detach();
      activeSocket = await new Promise((resolve, reject) => {
        const tlsSock = tls.connect({
          socket: activeSocket,
          servername: host,
          rejectUnauthorized,
        });
        tlsSock.once('error', (err) =>
          reject(new Error(`فشلت ترقية الاتصال المشفر STARTTLS: ${err.message}`))
        );
        tlsSock.once('secureConnect', () => resolve(tlsSock));
      });
      reader = attachSmtpSocketReader(activeSocket);
      ehloReply = await reader.command('EHLO kas.sa', [250]);
    }

    const postTlsCaps = ehloReply.lines.map((l) => l.toUpperCase()).join(' ');
    if (postTlsCaps.includes('AUTH') && !postTlsCaps.includes('LOGIN') && postTlsCaps.includes('PLAIN')) {
      const token = Buffer.from(`\0${user}\0${pass}`, 'utf8').toString('base64');
      await reader.command(`AUTH PLAIN ${token}`, [235]);
    } else {
      await reader.command('AUTH LOGIN', [334]);
      await reader.command(Buffer.from(user, 'utf8').toString('base64'), [334]);
      await reader.command(Buffer.from(pass, 'utf8').toString('base64'), [235]);
    }

    if (verifyOnly) {
      await reader.command('QUIT', [221, 250]).catch(() => {});
      reader.detach();
      activeSocket.end();
      return {
        ok: true,
        provider: 'smtp',
        verified: true,
        host,
        port,
        fromEmail: FIXED_HR_FROM_EMAIL,
        mandatoryCc: MANDATORY_HR_CC_EMAIL,
      };
    }

    const messageId = `hr-kas-${Date.now()}-${crypto.randomBytes(5).toString('hex')}@kas.sa`;
    const allEnvelopeRecipients = sanitizeRecipientEmails([...toEmails, ...ccEmails]);

    await reader.command(`MAIL FROM:<${FIXED_HR_FROM_EMAIL}>`, [250]);
    for (const rcpt of allEnvelopeRecipients) {
      await reader.command(`RCPT TO:<${rcpt}>`, [250, 251]);
    }

    await reader.command('DATA', [354]);
    const mimePayload = buildServerLiveMimeMessage({
      subject,
      toEmails,
      ccEmails,
      cidHtmlBody,
      plainTextBody,
      inlineLogoBase64,
      attachments,
      messageId,
      liveMimeMessage,
    });

    const stuffed = dotStuffMime(mimePayload);
    const dataReply = await reader.command(
      stuffed.endsWith('\r\n') ? `${stuffed}.` : `${stuffed}\r\n.`,
      [250]
    );

    await reader.command('QUIT', [221, 250]).catch(() => {});
    reader.detach();
    activeSocket.end();

    return {
      ok: true,
      provider: 'smtp',
      messageId,
      serverResponse: dataReply.lines.join(' '),
      acceptedRecipients: toEmails,
      ccRecipients: ccEmails,
      sentAt: new Date().toISOString(),
    };
  } catch (err) {
    try {
      reader.detach();
      activeSocket.destroy();
    } catch {
      // ignore socket cleanup
    }
    throw err;
  }
}

// ============================================================================
// DRIVER C: RESEND CLOUD API (https://api.resend.com/emails)
// ============================================================================

export function deriveVerifiedResendSender(senderEmail, configuredResendFrom = 'HR@kas-erp.com') {
  const cleanConfigured = sanitizeHeaderValue(configuredResendFrom || '') || 'HR@kas-erp.com';
  const verifiedDomain = cleanConfigured.includes('@')
    ? cleanConfigured.split('@')[1].trim()
    : 'kas-erp.com';
  const rawSender = sanitizeHeaderValue(senderEmail || '');
  if (!rawSender || !rawSender.includes('@')) {
    return cleanConfigured;
  }
  const [localPart, domainPart] = rawSender.split('@');
  if (domainPart.toLowerCase() === verifiedDomain.toLowerCase()) {
    return rawSender;
  }
  const safeLocal = localPart.replace(/[^a-zA-Z0-9._+-]/g, '') || 'noreply';
  return `${safeLocal}@${verifiedDomain}`;
}

export async function sendViaResendApi({
  config,
  subject,
  toEmails,
  ccEmails,
  cidHtmlBody,
  plainTextBody,
  inlineLogoBase64,
  attachments,
  senderName,
  senderEmail,
  skipHrSignature = false,
  fetchFn = fetch,
  verifyOnly = false,
}) {
  const baseResendFrom =
    sanitizeHeaderValue(config.resendFromEmail || '') || 'HR@kas-erp.com';
  const effectiveResendFrom = senderEmail
    ? deriveVerifiedResendSender(senderEmail, baseResendFrom)
    : baseResendFrom;
  const effectiveFromDisplayName = sanitizeHeaderValue(senderName || '') || FIXED_HR_FROM_NAME;
  const effectiveReplyTo = sanitizeHeaderValue(senderEmail || '') || FIXED_HR_FROM_EMAIL;

  if (verifyOnly) {
    const checkRes = await fetchFn('https://api.resend.com/domains', {
      method: 'GET',
      headers: { Authorization: `Bearer ${config.resendApiKey}` },
    });
    if (!checkRes.ok) {
      const checkErr = await checkRes.json().catch(() => ({}));
      if (checkRes.status === 401 && checkErr?.name === 'restricted_api_key') {
        return {
          ok: true,
          provider: 'resend',
          verified: true,
          keyScope: 'sending_only',
          fromEmail: effectiveResendFrom,
          replyToEmail: FIXED_HR_FROM_EMAIL,
          mandatoryCc: MANDATORY_HR_CC_EMAIL,
        };
      }
      throw new Error(`فشل التحقق من مفتاح Resend API (HTTP ${checkRes.status})`);
    }
    return {
      ok: true,
      provider: 'resend',
      verified: true,
      keyScope: 'full_access',
      fromEmail: effectiveResendFrom,
      replyToEmail: FIXED_HR_FROM_EMAIL,
      mandatoryCc: MANDATORY_HR_CC_EMAIL,
    };
  }

  const logoBase64 = loadOfficialGroupLogoBase64(inlineLogoBase64);
  const safeHtml = skipHrSignature
    ? String(cidHtmlBody || '')
    : ensureSignatureInHtml(cidHtmlBody, `cid:${KAS_GROUP_LOGO_CID}`);
  const safePlain = skipHrSignature
    ? String(plainTextBody || subject || '')
    : ensureSignatureInPlainText(plainTextBody || subject);
  const resendAttachments = [];

  if (logoBase64 && safeHtml.includes(`cid:${KAS_GROUP_LOGO_CID}`)) {
    resendAttachments.push({
      filename: 'khalid-alsulaim-trading-group.png',
      content: logoBase64,
      content_id: KAS_GROUP_LOGO_CID,
    });
  } else if (logoBase64 && !skipHrSignature) {
    resendAttachments.push({
      filename: 'khalid-alsulaim-trading-group.png',
      content: logoBase64,
      content_id: KAS_GROUP_LOGO_CID,
    });
  }

  if (Array.isArray(attachments)) {
    for (const att of attachments) {
      if (!att?.fileName || !att?.base64Content) continue;
      resendAttachments.push({
        filename: sanitizeHeaderValue(att.fileName),
        content: String(att.base64Content)
          .replace(/^data:[^;]*;base64,/i, '')
          .replace(/[\r\n\s]+/g, ''),
      });
    }
  }

  const resendBody = {
    from: `${effectiveFromDisplayName} <${effectiveResendFrom}>`,
    reply_to: effectiveReplyTo,
    to: toEmails,
    subject: sanitizeHeaderValue(subject),
    html: safeHtml,
    text: safePlain,
  };
  if (Array.isArray(ccEmails) && ccEmails.length > 0) {
    resendBody.cc = ccEmails;
  }
  if (resendAttachments.length > 0) {
    resendBody.attachments = resendAttachments;
  }

  const res = await fetchFn('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resendBody),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`فشل الإرسال عبر Resend API: ${data?.message || res.statusText}`);
  }

  return {
    ok: true,
    provider: 'resend',
    messageId: data?.id || `resend-${Date.now()}@kas.sa`,
    acceptedRecipients: toEmails,
    ccRecipients: ccEmails,
    sentAt: new Date().toISOString(),
  };
}

// ============================================================================
// UNIFIED DISPATCH + HTTP REQUEST HANDLER (Vite Middleware & Vercel Serverless)
// ============================================================================

export async function dispatchDirectHrEmail(payload, deps = {}) {
  const cfg = loadEffectiveGatewayConfig(payload?.gatewayConfig || null);
  const provider = resolveActiveProvider(cfg);

  if (provider === 'none') {
    const err = new Error(
      'بوابة الإرسال الشبكي المباشر لبريد الموارد البشرية (HR@kas.sa) غير مفعلة بعد ببيانات اعتماد Microsoft 365 أو SMTP.'
    );
    err.code = 'MAIL_GATEWAY_NOT_CONFIGURED';
    err.statusCode = 428;
    throw err;
  }

  const toEmails = sanitizeRecipientEmails(
    payload?.toEmails || [],
    payload?.skipMandatoryCc ? [] : [FIXED_HR_FROM_EMAIL]
  );
  const ccEmails = payload?.skipMandatoryCc
    ? sanitizeRecipientEmails(payload?.ccEmails || [])
    : enforceMandatoryCc(payload?.ccEmails || []);

  if (toEmails.length === 0) {
    const err = new Error('لا يوجد مستلم صالح معتمد للإرسال.');
    err.code = 'INVALID_RECIPIENTS';
    err.statusCode = 400;
    throw err;
  }

  const commonParams = {
    config: cfg,
    subject: sanitizeHeaderValue(payload?.subject || 'Official Corporate Correspondence - KAS Group'),
    toEmails,
    ccEmails,
    cidHtmlBody: payload?.cidHtmlBody || payload?.htmlBody || '',
    plainTextBody: payload?.plainTextBody || '',
    inlineLogoBase64: payload?.inlineLogoBase64,
    attachments: payload?.attachments || [],
    liveMimeMessage: payload?.liveMimeMessage,
    senderName: payload?.senderName,
    senderEmail: payload?.senderEmail,
    skipHrSignature: Boolean(payload?.skipHrSignature),
    fetchFn: deps.fetchFn || fetch,
    verifyOnly: Boolean(payload?.verifyOnly),
  };

  if (provider === 'microsoft_graph') {
    return sendViaMicrosoftGraph(commonParams);
  }
  if (provider === 'smtp') {
    return sendViaDirectSmtp(commonParams);
  }
  return sendViaResendApi(commonParams);
}

async function parseJsonRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    return JSON.parse(req.body || '{}');
  }
  const raw = await new Promise((resolve) => {
    let acc = '';
    req.on('data', (chunk) => {
      acc += chunk;
    });
    req.on('end', () => resolve(acc));
  });
  return JSON.parse(raw || '{}');
}

function sendJsonResponse(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export async function handleHrDirectMailHttpRequest(req, res) {
  try {
    if (req.method === 'GET') {
      return sendJsonResponse(res, 200, getMaskedGatewayStatus());
    }

    if (req.method !== 'POST') {
      return sendJsonResponse(res, 405, { ok: false, errorAr: 'Method not allowed' });
    }

    const body = await parseJsonRequestBody(req);

    if (body?.action === 'open_desktop_draft') {
      const desktopRes = openLocalWindowsOutlookDraft(body);
      return sendJsonResponse(res, 200, desktopRes);
    }

    if (body?.action === 'configure') {
      const savedStatus = saveLocalGatewayConfig(body.config || {});
      return sendJsonResponse(res, 200, { ok: true, status: savedStatus });
    }

    if (body?.action === 'verify') {
      const cfg = loadEffectiveGatewayConfig(body.config || null);
      const provider = resolveActiveProvider(cfg);
      if (provider === 'none') {
        return sendJsonResponse(res, 428, {
          ok: false,
          code: 'MAIL_GATEWAY_NOT_CONFIGURED',
          errorAr: 'يرجى إدخال بيانات اعتماد Microsoft 365 Graph أو SMTP أو Resend قبل الاختبار.',
          status: getMaskedGatewayStatus(body.config || null),
        });
      }
      const verifyResult = await dispatchDirectHrEmail({
        gatewayConfig: body.config || null,
        verifyOnly: true,
        toEmails: [FIXED_HR_FROM_EMAIL],
        ccEmails: [MANDATORY_HR_CC_EMAIL],
        subject: 'HR@kas.sa Gateway Verification',
      });
      return sendJsonResponse(res, 200, {
        ...verifyResult,
        status: getMaskedGatewayStatus(body.config || null),
      });
    }

    const result = await dispatchDirectHrEmail(body);
    return sendJsonResponse(res, 200, result);
  } catch (err) {
    const statusCode =
      err?.code === 'MAIL_GATEWAY_NOT_CONFIGURED'
        ? 428
        : Number(err?.statusCode) || 500;
    return sendJsonResponse(res, statusCode, {
      ok: false,
      code: err?.code || 'HR_DIRECT_MAIL_ERROR',
      errorAr: err?.message || 'تعذر إرسال البريد الإلكتروني مباشرة عبر الخادم.',
      status: getMaskedGatewayStatus(),
    });
  }
}
