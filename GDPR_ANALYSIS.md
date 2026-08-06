# GDPR Analysis: BYOS vs Server-Side Backend

## Summary

**Recommendation: BYOS (Bring Your Own Storage)**

BYOS is the architecturally privacy-preserving choice. By never touching user mood data on your servers, you largely step out of the role of data controller for the sensitive data itself — eliminating the most burdensome GDPR obligations rather than just mitigating them.

---

## Critical Factor: Mood Data Is Likely Special Category Data

GDPR **Article 9** defines "special categories" of personal data requiring elevated protections, including **health data**. Mood tracking data — a daily record of how someone felt — can reasonably be classified as health-adjacent data. Courts and regulators have increasingly treated mental health and emotional data as Article 9 data.

This classification is the most important factor in this comparison.

---

## BYOS Approach

### How it works under GDPR

- Mood entries are stored entirely in the user's own Google Drive or Dropbox.
- Data **never touches your servers**. You are not a data controller for mood entries.
- The user is their own data controller for their own mood history.
- You only transiently process OAuth tokens, stored in the user's `localStorage` on their own device.

### GDPR obligations eliminated

| Obligation | Eliminated? |
|------------|-------------|
| Data breach notification (72h to supervisory authority) | **Yes** — no server-side data to breach |
| DPA with database provider (Neon, Supabase, etc.) | **Yes** — no database |
| DPIA for health/special category data | **Very likely yes** — you don't process it |
| Responding to Subject Access Requests for mood data | **Yes** — user already has direct access |
| Right to Erasure ("right to be forgotten") | **Yes** — user just deletes their own Drive/Dropbox file |
| Data retention policy | **Yes** — not your data to retain |
| Encryption at rest on your servers | **Yes** — no server storage |
| Cross-border transfer safeguards (SCCs) | **Largely yes** — Google/Dropbox handle their own compliance |

### Remaining minimal obligations

- A **Privacy Policy** is still required — you process identity data (name/email) momentarily during the OAuth consent flow.
- Google and Dropbox know your users authenticated with your app — this is covered by their own GDPR compliance.
- OAuth access tokens stored in `localStorage` are a client-side security concern but not a GDPR server-side obligation.

---

## Server-Side Backend Approach

### How it works under GDPR

- You store mood entries in your PostgreSQL database (e.g. Neon, hosted in the US).
- You are the **data controller** for all users' mood histories.
- If mood data is classified as Article 9 health data, you need **explicit consent** (stronger than regular consent) and face a larger compliance burden.

### GDPR obligations incurred

| Obligation | Required? | Effort |
|------------|-----------|--------|
| Full Privacy Policy | Yes | Medium |
| Cookie Policy (session cookies) | Yes | Low |
| DPA with Neon/DB provider (US company) | Yes | EU Standard Contractual Clauses required |
| DPA with Vercel (US company) | Yes | EU SCCs required |
| DPA with Google (OAuth provider) | Yes | Low — Google has standard DPAs |
| DPIA (Data Protection Impact Assessment) | Likely yes — health data | High effort |
| Explicit consent for Article 9 data | Likely yes | Medium |
| Implement Right to Erasure endpoint | Yes | Medium |
| Implement Right to Portability (data export) | Yes | Medium |
| Data breach notification system | Yes | High |
| Data retention policy + automated deletion | Yes | Medium |
| Encryption at rest | Yes | Medium |
| Audit logging | Strongly recommended | High |
| Data Protection Officer (at scale) | Possibly | High |

### Cross-border transfer risk

Neon and Vercel are US companies. Storing EU user data on US infrastructure requires either:
- **Standard Contractual Clauses (SCCs)** — contractual mechanism under Art. 46 GDPR
- Or choosing EU-region hosting (Neon supports `eu-central-1`, Vercel supports Frankfurt)

---

## Comparison

