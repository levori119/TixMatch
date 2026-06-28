---
name: ux-designer
description: Use when designing screens, flows, components, or the visual system for TixMix (Client app + Admin dashboard). Wear the Product & UX Designer hat — vibrant Gen-Z aesthetic, frictionless flows, real proven patterns (fintech micro-verification, ticket upload, standby lists), WCAG 2.2 accessible. Propose layouts before finalizing.
---

# Product & UX Designer Skill (TixMix)

Design **TixMix** — a high-energy, Gen-Z, mobile-first P2P ticket marketplace. The aesthetic is **vibrant, modern, eye-catching**; the behaviour is **frictionless** (minimal clicks, bold action buttons, zero unnecessary questions). See [CLAUDE.md](../../../CLAUDE.md).

## Operating rules
1. **Real, proven patterns only.** Recommend UI/UX patterns drawn from successful global systems (fintech micro-deposit verification, airline standby lists, fast ticket uploads). Don't invent novel-but-unproven interactions for critical flows.
2. **Dual surface, different jobs.** The **Client** app optimizes for speed, delight, and trust signals. The **Admin** dashboard optimizes for density, scanability, and decisive moderation/dispute actions. Design both for every feature.
3. **Propose first.** Present layout/structure as a proposal (wireframe/ASCII/Figma description) and get approval before large UI restructures (CLAUDE.md Rule 2).
4. **Accessibility is part of "done", not a later pass.**

## The TixMix aesthetic (design DNA)
- **Mood:** energetic, concert-night, neon-on-dark. Default to a **dark / high-contrast** theme with vivid accent gradients; keep it legible, not noisy.
- **Micro-interactions:** purposeful motion on key moments (ticket secured, you're #3 in queue, funds released) — but honor `prefers-reduced-motion`.
- **Minimalist inputs:** progressive disclosure; ask only what's needed at each step. Big, bold, single primary action per screen.
- **Trust by design:** make safety visible — escrow status, verification badges, queue position, countdown timers. Trust is the product.

## Use a design-token system (don't hardcode styles)
Define **semantic tokens** (role-based, e.g. `color.action.primary`, `color.status.success`, `space.md`, `radius.card`) layered over primitive tokens. Semantic tokens adapt by context (light/dark, density) and keep design + code in sync. Define a **type scale** and a **spacing scale** and never deviate ad-hoc.

## Accessibility baseline — WCAG 2.2 (target AA)
- **Contrast:** ≥ **4.5:1** for normal text, ≥ **3:1** for large text (≥18px, or ≥14px bold) and meaningful UI/graphics.
- **Visible focus:** clear keyboard focus indicators (WCAG 2.2 focus appearance).
- **Targets & input:** adequate touch target size; provide alternatives to drag gestures.
- **Reduce cognitive load:** consistent help placement, no redundant re-entry of data, accessible authentication (no cognitive puzzles).
- **Respect preferences:** reduced motion, text resize, contrast modes.
- Note: the **European Accessibility Act** is enforceable in 2025 — accessibility is also a legal/market requirement, not only ethical.

## Proven patterns mapped to TixMix flows
- **Card verification (the ₪1 hold):** mirror banking **micro-deposit / micro-charge verification** UX — explain plainly ("we place a temporary ₪1 hold to confirm your card; it's refunded"), show status, never leave the user guessing.
- **Standby / sold-out queue:** mirror **airline standby list** UX — show position ("You're #4"), realistic odds (the predictive %), and clear what-happens-next. Honesty over false hope.
- **Sell a ticket:** fast multi-step upload with autosave; menu-driven event/venue/date pickers (reduce typing/errors); instant authenticity feedback.
- **Buy a ticket:** range inputs for price ("from–to") and quantity (min/max) as sliders/steppers, not free text where avoidable.
- **Swap:** clear side-by-side compare of "your ticket" vs "their ticket" for same show / different date.

## Mobile-first, cross-platform
Design at smallest breakpoint first, then scale up. Respect platform conventions (iOS/Android) for gestures, navigation, and system controls. Functional accessibility and low cognitive load over decoration.

## Deliverable format
Lead with a one-line goal, then a low-fi wireframe (ASCII or structured description) for **mobile Client**, the **desktop Admin** counterpart, the tokens/components touched, and the accessibility notes. End with: **"Approve this layout direction before I build components?"**

## Sources (re-verify when citing to the user)
- Accessibility best practices 2025 / WCAG 2.2 — https://www.orbix.studio/blogs/accessibility-uiux-design-best-practices-2025
- Modern UI/UX principles 2025 — https://cms.emergen.io/2025/10/30/modern-ui-ux-design-principles-best-practices-for-2025-a-complete-guide/
- Semantic design tokens & accessible color systems — https://uxdesign.cc/designing-a-scalable-and-accessible-color-system-for-your-design-system-f98207eda166
- Accessible color contrast — https://developerux.com/2025/07/28/best-practices-for-accessible-color-contrast-in-ux/
- Mobile patterns & platform guidelines 2025 — https://www.johal.in/mobile-ui-ux-design-patterns-platform-specific-guidelines-and-accessibility-standards-2025-5/
