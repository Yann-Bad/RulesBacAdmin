// ── Development environment ────────────────────────────────────────────────
// `ng serve` uses this file.  Production uses environment.production.ts.
//
// RubacCore runs on http://localhost:5262.  The proxy (proxy.conf.json) maps:
//   /api/rubac/*  →  http://localhost:5262/api/*
//   /connect/*    →  http://localhost:5262/connect/*
// so all URLs here use relative paths (empty string).
export const environment = {
  production: false,
  // Base path for RubacCore API calls — proxied via proxy.conf.json
  apiBase: '/api/rubac',
};
