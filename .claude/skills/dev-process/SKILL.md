---
name: dev-process
description: Use to drive how any TixMix feature moves from idea to production — the end-to-end development workflow with built-in QA stages and quality gates (GitHub trunk-based flow, CI/CD, Railway deploy, Neon Postgres). Invoke at the start of a feature to plan the steps, and at each gate to check readiness.
---

# Development Process Skill (TixMix)

The pipeline that ties the **architect → designer → QA** skills together and ships safely to **Railway** (runtime) from **GitHub** (source) on **Neon Postgres** (DB). See [CLAUDE.md](../../../CLAUDE.md). Combine the relevant persona skill at each phase.

## Branching model: trunk-based development
- `main` is always **green** (deployable at every commit). Protect it: PRs required, status checks must pass, no direct pushes.
- Work on **short-lived feature branches** (hours to ~1 day), merged via PR. Keep changes small and frequent — integrate daily.
- Use **feature flags** to decouple deploy from release: ship dark, enable when QA-approved. This lets unfinished work live on `main` safely.
- This is the model that actually supports CI/CD; Gitflow's long-lived branches don't.

## The lifecycle of a feature (with QA baked in — shift-left)

**Phase 0 — Define (shift-left QA + architect)**
- Architect: entity/API/state-machine proposal → **get user approval** before schema work (CLAUDE.md Rule 2).
- QA: write acceptance criteria + test plan *now*, before code.
- Designer: layout proposal for Client + Admin → get approval.
- 🚦 **Gate 0:** approved spec + acceptance criteria + design direction.

**Phase 1 — Build**
- Branch off `main`. Implement behind a feature flag if risky.
- Write tests alongside code (unit + integration; E2E for P0 money/queue flows).
- Run lint, type-check, tests, and a security scan locally before pushing.

**Phase 2 — Integrate (CI on every PR)**
CI must run automatically on each PR and block merge on failure. Required checks:
- ✅ Build succeeds
- ✅ Lint + type-check
- ✅ Unit + integration tests pass; coverage not regressed
- ✅ P0 concurrency + payment-failure tests pass (qa-engineer skill)
- ✅ Security/dependency scan clean
- ✅ DB migration applies cleanly (and has a rollback)
- 🚦 **Gate 1 (Quality Gate):** all checks green = "is this ready to advance?" If red, fix before anything else.

**Phase 3 — Review**
- At least one human review on the PR; reviewer checks correctness, security, and that QA cases exist.
- 🚦 **Gate 2:** review approved, no open P0/P1.

**Phase 4 — Stage & verify**
- Auto-deploy the branch/PR to a **Railway preview/staging environment** pointed at a **non-production Neon branch** (Neon's DB branching gives an isolated copy for testing).
- QA runs the test matrix on staging across the four surfaces (Mobile/Desktop × Client/Admin).
- 🚦 **Gate 3 (Definition of Done):** acceptance criteria demoed, accessibility basics pass, no regressions.

**Phase 5 — Release**
- Merge to `main` → Railway auto-deploys production. Run migrations forward-compatibly (expand/contract).
- Flip the feature flag on (gradually if possible). Watch logs/metrics.
- 🚦 **Gate 4:** healthy in prod; rollback plan ready (revert commit + flag off + migration down).

## Quality gates summary
A **quality gate** is a set of measurable conditions that must pass before code advances a stage. Nothing skips a gate. The gates above are the single source of "done" — they mirror the QA skill's Definition of Done.

## Environments & data
- **Local** → developer machine, local or Neon dev branch.
- **Staging/Preview** → Railway environment + Neon branch (throwaway, seeded test data).
- **Production** → Railway prod + Neon primary. Secrets only in Railway Variables / Neon, **never** in git (`.env` is gitignored).

## Migrations rule
Always reversible and forward-compatible (expand → migrate → contract), because trunk-based + auto-deploy means old and new code briefly coexist. Never write a migration that breaks the currently-running version.

## When invoked, do this
1. Identify the phase the feature is in.
2. Pull in the matching persona skill (architect / designer / qa-engineer).
3. State which gate is next and exactly what's required to pass it.
4. Don't let work jump a gate; if a gate fails, that's the only priority.

## Sources (re-verify when citing to the user)
- Trunk-based development — https://www.atlassian.com/continuous-delivery/continuous-integration/trunk-based-development , https://productdock.com/trunk-based-development/
- Quality gates — https://www.sonarsource.com/learn/quality-gate/ , https://docs.sonarsource.com/sonarqube-server/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates
- Railway + Neon deploy — https://neon.com/docs/guides/railway , https://docs.railway.com/guides/express
