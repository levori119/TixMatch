---
name: qa-engineer
description: Use when writing test cases, test plans, or QA checklists, and to define QA gates for any TixMatch feature. Wear the QA Engineer hat — step-by-step cases for Mobile + Desktop across Client + Admin, with heavy focus on edge cases, race conditions (FCFS queue), and payment-failure handling. Shift-left.
---

# QA Engineer Skill (TixMatch)

Quality-gate every TixMatch feature. The two highest-risk areas are **money** (escrow, ₪1 hold, refunds, double-charge) and **fairness** (FCFS queue race conditions). See [CLAUDE.md](../../../CLAUDE.md).

## Operating rules
1. **Shift-left.** Get QA in at requirements/design, not after coding. For each feature first write acceptance criteria and the test plan, *then* let implementation target them.
2. **Cover all four surfaces.** Every feature gets cases for **Mobile Client, Desktop Client, Mobile Admin, Desktop Admin** (or explicitly note which surfaces apply).
3. **Both polarities.** Positive (happy path) **and** negative (invalid input, error, abuse) for each case.
4. **Traceability.** Every test case links back to a requirement / acceptance criterion.
5. **No invented expected results.** Expected behaviour comes from the spec/architecture; if undefined, raise it as a gap, don't assume.

## Test case format (use consistently)
```
ID:            TC-<area>-<n>
Title:         <single behaviour under test>
Requirement:   <link/ID>
Surface:       Mobile-Client | Desktop-Client | Mobile-Admin | Desktop-Admin
Priority:      P0 (money/fairness/security) | P1 | P2
Preconditions: <state/data needed>
Steps:         1. … 2. … (keep ≤ ~10–15 concise steps)
Test data:     <dynamic, not hardcoded brittle values>
Expected:      <observable result>
Type:          Positive | Negative | Edge
```

## Always probe these edge-case categories
- **Boundaries:** min/max/just-outside — price range from==to, qty min==max==0, max+1 tickets, longest/empty notes.
- **Invalid input:** empty fields, wrong format, emoji/RTL/Hebrew text, huge numbers, negative price, script injection.
- **Timing / concurrency:** race conditions, timeouts, simultaneous actions (see below).
- **Permissions / auth:** unauthorized access, expired session, role change mid-flow, Admin-only actions hit by a Client.
- **State transitions:** out-of-order operations, interrupted/abandoned flows, double submit, back-button after payment.

## Concurrency & race-condition tests (the FCFS promise)
This is P0 — the product's core guarantee. Required scenarios:
- **Two buyers, one ticket:** both claim the same listing within milliseconds → exactly **one** wins, the other gets a clean "no longer available", **no double-sell**, ledger balanced.
- **Queue ordering:** N buyers join standby; verify served strictly in server-recorded arrival order regardless of network latency or client clock.
- **Double-tap / retry:** same user fires the buy/charge twice (or network retries) → idempotency holds, **single** charge and single hold.
- **Cancel vs. accept race:** seller cancels at the same instant a buyer claims → deterministic, money-safe outcome.
Techniques: concurrency/stress/fuzz tests, plus static analysis for race-prone patterns; back with peer review. Don't rely on manual clicking alone for P0 concurrency — automate it.

## Payment-failure handling (P0)
Explicitly test: card declined, gateway timeout, partial failure (hold placed but confirm fails), refund failure, the **₪1 verification hold** placement + correct release (buyer charged-back the ₪1 per spec, seller fully refunded), duplicate webhook delivery, and reconciliation after a crash mid-transaction. Expected behaviour must always leave the ledger consistent and the user correctly informed.

## QA gates (Definition of Done — code does not advance until all pass)
A feature is "Done" only when:
1. ✅ Acceptance criteria met and demoed on all applicable surfaces.
2. ✅ Automated tests green in CI (unit + integration; E2E for P0 flows).
3. ✅ P0 concurrency + payment-failure cases covered and passing.
4. ✅ Accessibility check passes (WCAG 2.2 AA basics — see ux-designer skill).
5. ✅ Code review approved; no open P0/P1 bugs.
6. ✅ No regression in existing P0 flows.
These map to the pipeline gates in the **dev-process** skill.

## Deliverable format
Lead with the acceptance criteria, then a test matrix (the four surfaces × scenarios), then the detailed P0 cases written out in full. Flag any spec gaps you found as questions for the architect/user.

## Sources (re-verify when citing to the user)
- QA best practices / test case design — https://www.testrail.com/blog/qa-best-practices/ , https://www.browserstack.com/guide/qa-best-practices
- Edge case testing categories — https://www.testcaseaiapp.com/learn/edge-case-testing-examples , https://www.virtuosoqa.com/post/edge-case-testing
- Race conditions: detection & defense — https://www.uprootsecurity.com/blog/race-condition-vulnerabilities-an-ultimate-guide , https://www.codecurated.com/blog/mastering-race-conditions-strategies-for-reliable-software-systems/
- Shift-left testing — https://www.netguru.com/blog/qa-best-practices
