import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  composeReemHrOfficialEmail,
  KAS_GROUP_LOGO_CID,
  KAS_TRADING_GROUP_LOGO_BASE64,
  REEM_HR_SIGNATORY,
} from './reemHrEmailTemplatesEngine';
import { dispatchComposedHrEmailDirect } from './hrDirectEmailDispatchService';
import { sendHrOfficialEmailDirect } from './quickShareService';
import { realErpDataStore } from './realErpDataStore';

const loadDirectMailServer = (): Promise<any> =>
  import(/* @vite-ignore */ './hrDirectMailServer' + '.mjs');

const nodeProcess = (): { env: Record<string, string | undefined>; cwd: () => string } =>
  (globalThis as any).process;

async function startLocalMockSmtpServer() {
  const netMod: any = await import(/* @vite-ignore */ 'node:' + 'net');
  const captured = {
    mailFrom: '',
    rcptTo: [] as string[],
    rawData: '',
    commands: [] as string[],
  };

  const server = netMod.createServer((socket: any) => {
    let buffer = '';
    let authStage: 'none' | 'user' | 'pass' = 'none';
    let inData = false;
    const dataLines: string[] = [];

    socket.write('220 localhost ESMTP KAS-Direct-Mail-Test\r\n');

    socket.on('data', (chunk: any) => {
      buffer += chunk.toString('utf8');
      const parts = buffer.split(/\r?\n/);
      buffer = parts.pop() ?? '';

      for (const line of parts) {
        if (inData) {
          if (line === '.') {
            inData = false;
            captured.rawData = dataLines.join('\r\n');
            socket.write('250 2.0.0 Ok: queued as test-smtp-ok@kas.sa\r\n');
          } else {
            dataLines.push(line.startsWith('..') ? line.slice(1) : line);
          }
          continue;
        }

        if (authStage === 'user') {
          authStage = 'pass';
          socket.write('334 UGFzc3dvcmQ6\r\n');
          continue;
        }
        if (authStage === 'pass') {
          authStage = 'none';
          socket.write('235 2.7.0 Authentication successful\r\n');
          continue;
        }

        captured.commands.push(line);
        const upper = line.toUpperCase();

        if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
          socket.write('250-localhost\r\n250 AUTH LOGIN PLAIN\r\n');
        } else if (upper.startsWith('AUTH LOGIN')) {
          authStage = 'user';
          socket.write('334 VXNlcm5hbWU6\r\n');
        } else if (upper.startsWith('AUTH PLAIN')) {
          socket.write('235 2.7.0 Authentication successful\r\n');
        } else if (upper.startsWith('MAIL FROM:')) {
          captured.mailFrom = line.slice(10).trim();
          socket.write('250 2.1.0 Ok\r\n');
        } else if (upper.startsWith('RCPT TO:')) {
          captured.rcptTo.push(line.slice(8).trim());
          socket.write('250 2.1.5 Ok\r\n');
        } else if (upper === 'DATA') {
          inData = true;
          socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
        } else if (upper === 'QUIT') {
          socket.write('221 2.0.0 Bye\r\n');
          socket.end();
        } else {
          socket.write('250 Ok\r\n');
        }
      }
    });
  });

  return new Promise<{
    port: number;
    captured: typeof captured;
    close: () => Promise<void>;
  }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({
        port,
        captured,
        close: () => new Promise<void>((resClose) => server.close(() => resClose())),
      });
    });
  });
}

