---
name: jira-git-workflow
description: Automates the full Jira-ticket-to-pull-request developer workflow — checking out branches for assigned Jira tickets, committing changes (including per-subtask commits), and opening a GitLab merge request that updates the Jira ticket's status and assignee. Use this skill whenever the user wants to start work on a Jira ticket, checkout a branch for "my current ticket", commit work against a ticket/subtasks, open a pull/merge request tied to a Jira ticket, or run the combined checkout → commit → PR flow. Trigger on commands like /checkout, /commit, /pull-request, /checkout-and-commit, and /checkout-commit-pull-request, and on natural-language equivalents ("pick up my next ticket", "commit this against the topup ticket", "open an MR for this ticket").
compatibility: Requires Jira access (API token or MCP connector) and GitLab CLI (glab) authenticated against the target project. Optional git-lab-cli-install and jira-install sub-skills handle first-time setup.
---

# Jira → Git → Pull Request Workflow

A skill for automating the developer loop of picking up a Jira ticket, doing the
git work, and shipping a merge request that keeps Jira in sync.

This skill is a **workflow orchestrator** over two building blocks:
- **Jira** (read ticket detail/acceptance criteria, update status, update assignee, update subtasks)
- **git + GitLab CLI (`glab`)** (branch, commit, push, open MR)

## Setup (do this once per environment)

Before running any command below, confirm the environment is ready:

1. **Jira access** — check for a Jira MCP connector or API token. If missing, point the
   user to the `jira-install` skill (`jira-install/SKILL.md`) instead of guessing at
   credentials.
2. **GitLab CLI** — confirm `glab` is installed and authenticated (`glab auth status`).
   If not, point the user to the `git-lab-cli-install` skill.
3. **Credential handling (important):** Never print, log, or echo Jira/GitLab API
   keys or tokens in full — not to the terminal, not into commit messages, not into
   anything that could be pasted into Slack or a PR description. If a key must be
   referenced (e.g. confirming which account is active), show only a masked form
   (e.g. `••••1234`). Claude should know the key exists and which one is active, but
   should never surface the raw value.

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
2. Open a merge request using `glab` **explicitly** (don't fall back to a raw `git
   push -o merge_request.create`-style implicit MR unless `glab` is unavailable —
   prefer the CLI so title/description/labels stay consistent).
   - Target branch: the branch named after the ticket's **fix version**, not
     necessarily `main`.
   - Title/description: pulled from the ticket summary + acceptance criteria.
3. Update the Jira ticket:
   - Ticket status → **Code Review**.
   - Any subtasks → **Done**.
   - Assignee → the name passed in `"assignee as <NAME>"`, if given; otherwise leave
     as-is.

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

## Sub-skills referenced

- `jira-install/SKILL.md` — first-time Jira auth setup.
- `git-lab-cli-install/SKILL.md` — first-time `glab` install + auth setup.

These should be built as separate, small skills that this workflow skill can point
users to, rather than duplicating setup instructions here.
