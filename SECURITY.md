# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.6.x   | Yes       |
| < 1.6   | No        |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems.

Instead, email **mohmmad.pod@gmail.com** with:

- A description of the issue
- Steps to reproduce
- Impact (what an attacker could do)
- Your suggested fix, if you have one

We aim to respond within **7 days** and will coordinate a fix and disclosure timeline with you.

## Secrets and credentials

- Never commit `.env` — use `.env.example` as a template only.
- ScreenScraper credentials belong in `.env` on your machine, not in source code.
- Do not paste API keys, tokens, or passwords in issues or pull requests.

## User data

X360 Manager stores library data and settings under your OS app-data folder (or a portable `data/` folder). Game files and emulator paths stay on your PC; they are not uploaded to GitHub or any project server by default.
