# BE: pass the student's secret values to the leader's k8s Secret (W3) and read the state (#43, #82)

- **SRS**: none (W3 of the deploy workflow; issues [#43](https://github.com/woowangthon/WOOWANGTHON_TEAM_18/issues/43), [#82](https://github.com/woowangthon/WOOWANGTHON_TEAM_18/issues/82), FE [#83](https://github.com/woowangthon/WOOWANGTHON_TEAM_18/issues/83))
- **Owner**: TaeTaeJin
- **Branch**: feat/be-secrets (stacked on feat/be-k8s-space, PR #106, which is #81)

## Plan

W3: the server takes the values of `runtime.secretKeys` from the user and writes them to the Secret `<service>-secrets` in `proj-<slug>` over the connection of #81. The server account can create and replace a Secret but not read or patch it, so **a send replaces a service's whole Secret**: the sent key set must equal the service's `secretKeys`, services may be sent separately, no per-key partial send. That is decided in the contract (`docs/design/api.md` "비밀값") and sent to FE (#83) before the code.

State: Supabase `deploy_secrets` (slug × service: key names, `writing` / `in`, sha256 of the key/value pairs). Never the values. `writing` is recorded before the cluster call and `in` after it, so no failure leaves `in`. `ready` and `secretHash` are computed on read from those rows; the same GET serves the "build ready" read of #82. `PUT` / `GET /api/deploys/:id/secrets`, owner only.

Left for the #82 PR: `DeployReadinessService.prepareIfReady(deployId)` (calls `DeployConditionService.prepare` with the hash only when ready, else 409 `NOT_READY` with `fields`), agreed with the #44 worker.

## Todo

- [x] Contract first (`api.md`, `auth.md`) and send it to FE — files: `docs/design/api.md`, `docs/design/auth.md`
- [x] `K8sClient.replace` (PUT), `create` returns created / exists; `SecretService.write` — files: `BE/src/k8s/`
- [x] Validation, digests, status as pure functions — files: `BE/src/deploys/secrets-input.ts`
- [x] `SecretsService`, controller routes, store methods, migration — files: `BE/src/deploys/`, `supabase/migrations/20261111000000_create_deploy_secrets.sql`
- [x] Body-parse error message no longer repeated (it carries a piece of the body) — files: `BE/src/common/api-exception.filter.ts`
- [x] Tests: unit (validation, hashes with independently computed values, status), `SecretService` against a fake k8s, e2e through the app with a fake Supabase and a fake k8s; checks that no value is in any response, log, database row or request to the database
- [x] Hand mutants (no BE mutation tool, #67): 41 mutants on the changed decision lines, 41 killed (one equivalent-looking survivor was a test gap: a `writing` row with a stale digest, now tested)
- [ ] `pnpm verify`, `/code-review low`, `/simplify`

## Done when

- [ ] `pnpm verify` exit code 0 seen
- [ ] PR body says "실제 클러스터 미확인" and that the migration was not applied to the real Supabase
- [ ] tests added; mutation survivors resolved or explained
