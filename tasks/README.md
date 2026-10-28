# Tasks

Working notes for agents and teammates; the team's kanban lives in Notion. The `active/` listing is the index — there is no index table.

- **When**: work that spans more than one commit or session. A one-commit fix needs no file.
- **Pair**: every task has two files, so planning and what actually happened stay apart.
  - `YYYYMMDD-<slug>-todo.md` — what to do: plan, todo list, done-when. Copy [`templates/todo.md`](templates/todo.md).
  - `YYYYMMDD-<slug>-lessons.md` — what happened along the way: dated log, then lessons. Copy [`templates/lessons.md`](templates/lessons.md).
- **Layout**: in progress → `active/`; done → `archive/` (flat, no date folders).
- **Finish**: fill **Lessons** in the task's PR and leave both files in `active/`. There is no status field; the maintainer (TaeTaeJin) sweeps the pairs whose PR has merged into `archive/` once a week (one `chore:` PR), so nobody needs a follow-up PR just to move files.
- **devlog**: the [`devlog`](../.claude/skills/devlog/SKILL.md) skill reads the `SRS` field in the todo and the dated **Log** lines in the lessons file — keep them current.
- Files are in English.
