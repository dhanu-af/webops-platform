<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# WEB OPS project notes

Read `HANDOVER.md` in this directory first, before anything else — it has the current build state, what's verified working, and the roadmap so you don't re-derive context that's already been figured out.

This is a standalone project — a digital facility operations & compliance platform (checklists, 5S, photo evidence, 3-level verification, corrective actions, area release, audit trail). It is deliberately **separate** from the user's other Next.js/Prisma apps on this machine (BlendCaps Ops Platform, Fudgee, etc.) — do not cross-reference or merge them.
