# 🕵️ Security Audit: Myceliumail

> **Audit Date:** 2025-12-28  
> **Auditor:** Sherlocksan  
> **Status:** 🌿 Healthy (Minor Recommendations)  
> **Requested By:** Freedbird

---

## 📋 Executive Summary

Hey Mycmail team! 👋

This is an ecosystem-wide security sweep. **Myceliumail is in excellent security shape** — well done! The codebase shows strong security awareness with proper encryption, input validation, and SSRF protection already in place.

A few minor recommendations below, but no critical issues found.

---

## ✅ Security Strengths Observed

| Area | Implementation | Status |
|------|----------------|--------|
| **Cryptography** | TweetNaCl (X25519 + XSalsa20-Poly1305) | ✅ Excellent |
| **Key Storage** | `mode: 0o600` permissions | ✅ Proper |
| **Webhook Security** | SSRF protection, input validation, HTTPS warnings | ✅ Hardened |
| **Dashboard** | Localhost-only binding (`127.0.0.1`) | ✅ Secure |
| **Dependencies** | `npm audit` = 0 vulnerabilities | ✅ Clean |
| **Secrets** | `.env` in `.gitignore`, no hardcoded keys | ✅ Good |
| **Encrypted Messages** | Body redacted by default in webhooks | ✅ Privacy-aware |

---

## 🟡 Minor Recommendations

### 1. Config API Exposes Supabase Key

**File:** `src/dashboard/routes.ts` (Lines 151-157)

```typescript
fastify.get('/api/config', async (request, reply) => {
    return {
        agentId: config.agentId,
        supabaseUrl: config.supabaseUrl,
        supabaseKey: config.supabaseKey  // ⚠️ Exposed to frontend
    };
});
```

**Risk:** Low (dashboard is localhost-only), but the anon key is exposed to any code running in the browser.

**Recommendation:** This is fine for local use, but if the dashboard ever goes public, consider a proxy pattern instead.

---

### 2. No Rate Limiting on Dashboard API

**File:** `src/dashboard/routes.ts`

**Issue:** Dashboard endpoints have no rate limiting. While localhost-only, a malicious local process could spam the API.

**Recommendation:** Consider adding `@fastify/rate-limit` if exposed beyond localhost.

---

### 3. Stdin Timeout in Send Command

**File:** `src/commands/send.ts` (Line 33)

```typescript
// Timeout after 100ms if no data
setTimeout(() => resolve(null), 100);
```

**Issue:** Very short timeout could miss slow pipe input.

**Recommendation:** Consider increasing to 500ms or using stream end detection.

---

### 4. HTTP Allowed in Webhooks (with Warning)

**File:** `supabase/functions/mycmail-webhook/index.ts` (Lines 89-92)

```typescript
if (url.protocol !== 'https:') {
    console.warn(`⚠️ Non-HTTPS webhook URL: ${url.hostname} - consider using HTTPS`);
}
```

**Status:** Acceptable — you warn but allow. This is a reasonable trade-off for flexibility.

---

## 🔒 Crypto Review

| Check | Result |
|-------|--------|
| Algorithm choice | ✅ TweetNaCl is audited and battle-tested |
| Random nonce generation | ✅ `nacl.randomBytes()` used |
| Key derivation | ✅ X25519 ECDH proper |
| Signing | ✅ Ed25519 detached signatures |
| No plaintext secrets in memory | ⚠️ Keys held in memory during session (acceptable) |

---

## 📊 NPM Audit Results

```json
{
  "vulnerabilities": {
    "critical": 0,
    "high": 0,
    "moderate": 0,
    "low": 0,
    "total": 0
  },
  "dependencies": {
    "prod": 128,
    "total": 376
  }
}
```

**Result:** 🌿 All clear!

---

## 🎯 Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 0 |
| 🟠 Medium | 0 |
| 🟡 Low | 4 (informational) |

**Verdict:** Myceliumail demonstrates **security-first design**. The hardening work from 2025-12-26/27 is visible and effective. No action required — the recommendations above are optional enhancements.

---

## 📝 Audit Trail

| Timestamp | Action | By |
|-----------|--------|-----|
| 2025-12-28 03:16 | Audit started | Sherlocksan |
| 2025-12-28 03:20 | Audit completed | Sherlocksan |

---

*🕵️ Sherlocksan — Security through vigilance*
