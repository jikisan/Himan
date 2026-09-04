---
name: commit
description: Create a concise Conventional Commit message from the current changes, then stage and commit them.
---

Create a git commit message based on the current code changes.

Requirements:

- Follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, etc.).
- Use a clear, concise summary line in imperative mood.
- Include a short bullet list of meaningful changes when the summary alone is not enough.
- Focus on intent and impact, not implementation trivia.
- Keep language professional and neutral.
- Do not mention Claude, AI, LLMs, assistants, or automation.
- Do not include attribution, signatures, or generated-by notes.

Review the diff, stage all modified and untracked files with `git add`, and execute `git commit` with the generated message. Report only the resulting commit message and commit status.
