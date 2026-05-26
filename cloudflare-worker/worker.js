/**
 * Deadlock API CORS Proxy — Cloudflare Worker
 *
 * DÉPLOIEMENT:
 * 1. Va sur https://workers.cloudflare.com (compte gratuit)
 * 2. Crée un nouveau Worker
 * 3. Colle ce code
 * 4. Déploie → tu obtiens une URL comme: https://deadlock-proxy.TON-COMPTE.workers.dev
 * 5. Mets cette URL dans environment.ts comme apiBase
 *
 * Limite gratuite: 100 000 requêtes/jour — largement suffisant
 */

const ALLOWED_ORIGINS = [
  'https://shaxten.github.io',   // GitHub Pages
  'http://localhost:4200',        // Dev local
  'http://localhost:4000',
];

const API_TARGETS = {
  'api':    'https://api.deadlock-api.com',
  'assets': 'https://assets.deadlock-api.com',
  'bucket': 'https://assets-bucket.deadlock-api.com',
};

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const url    = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // Route: /api/...  → api.deadlock-api.com/...
    //        /assets/... → assets.deadlock-api.com/...
    //        /bucket/... → assets-bucket.deadlock-api.com/...
    const pathParts = url.pathname.split('/').filter(Boolean);
    const prefix    = pathParts[0];
    const target    = API_TARGETS[prefix];

    if (!target) {
      return new Response('Unknown proxy target', { status: 400 });
    }

    const upstreamPath   = '/' + pathParts.slice(1).join('/');
    const upstreamUrl    = target + upstreamPath + url.search;

    const upstreamReq = new Request(upstreamUrl, {
      method:  request.method,
      headers: {
        'Accept':       'application/json',
        'User-Agent':   'DeadlockStats/1.0',
      },
    });

    try {
      const response = await fetch(upstreamReq);
      const body     = await response.arrayBuffer();

      return new Response(body, {
        status:  response.status,
        headers: {
          'Content-Type':  response.headers.get('Content-Type') || 'application/json',
          ...corsHeaders(origin),
        },
      });
    } catch (err) {
      return new Response('Upstream error: ' + err.message, { status: 502 });
    }
  },
};

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age':       '86400',
  };
}
