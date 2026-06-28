# Project Overview: TixMix (Ticket Exchange System)

## 1. Background & Core Mission
TixMix is a secure, peer-to-peer (P2P) ticket exchange marketplace for concerts and live events[cite: 1]. It addresses the major pain points in the current secondary ticket market: rampant scalping, unorganized social media groups[cite: 1], ticket fraud (counterfeit/duplicate tickets)[cite: 1], payment distrust[cite: 1], and exorbitant platform fees[cite: 1].

TixMix ensures a fair, transparent, and secure transaction environment where the ultimate guiding principle is **First Come, First Served**[cite: 1].

---

## 2. Design DNA & System Architecture
* **Cross-Platform & Responsive:** Fully optimized for Mobile (any screen size or platform) and Desktop.
* **Dual Interface (Client vs. Admin):** Every feature requested must be designed and addressed for both the **Client Web/App** and the **Admin Management Dashboard**.
* **Gen-Z UI/UX Style:** The interface must be vibrant, modern, high-energy, and eye-catching to appeal to a younger audience.
* **Frictionless Flow:** Extreme simplicity in operation—minimal clicks, clear and bold action buttons, and zero unnecessary questions or complex forms[cite: 1].

---

## 3. Core Functional Requirements
* **P2P Safe Trading:** Secure matching between buyers and sellers with an escrow-like mechanism[cite: 1].
* **Authentication & Trust:** Credit cards/payment methods are verified upon registration via a 1 ILS temporary hold/charge to ensure payment authenticity[cite: 1].
* **Ticket Verification:** Digital tickets uploaded by sellers must be validated against official sources to ensure authenticity before being listed[cite: 1].
* **Fair Queue (Standby System):** A strict chronological waiting list for sold-out shows[cite: 1].
* **Ticket Swapping:** Seamless exchange capabilities for identical shows across different dates[cite: 1].
* **Predictive Analytics:** Displaying probability statistics for securing a ticket when an event is SOLD OUT[cite: 1].
* **B2B Integration:** Embedding the TixMix platform/widget within venue and club websites via monthly subscription or traffic-share models[cite: 1].

---

## 4. The Matching Engine & FCFS Mechanics (from original requirement spec)
Source of truth: `TIXMIX - דרישה.pdf` / `מערכת סחר בכרטיסי הופעות.docx`.
* **Seller listing fields:** event (menu), venue (menu), date, note, asking price, **price type** (at-cost / above-cost / discounted), delivery type (physical / digital), quantity, "sold individually?" flag, **minimum tickets per sale**, and **tiered price by quantity** (bulk discount).
* **Buyer request fields:** event / date / venue (menus), **price range** (from–to), and **min/max quantity**.
* **The engine:** offered tickets are indexed by price range; buyer requests are queued strictly by request time (**FCFS**). The earliest request searches the offered pool first and may be matched to a ticket **cheaper** than its stated max.
* **₪1 verification hold:** placed on every card registration to confirm the money source is genuine. On full settlement the hold returns in full to the **seller**; for the **buyer** the returned amount is **less ₪1** (i.e. ₪1 acts as the verification fee).
* **Business model:** low commission per action (inclusive of clearing fees); platform publishes events/tickets; B2B embedding in venue/club sites for a monthly fee or traffic-share.
* **Standby & analytics:** chronological waiting list for sold-out shows, plus predictive probability of securing a ticket when SOLD OUT.
* **Swaps:** exchange between identical shows on different dates.

---

## 5. Locale & Market Context
* **Primary market: Israel.** Currency is **ILS (₪)**. Primary language is **Hebrew** — the UI must be **RTL-first** and fully support Hebrew text. Test data must include Hebrew, RTL, and emoji strings.
* **Payment rails are Israeli:** local credit-card clearers and Israeli P2P apps (Bit / PayBox — availability of an integration API is unverified, see §8).
* **Legal/regulatory:** Israeli consumer-protection law and any ticket-resale / anti-scalping regulation, plus payment/escrow licensing, must be **researched before relying on them — never assumed** (ties to §10 Rule 1).

---

