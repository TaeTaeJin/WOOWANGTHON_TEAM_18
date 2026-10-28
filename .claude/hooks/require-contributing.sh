#!/usr/bin/env bash
# PreToolUse(Bash): block `git commit` / `gh pr create` until CONTRIBUTING.md was read in this session.
# ponytail: string-matches the raw hook JSON so teammates need no jq; fails open if the transcript is missing.
input=$(cat)
printf '%s' "$input" | grep -Eq '"command": *"(\\.|[^"\\])*(git( +-[Cc] +[^ ]+)* +commit|gh pr create)' || exit 0
transcript=$(printf '%s' "$input" | sed -n 's/.*"transcript_path": *"\([^"]*\)".*/\1/p' | sed 's/\\\\/\\/g')
[ -f "$transcript" ] || exit 0
grep -Eq '"file_path": *"[^"]*CONTRIBUTING\.md"' "$transcript" && exit 0
echo "Blocked by .claude/hooks/require-contributing.sh: open CONTRIBUTING.md with the Read tool (§1 steps 4-8, §2), confirm the change follows it, then retry the same command in a later message." >&2
exit 2
