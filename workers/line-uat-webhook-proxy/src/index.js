const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

async function hmacSha256(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function isValidSignature(secret, body, supplied) {
  if (!supplied) return false;
  const expected = await hmacSha256(secret, body);
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(supplied);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}

async function forwardToAppsScript(url, body, headers) {
  const request = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // Apps Script does not need LINE's signature; the proxy verifies it first.
      "x-line-signature": headers.get("x-line-signature") || "",
    },
    body,
    redirect: "manual",
  };

  const first = await fetch(url, request);
  if (first.status < 300 || first.status >= 400) {
    if (!first.ok) throw new Error(`Apps Script returned ${first.status}`);
    return;
  }

  const location = first.headers.get("location");
  if (!location) throw new Error("Apps Script returned a redirect without Location");

  const second = await fetch(location, {
    ...request,
    redirect: "follow",
  });
  if (!second.ok) throw new Error(`Apps Script redirect returned ${second.status}`);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "line-uat-webhook-proxy" });
    }

    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }

    if (!env.APP_SCRIPT_URL || !env.LINE_CHANNEL_SECRET) {
      return json({ error: "proxy_not_configured" }, 503);
    }

    const body = await request.text();
    const signature = request.headers.get("x-line-signature");
    if (!(await isValidSignature(env.LINE_CHANNEL_SECRET, body, signature))) {
      return json({ error: "invalid_signature" }, 401);
    }

    // LINE requires the webhook endpoint's first response to be HTTP 200.
    // Forwarding happens after the response is scheduled, so GAS's 302 cannot
    // leak back to LINE.
    ctx.waitUntil(
      forwardToAppsScript(env.APP_SCRIPT_URL, body, request.headers).catch((error) => {
        console.error("Apps Script forwarding failed", error);
      }),
    );

    return json({ ok: true });
  },
};
