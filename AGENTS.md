<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax


<!-- nx configuration end-->

# Moving Day — App-Specific Agent Guidelines

## Project Overview

This is a personal moving-day app for Leo. It has three public sections (Showcase, Updates, Admin) and a Claude-powered agentic backend running in a Firebase Cloud Function.

**Stack**: Angular 19 + AngularFire + DaisyUI 4 + Tailwind CSS + Firebase (Hosting, Firestore, Auth, Functions) + Anthropic SDK

## Available Agents

Specialized agents live in `.github/agents/`. Use them for their designated tasks:

| Agent | File | When to use |
|---|---|---|
| Template Validator | `template-validator.agent.md` | After editing any `.html` template — verify all bindings, events, and trackBy functions exist in the `.ts` class |
| Security Reviewer | `security-reviewer.agent.md` | Before any production deploy — checks Cloud Function auth, Firestore rules, and placeholder secrets |
| Unit Test Writer | `unit-test-writer.agent.md` | When adding or modifying services, models, or guards |
| Agent Tool Scaffolder | `agent-tool-scaffolder.agent.md` | When adding a new tool to the Claude agentic loop in `functions/src/index.ts` |
| DaisyUI Component Writer | `daisyui-component-writer.agent.md` | When creating new Angular components — ensures consistent use of the `movingday` theme |
| Cypress E2E Writer | `cypress-e2e-writer.agent.md` | When writing E2E tests for the showcase, updates, or admin flows |
| CI Monitor | `ci-monitor-subagent.agent.md` | CI status checks and auto-fix of lint/type/test failures |

## Key Conventions

- **DaisyUI theme**: Always use the `movingday` theme tokens (`primary`, `secondary`, `accent`, `base-*`). Never hardcode hex colors.
- **Angular signals**: Use `signal()` for local UI state. Access in templates with `value()` call syntax.
- **Standalone components**: All components are standalone. Add imports explicitly to the `imports: []` array.
- **Firestore tools**: New Firestore operations go in the `executeTool` switch in `functions/src/index.ts`.
- **No secrets in frontend**: The Anthropic API key lives only in Firebase Functions secrets. The `environment.ts` files hold only Firebase config.

## Known Issues (fix before production)

1. **Cloud Function auth is commented out** — `functions/src/index.ts` lines 96-107 must be uncommented before production deploy
2. **`firestore.rules`** contains `YOUR_ADMIN_EMAIL@gmail.com` placeholder — replace with real admin email
3. **`environment.ts`** contains placeholder Firebase config — fill in from Firebase Console per `SETUP.md`