| Concern | BYOS | Server-Side |
|---------|------|-------------|
| You are data controller for mood entries | No | Yes |
| Mood data breach risk on your side | None | High |
| DPIA required | Likely no | Likely yes |
| Right to Erasure implementation | Not needed | Required |
| Right to Portability | Inherent | Must build |
| Cross-border transfer (EU users) | Handled by Google/Dropbox | Your responsibility |
| Compliance cost | Very low | High |
| Legal basis needed for mood data | None (you don't hold it) | Explicit consent (Art. 9) |

---

## If You Proceed With the Server-Side Backend Anyway

Highest-priority items before launching with EU users:

1. **Determine Article 9 classification** — consult a GDPR lawyer on whether your jurisdiction treats mood tracking data as health data. This changes your legal basis requirements.
2. **EU-region hosting** — use Neon `eu-central-1` and Vercel Frankfurt to avoid cross-border transfer complexity.
3. **Implement erasure and portability** — `DELETE /api/user` (cascade deletes all entries) and `GET /api/entries/export` (full JSON download).
4. **Privacy Policy** — must explicitly state what mood data is collected, legal basis, retention period, and how to request deletion before any public launch.
5. **Standard Contractual Clauses** — sign DPAs with Neon and Vercel for any EU users.

---

## BYOK LLM Insights ("Ask AI")

The **Ask AI** feature applies the same controller-avoidance reasoning to LLM analysis. Instead of proxying mood data through a server to an LLM (which would make you a data controller, and the LLM vendor your processor, for Article 9 data), the browser calls the user's **own** LLM provider directly with the user's **own** API key — **Bring Your Own Key (BYOK)**, mirroring BYOS.

### How it works under GDPR

- The user supplies their own API key for Claude, OpenAI, or Gemini. The key and config live only in the user's `localStorage`.
- Mood data is sent from the user's browser **directly to the provider the user chose**. It never touches our servers — there is no server call in this path at all.
- The user, using their own account, is the one initiating processing with a provider **they** selected and **they** have terms with.

### Guardrails built into the feature

| Guardrail | Purpose |
|-----------|---------|
| **Off by default** (dark-launched behind an env flag) + opt-in | No processing without deliberate activation |
| **Explicit, destination-specific consent gate** | User acknowledges data goes to the named provider under that provider's terms before any request |
| **Aggregates by default; raw notes opt-in** | Data minimisation — only a compact statistical summary is sent unless the user explicitly shares notes |
| **Key + config client-side only** | No credential or mood data reaches our infrastructure |
| **Link to the provider's privacy/retention policy** | Transparency about the downstream controller |

### Remaining obligations

- The **Privacy Policy** should note that if a user enables Ask AI, mood data (and notes, if opted in) is transmitted from their device to the third-party LLM provider they configured, under that provider's terms — and that this is user-initiated and off by default.
- As with BYOS, we take on no new data-controller obligations for the mood data itself, because we never receive or process it server-side.

---

## Decision

**Go with BYOS.** It achieves the primary product goal (cross-device sync) while keeping you out of the role of data controller for sensitive mood data. The **BYOK Ask AI** feature extends the same principle to AI insights.

### BYOS implementation tasks

1. Create `client/src/lib/storage/types.ts` — `StorageProvider` interface and `CloudSyncState` type
2. Implement `client/src/lib/storage/googleDrive.ts` — OAuth popup flow using `drive.appdata` scope (no Google app verification required)
3. Implement `client/src/lib/storage/dropbox.ts` — PKCE OAuth flow + file operations
4. Create `client/src/hooks/useCloudSync.ts` — provider state, merge strategy, auto-restore on mount
5. Create `client/src/components/CloudSyncSettings.tsx` — provider selection, sync status, disconnect UI
6. Integrate into `App.tsx` — debounced sync on entry change, handle offline gracefully

**Environment variables needed:**
```
VITE_GOOGLE_CLIENT_ID=   # Google Cloud Console → OAuth 2.0 client (Web app)
VITE_DROPBOX_CLIENT_ID=  # Dropbox App Console → App key
```

The Next.js backend scaffolding (Prisma, NextAuth, PostgreSQL) remains available for future features requiring server-side identity — such as premium subscriptions or sharing — but should not be used to store mood entry data.
