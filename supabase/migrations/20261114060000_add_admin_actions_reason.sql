-- 운영자 강제 중지의 사유. 학생 화면에 그대로 보인다. 예전 기록은 사유가 없어 null이고, 새 기록은 1–200자다.
-- 계약: docs/design/api.md "운영자 API", "배포 목록 · 진행 상태"의 `stoppedByAdmin`.
-- 적용: Supabase 대시보드의 SQL Editor에 붙여 넣어 실행하거나 `supabase db push`.

alter table public.admin_actions
  add column reason text check (reason is null or char_length(reason) between 1 and 200);