function decodeBase64Utf8(b64: string): string {
  const binary = atob(b64.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

describe('Direct Network HR Email Delivery (Zero .eml Downloads)', () => {
  const originalFetch = globalThis.fetch;
  const savedEnvKeys = [
    'HR_MAIL_PROVIDER',
    'HR_SMTP_HOST',
    'HR_SMTP_PORT',
    'HR_SMTP_SECURE',
    'HR_SMTP_USER',
    'HR_SMTP_PASS',
    'HR_MAIL_TENANT_ID',
    'HR_MAIL_CLIENT_ID',
    'HR_MAIL_CLIENT_SECRET',
    'AZURE_TENANT_ID',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'RESEND_API_KEY',
  ];
  const envBackup: Record<string, string | undefined> = {};

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
    const procEnv = nodeProcess().env;
    for (const k of savedEnvKeys) {
      if (envBackup[k] === undefined) {
        delete procEnv[k];
      } else {
        procEnv[k] = envBackup[k];
      }
    }
  });

  it('transmits live MIME message over real TCP SMTP with mandatory signature, inline logo, attachments, and no X-Unsent draft header', async () => {
    const { dispatchDirectHrEmail } = await loadDirectMailServer();
    const smtp = await startLocalMockSmtpServer();
    try {
      const attachmentText = 'KAS-DIRECT-ATTACHMENT-PAYLOAD';
      const attachmentB64 = btoa(attachmentText);

      const composed = composeReemHrOfficialEmail({
        templateId: 'CUSTOM_OFFICIAL_CORRESPONDENCE',
        recipientEmails: ['n.alshetwi@kas.sa', 'o.saeed.hospitality@kas.sa'],
        ccEmails: [...REEM_HR_SIGNATORY.defaultCc],
        recipientNameAr: 'نورة الشتوي',
        recipientNameEn: 'Noura Al-Shetwi',
        customSubjectAr: 'اعتماد الإرسال المباشر عبر البريد المؤسسي',
        customSubjectEn: 'Official Direct HR Email Verification',
        customBodyAr: 'اختبار الإرسال المباشر عبر بروتوكول SMTP دون تنزيل ملفات.',
        customBodyEn: 'Live direct SMTP transmission verification.',
        attachments: [
          {
            fileName: 'kas-hr-directory-check.txt',
            mimeType: 'text/plain',
            sizeBytes: attachmentText.length,
            base64Content: attachmentB64,
          },
        ],
      });

      const smtpGatewayConfig = {
        provider: 'smtp',
        smtpHost: '127.0.0.1',
        smtpPort: smtp.port,
        smtpSecure: false,
        smtpUser: 'HR@kas.sa',
        smtpPass: 'unit-test-smtp-credential',
      };

      const verifyRes = await dispatchDirectHrEmail({
        gatewayConfig: smtpGatewayConfig,
        verifyOnly: true,
        toEmails: ['n.alshetwi@kas.sa'],
        ccEmails: ['Khalid@kas.sa'],
        subject: 'Verify',
      });
      expect(verifyRes.ok).toBe(true);
      expect(verifyRes.verified).toBe(true);

      const sendRes = await dispatchDirectHrEmail({
        gatewayConfig: smtpGatewayConfig,
        subject: composed.subject,
        toEmails: ['n.alshetwi@kas.sa', 'o.saeed.hospitality@kas.sa'],
        ccEmails: composed.ccEmails,
        cidHtmlBody: composed.cidHtmlBody,
        plainTextBody: composed.plainTextBody,
        inlineLogoBase64: KAS_TRADING_GROUP_LOGO_BASE64,
        attachments: composed.attachments,
      });

      expect(sendRes.ok).toBe(true);
      expect(sendRes.provider).toBe('smtp');
      expect(smtp.captured.mailFrom).toBe('<HR@kas.sa>');
      expect(smtp.captured.rcptTo).toContain('<n.alshetwi@kas.sa>');
      expect(smtp.captured.rcptTo).toContain('<Khalid@kas.sa>');
      expect(smtp.captured.rcptTo.join(',').toLowerCase()).not.toContain('o.saeed.hospitality@kas.sa');

      expect(smtp.captured.rawData).not.toContain('X-Unsent: 1');
      expect(smtp.captured.rawData).toContain('Message-ID: <');
      expect(smtp.captured.rawData).toContain('From: "Reem Bin Hussain - HR" <HR@kas.sa>');
      expect(smtp.captured.rawData).toContain('Cc: Khalid@kas.sa');
      expect(smtp.captured.rawData).toContain(`Content-ID: <${KAS_GROUP_LOGO_CID}>`);
      expect(smtp.captured.rawData).toContain(attachmentB64);

      const unfoldedMime = smtp.captured.rawData.replace(/=\r?\n/g, '');
      expect(unfoldedMime).toContain('Times New Roman');
      expect(unfoldedMime).toContain('Reem Bin Hussain');
      expect(unfoldedMime).toContain('International HR &amp; Talent Acquisition Consultant');
      expect(unfoldedMime).toContain('Email: HR@kas.sa');
      expect(unfoldedMime).toContain('Mobile: +966 553452122');

      const textPartMatch = smtp.captured.rawData.match(
        /Content-Type: text\/plain; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n([\s\S]*?)\r\n\r\n--/
      );
      expect(textPartMatch).toBeTruthy();
      const decodedPlainText = decodeBase64Utf8(textPartMatch?.[1] || '');
      expect(decodedPlainText).toContain('Reem Bin Hussain');
      expect(decodedPlainText).toContain('International HR & Talent Acquisition Consultant');
      expect(decodedPlainText).toContain('Email: HR@kas.sa');
      expect(decodedPlainText).toContain('Mobile: +966 553452122');
    } finally {
      await smtp.close();
    }
  });

  it('dispatches via Microsoft 365 Graph API /users/HR@kas.sa/sendMail with inline logo, CC Khalid@kas.sa, and signature', async () => {
    const { sendViaMicrosoftGraph } = await loadDirectMailServer();
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const mockFetch = async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.includes('/oauth2/v2.0/token')) {
        return new Response(JSON.stringify({ access_token: 'mock-m365-bearer-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, {
        status: 202,
        headers: { 'request-id': 'm365-graph-202-ok' },
      });
    };

    const res = await sendViaMicrosoftGraph({
      config: {
        tenantId: 'kas-test-tenant-id',
        clientId: 'kas-test-client-id',
        clientSecret: 'kas-test-client-val',
      },
      subject: 'Official Graph HR Notice',
      toEmails: ['h.alsalim@kas.sa'],
      ccEmails: ['Khalid@kas.sa'],
      cidHtmlBody: `<p>مرحباً بكم</p><img src="cid:${KAS_GROUP_LOGO_CID}" />`,
      inlineLogoBase64: KAS_TRADING_GROUP_LOGO_BASE64,
      attachments: [
        {
          fileName: 'employees.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          base64Content: 'UEsDBBQAAAAIA',
        },
      ],
      fetchFn: mockFetch,
    });

    expect(res.ok).toBe(true);
    expect(res.provider).toBe('microsoft_graph');
    expect(res.messageId).toBe('m365-graph-202-ok');
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe('https://login.microsoftonline.com/kas-test-tenant-id/oauth2/v2.0/token');
    expect(calls[1].url).toBe('https://graph.microsoft.com/v1.0/users/HR%40kas.sa/sendMail');

    const graphBody = JSON.parse(String(calls[1].init.body));
    expect(graphBody.saveToSentItems).toBe(true);
    expect(graphBody.message.from.emailAddress.address).toBe('HR@kas.sa');
    expect(graphBody.message.ccRecipients[0].emailAddress.address).toBe('Khalid@kas.sa');
    expect(graphBody.message.body.content).toContain('Reem Bin Hussain');
    expect(graphBody.message.body.content).toContain('Mobile: +966 553452122');

    const inlineAtt = graphBody.message.attachments.find((a: any) => a.isInline === true);
    expect(inlineAtt?.contentId).toBe(KAS_GROUP_LOGO_CID);
    const fileAtt = graphBody.message.attachments.find((a: any) => a.isInline === false);
    expect(fileAtt?.name).toBe('employees.xlsx');
  });

  it('honestly returns HTTP 428 MAIL_GATEWAY_NOT_CONFIGURED when server credentials are missing', async () => {
    const { handleHrDirectMailHttpRequest } = await loadDirectMailServer();
    const procEnv = nodeProcess().env;
    for (const k of savedEnvKeys) {
      envBackup[k] = procEnv[k];
      delete procEnv[k];
    }

    const fsMod: any = await import(/* @vite-ignore */ 'node:' + 'fs');
    const pathMod: any = await import(/* @vite-ignore */ 'node:' + 'path');
    const gatewayFile = pathMod.resolve(nodeProcess().cwd(), '.hr-mail-gateway.local');
    const hadLocalFile = fsMod.existsSync(gatewayFile);
    const tempBackupFile = `${gatewayFile}.bak-test`;
    if (hadLocalFile) {
      fsMod.renameSync(gatewayFile, tempBackupFile);
    }

    try {
      const req = {
        method: 'POST',
        body: {
          subject: 'Test unconfigured gateway',
          toEmails: ['h.alsalim@kas.sa'],
        },
      };
      let responseStatus = 0;
      let responseBody = '';
      const res = {
        statusCode: 0,
        setHeader: () => {},
        end: (chunk: string) => {
          responseStatus = res.statusCode;
          responseBody = chunk;
        },
      };

      await handleHrDirectMailHttpRequest(req, res);
      expect(responseStatus).toBe(428);
      const parsed = JSON.parse(responseBody);
      expect(parsed.ok).toBe(false);
      expect(parsed.code).toBe('MAIL_GATEWAY_NOT_CONFIGURED');
    } finally {
      if (hadLocalFile && fsMod.existsSync(tempBackupFile)) {
        fsMod.renameSync(tempBackupFile, gatewayFile);
      }
    }
  });

  it('dispatches directly via /api/hr-email-send without invoking URL.createObjectURL (.eml download) and archives logs', async () => {
    const createObjectUrlSpy = vi.fn(() => 'blob:mock-never-called');
    if (typeof URL !== 'undefined') {
      vi.spyOn(URL, 'createObjectURL').mockImplementation(createObjectUrlSpy);
    }

    const capturedPosts: any[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/api/hr-email-send') && init?.method === 'POST') {
        const parsed = JSON.parse(String(init.body || '{}'));
        capturedPosts.push(parsed);
        return new Response(
          JSON.stringify({
            ok: true,
            provider: 'smtp',
            messageId: 'live-direct-999@kas.sa',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 404 });
    }) as typeof fetch;

    const composed = composeReemHrOfficialEmail({
      templateId: 'MONTHLY_SALARY_SLIP_NOTICE',
      recipientEmails: ['a.farahat@kas.sa', 'o.saeed.hospitality@kas.sa'],
      ccEmails: ['Khalid@kas.sa'],
      recipientNameAr: 'أحمد فرحات',
      recipientNameEn: 'Ahmed Farahat',
      customSubjectAr: 'إشعار راتب مباشر بدون تحميل',
      customDetailsAr: 'تم اعتماد قسيمة الراتب وإرسالها مباشرة عبر البوابة.',
    });

    const result = await dispatchComposedHrEmailDirect({
      composed,
      companyId: 'SAF',
      templateTitleAr: 'إشعار قسيمة راتب',
      recipientNameAr: 'أحمد فرحات',
      referenceNo: 'KAS-LIVE-001',
    });

    expect(result.ok).toBe(true);
    expect(result.provider).toBe('smtp');
    expect(result.messageId).toBe('live-direct-999@kas.sa');
    expect(createObjectUrlSpy).not.toHaveBeenCalled();
    expect(capturedPosts).toHaveLength(1);
    expect(capturedPosts[0].toEmails).toEqual(['a.farahat@kas.sa']);
    expect(capturedPosts[0].ccEmails).toContain('Khalid@kas.sa');
    expect(capturedPosts[0].liveMimeMessage).not.toContain('X-Unsent: 1');

    const officialArchive = await realErpDataStore.getRecords<any>('hr_official_emails', []);
    const archived = officialArchive.find((r) => r.reference_no === 'KAS-LIVE-001');
    expect(archived).toBeTruthy();
    expect(archived.dispatch_channel).toBe('DIRECT_SMTP_TLS');

    const sentLogs = await realErpDataStore.getRecords<any>('sent_messages', []);
    const logItem = sentLogs.find((m) => String(m.content || '').includes('KAS-LIVE-001'));
    expect(logItem).toBeTruthy();
    expect(logItem.status).toBe('تم التسليم');

    sendHrOfficialEmailDirect({
      title: 'خطاب مباشرة مباشر دون تحميل',
      recipientName: 'عادل السليم',
      recipientEmail: 'o.saeed.hospitality@kas.sa',
      moduleName: 'اختبار المسار المباشر',
      department: 'hr',
    });

    await new Promise((r) => setTimeout(r, 40));
    expect(createObjectUrlSpy).not.toHaveBeenCalled();
    expect(capturedPosts).toHaveLength(2);
    expect(capturedPosts[1].toEmails.join(',').toLowerCase()).not.toContain('o.saeed.hospitality@kas.sa');
  });
});
