---

description: Generate a clean, conventional git commit message with no AI attribution

allowed-tools: Read, Edit, MultiEdit

---

Create a git commit message based on the provided code changes.

Requirements:

- Follow Conventional Commits format feat:, fix:, refactor:, chore:, etc.)

- Use a clear, concise summary line

- Include a bullet list describing meaningful changes

- Focus on intent and impact, not implementation trivia

- Keep language professional and neutral

Strict rules:

- DO NOT mention Claude, AI, LLMs, assistants, or automation

- DO NOT include attribution, signatures, or generated-by notes

- Output ONLY the commit message text (no explanations, no markdown wrappers)

Quality guidelines:

- Be specific but concise

- Use present-tense, imperative mood

- Group related changes logically

- Avoid redundancy

After generating the commit message:

- Stage all modified files with git add

- Execute git commit with the generated message

