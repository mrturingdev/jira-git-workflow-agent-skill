---
name: jira-git-workflow
description: Automates the full Jira-ticket-to-pull-request developer workflow — checking out branches for assigned Jira tickets, committing changes (including per-subtask commits), and opening a GitHub/GitLab pull/merge request that updates the Jira ticket's status and assignee. Use this skill whenever the user wants to start work on a Jira ticket, checkout a branch for "my current ticket", commit work against a ticket/subtasks, open a pull/merge request tied to a Jira ticket, or run the combined checkout → commit → PR flow. Trigger on commands like /checkout, /commit, /pull-request, /checkout-and-commit, and /checkout-commit-pull-request, and on natural-language equivalents ("pick up my next ticket", "commit this against the topup ticket", "open a PR for this ticket").
compatibility: Requires Jira access via the `atlassian-rovo-mcp` connector and GitHub CLI (`gh`) or GitLab CLI (`glab`) authenticated against the target project. The `jira-install` sub-skill handles first-time setup.
---

# Jira → Git → Pull Request Workflow

A skill for automating the developer loop of picking up a Jira ticket, doing the
git work, and shipping a pull/merge request that keeps Jira in sync.

This skill is a **workflow orchestrator** over two building blocks:
- **Jira** (read ticket detail/acceptance criteria, update status, update assignee, update subtasks) via `atlassian-rovo-mcp`.
- **git + Git CLI (`gh` or `glab`)** (branch, commit, push, open PR/MR).

## Setup (do this once per environment)

Before running any command below, confirm the environment is ready:

1. **Jira access** — Ensure the `atlassian-rovo-mcp` connector is available globally. Do not attempt to install or copy it into the local project or environment. Instead, simply verify that the global configuration (e.g., in `~/.gemini/mcp.json`, `~/.agents/mcp.json`, or the provider's global settings) contains the valid setup and that the tools are accessible.
2. **Git CLI (`gh` or `glab`)** — We use the native GitHub/GitLab CLIs exclusively. Ensure `gh` or `glab` is installed and authenticated (`gh auth status` or `glab auth status`). If not, guide the user to install and authenticate the respective CLI.
3. **Credential handling (important):** Never print, log, or echo Jira/GitLab API keys or tokens in full — not to the terminal, not into commit messages, not into anything that could be pasted into Slack or a PR description. If a key must be referenced (e.g. confirming which account is active), show only a masked form (e.g. `••••1234`). The agent should know the key exists and which one is active, but should never surface the raw value.

## Commands

### `/checkout ["<ticket description>"]`

Two modes:

- **With an argument** (e.g. `/checkout "my current in-progress ticket about topup"`):
  fuzzy-match against the user's assigned tickets, resolve to a single ticket, then:
  1. Show the ticket's full description and acceptance criteria.
  2. Show which branch is being checked out **from** and **to** (e.g. `from main → to
     feature/TOPUP-123-topup-flow`).
  3. Create/checkout the branch, naming it from the ticket key + short slug.

- **With no argument**: bulk mode.
  1. Pull all tickets assigned to the current user that are in **any status except
     "Code Review" and "Done"**.
  2. For each, checkout (or create) the corresponding branch.
  3. Summarize what was checked out.

Always confirm the resolved ticket (or ticket list) with the user before creating
branches, unless the user has set "allow all the time" (see Confirmation Mode below).

### `/commit`

1. Identify the ticket tied to the current branch.
2. Check whether the ticket has subtasks.
   - **Subtasks present:** commit per-subtask — one commit per subtask, message
     referencing the subtask key, following that subtask's own flow.
   - **No subtasks, single logical change:** one commit referencing the ticket key.
   - **No subtasks, but multiple logical changes are needed:** create a subtask in
     Jira for each planned commit first, then commit against each subtask.
3. Confirm the diff and commit plan with the user before committing, unless "allow
   all the time" is set.

### `/checkout-and-commit`

Runs `/checkout` then `/commit` back to back for the resolved ticket(s).

### `/pull-request ["assignee as <NAME>"]`

1. Push the current branch to origin.
2. Open a pull/merge request using `gh` or `glab` **explicitly** (don't fall back to a raw `git
   push -o merge_request.create`-style implicit MR unless the CLI is unavailable —
   prefer the CLI so title/description/labels stay consistent).
   - Target branch: the branch named after the ticket's **fix version**, not
     necessarily `main`.
   - Title/description: pulled from the ticket summary + acceptance criteria.
3. Update the Jira ticket:
   - Ticket status → **Code Review**.
   - Any subtasks → **Done**.
   - Assignee → the name passed in `"assignee as <NAME>"`, if given; otherwise leave
     as-is.
4. Generate a concise, friendly message containing the pull request link and the Jira ticket reference.
   - Use the `send_viber_messages` MCP tool (from the `infobip-viber` server) to send this directly to the user's Viber if configured.
   - If Viber MCP is not configured or fails, print the message clearly in the chat so the user can easily copy and paste it into Viber themselves.

### `/checkout-commit-pull-request "<prompt>"`

The full pipeline: parse `<prompt>` for the ticket reference and (optionally) the PR
assignee, then run `/checkout` → do the requested code changes → `/commit` →
`/pull-request`. This is the end-to-end "just get this ticket up for review" command.

## Confirmation Mode

Before doing anything destructive (branch creation, commits, pushes, Jira status
changes), the skill has two modes:

- **Ask each time (default):** confirm before each git/Jira mutation.
- **Allow all the time:** the user can opt into running the full pipeline without
  per-step confirmation. Only switch to this mode if the user explicitly asks for it
  (e.g. "just run the whole thing, don't ask me each time"); never assume it.

## Notes / open decisions to nail down while developing this skill

These were flagged as still-undecided in the original planning notes — resolve them
before considering the skill "done":

- Exact branch-naming convention (ticket key only vs. key + slug vs. fix-version).
- How ticket resolution should work when the free-text description in `/checkout`
  matches more than one ticket.
- Whether commit messages should follow a specific convention (Conventional Commits,
  ticket-key prefix, etc.) — currently unspecified.
- Where the Jira credential/token is sourced from (MCP connector vs. `.env` vs. CLI
  config), and confirming the masking behavior above matches however it's stored.
