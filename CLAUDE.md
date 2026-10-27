# CLAUDE.md

> The **single entry point** for this repository. Every AI agent and teammate reads this before starting work.
> Project rules live **only in this file**. `AGENTS.md` just imports it (for tools that read `AGENTS.md`).
> If personal or global instructions conflict with this repo's rules, the repo rules win.
> **Language**: reply to the user in Korean. Agent-facing files (this file, skills, `docs/conventions.md`, `tasks/`) are written in English; human-facing docs (`docs/SRS.md`, `hackathon`, `design/`, `adr/`, `ai-scope`, `pitch`) and PR descriptions are written in Korean.

## 0. Project (TBD)

- **What**: TBD — one sentence on the product. Full requirements: [`docs/SRS.md`](docs/SRS.md).
- **Who**: Team 18 왕가네식구들 (`@woowangthon/18`), 2026 AI 우왕톤 — theme *"AI는 동료가 될 수 있을까?"*
- **Stack**: TBD — decided in [`docs/adr/001-stack.md`](docs/adr/001-stack.md). Architecture: [`docs/SRS.md`](docs/SRS.md) §2. Module designs and the FE/BE/AI contract: [`docs/design/`](docs/design/README.md).
- **Repo**: [`woowangthon/WOOWANGTHON_TEAM_18`](https://github.com/woowangthon/WOOWANGTHON_TEAM_18) (`upstream`, judged) — one monorepo. Code under `apps/*` (TBD), docs under `docs/`, task notes under `tasks/`.
- **Notion devlog DB**: TBD — the URL the [`devlog`](.claude/skills/devlog/SKILL.md) skill writes to.

## 1. Hard constraints (hackathon rules — never trade these for speed)

Source of every fact here: [`docs/hackathon.md`](docs/hackathon.md).

1. **Deadline freeze.** Judging uses the `main` commit hash at **2026-11-15 18:00 KST**. After that, nothing pushed to `main` counts; warn before any push to `main` after the deadline.
2. **No faked results.** Never hardcode an output and present it as live behavior. Mocks, samples and test accounts are allowed **only** when marked in code (`MOCK(<id>):` / `SAMPLE(<id>):`, see [`docs/conventions.md`](docs/conventions.md)) and listed in [`docs/ai-scope.md`](docs/ai-scope.md).
3. **AI scope is declared.** Adding, swapping or removing an AI model, external API, library or dataset updates [`docs/ai-scope.md`](docs/ai-scope.md) in the same commit — including features where AI is *not* applied or *not* verified.
4. **No secrets in git.** API keys go in `.env` (git-ignored) and the deploy platform's env settings. The repo is public.
5. **The demo path works first.** P0 use cases in `docs/SRS.md` §3.2 are the demo path. Nothing P1 lands while a P0 is broken.

## 2. How we work (SDD + Task Workflow)

We adopt [Spec-Driven Development](https://github.com/github/spec-kit) **as a methodology only** — no slash commands, no extra tooling. Skip a step only when it truly does not apply; keep the order. A one-commit fix needs no task pair.

0. **Principles** — before starting, read [§3 Coding principles](#3-coding-principles) and [`docs/conventions.md`](docs/conventions.md).
1. **Spec** — find the `UC-xx` and `FR-xx-yy` this work serves in [`docs/SRS.md`](docs/SRS.md) (§3 use cases, §4 functional requirements, §5 non-functional). No FR → ask before building.
2. **Plan** — write down the approach and trade-offs before touching code (no over-engineering). A decision that is expensive to reverse (stack, data store, AI model, API shape) gets an [ADR](docs/adr/README.md). A module's internal design goes in [`docs/design/`](docs/design/README.md) right before you implement it. Before changing an API between FE/BE/AI, update [`docs/design/api.md`](docs/design/api.md) first.
3. **Task** — work spanning more than one commit or session gets a [task pair](tasks/README.md) in `tasks/active/`: `YYYYMMDD-<slug>-todo.md` (what to do: **Plan**, **Todo**, **Done when**) and `YYYYMMDD-<slug>-lessons.md` (what happened along the way: **Log**, **Lessons**), copied from `tasks/templates/`. Update the Log as you go.
4. **Branch + build** — branch from `upstream/main`. **Code and tests are a pair**: a behavior change lands with its tests in the same commit, never "tests later". Define the success criteria first, write tests that fail without the change, implement, and iterate until green. Before opening the PR, run **mutation testing** on the code you changed; every surviving mutant gets either a new test or a one-line reason in the PR body. Every commit passes lint and tests. The test and mutation tools are chosen with the stack ([`docs/adr/001-stack.md`](docs/adr/001-stack.md)) and their commands go in [Commands](#commands). Commit format: [§5](#5-git).
5. **Self review (recommended)** — before opening the PR, run `/code-review` and `/simplify` once on the branch (the review level is your call), fix what is real, and re-run the tests. Skip on trivial changes; a teammate's review is the gate. Whether an agent can launch them depends on its harness (`/code-review ultra` is always user-triggered); when it cannot, say so and ask — never let a skipped review read as a clean one. Non-blocking findings you leave become known limitations in the PR body.
6. **Sync + open PR** — `git fetch upstream && git rebase upstream/main` to surface conflicts before pushing. Title ≤70 chars; body = the [PR template](.github/pull_request_template.md). CodeRabbit reviews every PR automatically.
7. **Address review** — evaluate each finding technically; push back with reasoning when wrong. Reply in the comment thread, not top-level (`gh api repos/woowangthon/WOOWANGTHON_TEAM_18/pulls/{pr}/comments/{id}/replies`). If `main` moved during review, rebase again.
8. **Before merge / done** — confirm CI green and one teammate's approval. If the UI or a flow changed, walk the demo path yourself. Fill the lessons file's **Lessons** in the PR; leave the files in `tasks/active/` — a maintainer sweeps merged tasks into `tasks/archive/` weekly. A lesson worth keeping for everyone goes into [Pitfalls](#pitfalls) or [`docs/conventions.md`](docs/conventions.md) in the same PR. Squash merge, then start a new session for the next task. At the end of the day, run `devlog` to post to Notion ([`.claude/skills/`](.claude/skills/README.md)).

**`gh` and remotes**: pass `--repo` explicitly to any `gh` command run outside this directory or when switching between `upstream` and `origin`, so it never targets the fork by accident.

**Delegating work**: hand repo-wide fact-finding (where is X defined, which files reference Y) to a search/explore-style sub-agent when your tool has one (Claude Code's `Explore`). Small, localized edits are done directly. **Judgement calls are never delegated** — what a feature should do and which trade-off wins stay with whoever is accountable, so ask the human. When another project's solution is the reference, take what it defends against, not how it calls the API.

## 3. Coding principles

The four [Karpathy guidelines](https://github.com/multica-ai/andrej-karpathy-skills):

1. **Think before coding** — don't assume. If ambiguous, surface the trade-off and ask.
2. **Simplicity first** — minimum code that solves the problem. No unrequested features, abstractions or defensive code.
3. **Surgical changes** — touch only what the task needs; follow the existing style.
4. **Goal-driven execution** — define a verifiable success check and iterate until it passes.

Checkable rules: [`docs/conventions.md`](docs/conventions.md).

## 4. Doc routing (TBD)

| When you need | Read |
| --- | --- |
| Hackathon rules, schedule, scoring, submissions | [`docs/hackathon.md`](docs/hackathon.md) |
| What to build (UC / FR / NFR), architecture, demo scenario | [`docs/SRS.md`](docs/SRS.md) |
| Module design, FE/BE/AI API contract | [`docs/design/`](docs/design/README.md) |
| Why a technical choice was made | [`docs/adr/`](docs/adr/README.md) |
| Code rules, markers, commits | [`docs/conventions.md`](docs/conventions.md) |
| What is AI / mock / external / unverified | [`docs/ai-scope.md`](docs/ai-scope.md) |
| Presentation and demo video | [`docs/pitch.md`](docs/pitch.md) |
| Task notes | [`tasks/`](tasks/README.md) |
| Skills and plugins | [`.claude/skills/README.md`](.claude/skills/README.md) |

Link to docs with plain paths, never `@path` — an `@` import loads the whole file into every session, a plain link is read only when needed. Korean docs are the ones judges and teammates read; English ones are for agents. Code identifiers, commit prefixes and `MOCK(<id>)`/`SAMPLE(<id>)` markers stay in English.

### Where things are recorded

| Place | Holds | Why there |
| --- | --- | --- |
| This repo | Spec, decisions, code, task notes | Agents read it; it is what gets judged |
| Notion team page | Meetings, kanban, devlog, retro | Required submission; judged for the Notion prize |
| Discord | Organizer notices and questions (`#질문-문의`) | The official channel |

Decisions made in Notion or chat land here as an ADR or an SRS edit. Sync runs one way, into the repo.

## 5. Git

- **Commit prefixes**: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`.
- **Commit messages**: subject ≤70 chars says *what* changed; the body says *why*; blank line 2. In shell, use multiple `-m` flags or `$'...'` for real newlines — not `\n` inside `"..."`.
- **Remotes**: `upstream` = the team repo above, `origin` = your personal fork. Branch from `upstream/main`, push the branch to `origin`, open the PR into `upstream/main`. Fork PRs get no repository secrets in CI.
- **Branches**: `<type>/<slug>` (e.g. `feat/upload-form`). Never commit to `main` directly.
- **PRs**: fill [`.github/pull_request_template.md`](.github/pull_request_template.md); one teammate approves; squash merge. CodeRabbit's comments are advice ([`.coderabbit.yaml`](.coderabbit.yaml)); a teammate's approval is the gate.
- **`main` is protected** by a ruleset (PR + 1 approval, no force push, no deletion, squash only, no bypass). Every teammate is a repo admin, so the ruleset guards against accidents, not people. Emergency near the deadline with no reviewer: an admin sets the ruleset to *Disabled*, merges, and sets it back to *Active* immediately — then says so in the team chat.
- A change and the doc it affects go in the same PR.

## Commands

TBD — once the stack is decided, list install, dev server, lint, test, mutation-test and build commands here.

## Pitfalls

None yet — add lessons everyone should know as they come up ([§2 step 8](#2-how-we-work-sdd--task-workflow)).