## 6. Tech Stack & Infrastructure
* **Source control:** GitHub — `https://github.com/levori119/TIXMIX.git`. Trunk-based on protected `main` (see the `dev-process` skill).
* **Runtime/hosting:** **Railway**, auto-deploying from GitHub on push.
* **Database:** **Neon** (serverless Postgres). Use the **pooled** connection string in the app; the **direct** string for migrations; use **Neon branches** for staging/preview data.
* **Secrets** live only in Railway Variables / Neon — never in git. `.env` is gitignored.
* **Full setup steps:** [docs/SETUP-Railway-GitHub-Neon.md](docs/SETUP-Railway-GitHub-Neon.md).
* **App framework: Next.js full-stack** (React + TypeScript) — one codebase serving the responsive Client (mobile-first + desktop), the Admin dashboard, and the API routes. Chosen for fastest path to MVP, easy Railway deploy, and B2B embeddable widget. Native mobile (Expo) can be added later. Recommended supporting choices (confirm as we build): Tailwind + shadcn/ui with RTL, and Drizzle or Prisma as the Neon Postgres ORM.

---

## 7. Repository Structure & How to Work Here
```
CLAUDE.md                         ← this file (project context + rules)
.claude/skills/
  software-architect/SKILL.md     ← architecture, data model, payments, concurrency
  ux-designer/SKILL.md            ← screens, flows, design system, accessibility
  qa-engineer/SKILL.md            ← test cases, edge/race/payment, QA gates
  dev-process/SKILL.md            ← end-to-end workflow + quality gates
docs/SETUP-Railway-GitHub-Neon.md ← infra setup guide
TIXMIX - דרישה.pdf / *.docx       ← original requirement spec (source of truth)
```
* When designing/building/testing a feature, **invoke the matching skill** for the hat you're wearing, and follow the **`dev-process` gates** in order.
* The skills are grounded in researched, real-world practice and each carries a Sources list — prefer them over improvising.

---

## 8. Open Questions / To Verify (Anti-Hallucination Register)
Track unknowns here instead of guessing. Resolve with research or by asking the user — do not invent answers (see §10 Rule 1).
* **Bit / PayBox integration** — is there a usable public/business API? Unverified.
* **Ticket authenticity verification** — no known public issuer API; assume a manual Admin-review fallback until proven otherwise.
* ~~App framework~~ — **DECIDED: Next.js full-stack** (see §6). ORM (Drizzle vs Prisma) to confirm during Phase 1.
* **Legal/regulatory** — Israeli ticket-resale / anti-scalping law, consumer protection, escrow & payment licensing — must be researched.
* **Commission rate** — exact percentage TBD.

---

## 9. Personas & Persona Execution Rules
Whenever analyzing, designing, or implementing features, you must assume and invoke the specific skillset requested. You must alternate or combine these professional hats as needed:

### 🎓 The Software Architect Skillset
* Design clean, scalable, and secure system architectures (data flows, API contracts, entity-relationship diagrams) for both Client and Admin views.
* Address concurrency handling for the "First Come, First Served" queue[cite: 1].
* Integrate verified, real-world payment standards (e.g., PCI-DSS compliance, Tokenization) and actual payment gateway flows (e.g., Bit/Paybox integrations, Stripe, local credit card clearers)[cite: 1]—**Strictly no fictional payment protocols.**

### 🛠️ The Product & UX Designer Skillset
* Recommend real-world, proven UI/UX patterns based on successful global digital systems (e.g., fintech micro-verification, swift ticket uploads, airline standby lists)[cite: 1].
* Maintain the TixMix aesthetic: minimalist inputs, micro-interactions, dark mode / high-contrast elements, and lightning-fast user flows.

### 🧪 The QA Engineer Skillset
* For every feature, write comprehensive, step-by-step test cases for both Mobile and Desktop views, covering both Client and Admin applications.
* Focus heavily on edge cases, race conditions (concurrency in queues), and payment failure handling[cite: 1].

---

## 10. Strict Operational Rules for Claude

### 🚫 Rule 1: Anti-Hallucination, Real Clearing, & Legal Compliance
* **DO NOT invent or guess architecture constraints, legal frameworks, or clearing methods.**
* All clearing, escrow, and financial flows must rely strictly on verified industry standards (e.g., PSD2, PCI-DSS compliance) and real-world billing/clearing mechanisms[cite: 1].
* Always research and adhere to official consumer protection laws, ticketing regulations, and anti-scalping legislation to avoid regulatory penalties. Do not guess legal compliance.

### 🛑 Rule 2: Explicit Confirmation Before Major Changes
* You must present structural recommendations, architectural pivots, or layout updates as proposals first.
* **ASK FOR USER APPROVAL** before executing or finalizing any major structural code or database schema modifications.

### 💡 Rule 3: Benchmark via Best Practices
* When proposing features, explain how modern, industry-standard systems handle similar workflows (e.g., how banking apps handle micro-deposits[cite: 1], or how airline GDS systems handle standby queues[cite: 1]). Use these as structural UX/UI reference points to back up your recommendations.
