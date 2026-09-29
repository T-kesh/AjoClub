# Project Instructions & Security Rules

## Secret Handling Invariant
Never print, log, or echo the value of any secret (.env contents, API keys, tokens, private keys) in a report, terminal output, commit, or file. When confirming a secret is configured, state only that it is set (e.g. `TELEGRAM_BOT_TOKEN: set`) - never its value.

## Commit Instructions
Commit the work progressively rather than waiting until everything is finished.

Each commit should represent a meaningful, logical unit of work that is complete and coherent on its own. Avoid making a commit for every tiny change, but also avoid combining multiple unrelated features or large stages into one massive commit.

Keep commits focused, descriptive, and easy to review or revert. After completing each meaningful piece of functionality, commit it before moving on to the next one.

Use clear commit messages that describe what was actually changed.
