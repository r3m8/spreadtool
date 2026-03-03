export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": url.searchParams.get("origin") || "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, *",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const target = url.searchParams.get("url");
    if (!target) {
      return new Response("Missing ?url=", { status: 400 });
    }

    // Build outgoing request, clone method/body if needed
    const incomingHeaders = new Headers(request.headers);

    // Strip problematic headers
    incomingHeaders.delete("origin");
    incomingHeaders.delete("referer");
    incomingHeaders.set(
      "user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const proxiedRequest = new Request(target, {
      method: request.method === "GET" ? "GET" : "GET", // you only need GET for Yahoo search
      headers: incomingHeaders,
    });

    const upstreamResponse = await fetch(proxiedRequest);

    // Clone & add CORS headers to response
    const respHeaders = new Headers(upstreamResponse.headers);
    respHeaders.set(
      "Access-Control-Allow-Origin",
      "https://spreadtool.eu"
    );
    respHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    respHeaders.set("Access-Control-Allow-Headers", "Content-Type, *");

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: respHeaders,
    });
  },
};

