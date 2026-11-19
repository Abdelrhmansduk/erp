/**
 * Cloudflare Pages Edge Function: POST /api/turnstile-verify
 * Verifies Cloudflare Turnstile anti-bot tokens server-side before ERP authentication.
 * Requires env.TURNSTILE_SECRET_KEY in Cloudflare Pages Environment Variables.
 */
export async function onRequestPost(context) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  };

  try {
    const secret = context.env?.TURNSTILE_SECRET_KEY;
    const body = await context.request.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token.trim() : '';

    // Graceful standby mode if Turnstile secret is not yet provisioned in Cloudflare Pages
    if (!secret) {
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'standby',
          verified: false,
          message: 'Turnstile secret key not yet configured on Cloudflare Pages.',
        }),
        { status: 200, headers }
      );
    }

    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          mode: 'enforced',
          verified: false,
          errorAr: 'يرجى إكمال التحقق الأمني (Cloudflare Turnstile) قبل تسجيل الدخول.',
          errorCodes: ['missing-input-response'],
        }),
        { status: 400, headers }
      );
    }

    const clientIp =
      context.request.headers.get('CF-Connecting-IP') ||
      context.request.headers.get('X-Forwarded-For') ||
      '';

    const formData = new FormData();
    formData.append('secret', secret);
    formData.append('response', token);
    if (clientIp) {
      formData.append('remoteip', clientIp);
    }

    const verifyRes = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData,
      }
    );

    const outcome = await verifyRes.json();

    if (!outcome?.success) {
      return new Response(
        JSON.stringify({
          success: false,
          mode: 'enforced',
          verified: false,
          errorAr: 'تعذر التحقق الأمني من الجلسة عبر Cloudflare Turnstile. يرجى المحاولة مجدداً.',
          errorCodes: outcome?.['error-codes'] || ['verification-failed'],
        }),
        { status: 403, headers }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: 'enforced',
        verified: true,
        hostname: outcome.hostname || null,
        challengeTs: outcome.challenge_ts || null,
      }),
      { status: 200, headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        mode: 'error',
        verified: false,
        errorAr: 'حدث خطأ مؤقت أثناء التحقق الأمني عبر الحافة.',
        detail: err?.message || 'turnstile_edge_error',
      }),
      { status: 500, headers }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
