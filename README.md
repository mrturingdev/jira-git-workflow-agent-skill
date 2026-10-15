# Jira Git Workflow Agent Skill

[![CI](https://github.com/mrturingdev/jira-git-workflow-agent-skill/actions/workflows/ci.yml/badge.svg)](https://github.com/mrturingdev/jira-git-workflow-agent-skill/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A multi-agent, cross-platform skill that automates the full Jira-ticket-to-pull-request developer workflow. Your AI agent checks out branches for assigned Jira tickets, commits changes, and opens pull/merge requests while keeping Jira in sync.

It ships two ways: a **Claude Code plugin**, and an interactive **`npx` installer** (zero runtime dependencies) for AGY, Gemini, Claude, Codex, Opencode and Cursor.

## Prerequisites

- [GitHub CLI (`gh`)](https://cli.github.com/) or [GitLab CLI (`glab`)](https://gitlab.com/gitlab-org/cli)
- A Jira account and an [Atlassian API token](https://id.atlassian.com/manage-profile/security/api-tokens)
- Node.js 18 or later (npx installer only)
- Optional: [Jira CLI](https://github.com/ankitpokhrel/jira-cli) (the installer offers to run `jira init` if it is installed)

## Installation

### Option 1: Claude Code plugin

In Claude Code, run:

```
/plugin install jira-git-workflow --marketplace mrturingdev/jira-git-workflow-agent-skill
```

On older Claude Code versions, add the marketplace first:

```
/plugin marketplace add mrturingdev/jira-git-workflow-agent-skill
/plugin install jira-git-workflow@jira-git-workflow
```

The plugin also configures the `atlassian-rovo-mcp` server. It reads your credentials from the `JIRA_AUTH_TOKEN` environment variable, so no secret is stored in any file. Set it in your shell profile before starting Claude Code:

```bash
export JIRA_AUTH_TOKEN="$(printf '%s' 'you@example.com:YOUR_API_TOKEN' | base64)"
```

Update later with `/plugin update jira-git-workflow`.

### Option 2: npx installer (any agent, no clone needed)

Run it from the root of your project:

```bash
npx jira-git-workflow-agent-skill
```

To run the latest code straight from GitHub instead of npm:

```bash
npx github:mrturingdev/jira-git-workflow-agent-skill
```

#### What the installer does

1. **Git provider**: asks whether you use GitHub or GitLab.
2. **Git authentication**: if `gh` or `glab` is installed, shows whether you are logged in and offers to run `auth login`.
3. **Jira authentication** (optional):
   - If the `jira` CLI is installed, offers to run `jira init`.
   - Asks for your Jira email and API token. The token prompt is hidden. If `JIRA_API_TOKEN` is set in your environment, it is used instead of prompting.
   - Encodes `email:token` as base64 and configures the HTTP `atlassian-rovo-mcp` server (`https://mcp.atlassian.com/v2/mcp`) with an `Authorization: Bearer <base64>` header.
   - If you skip this step, a placeholder entry is added only where none exists. An existing real entry is never overwritten.
4. **Skill deployment**: copies the skills to `~/skills`, then asks which agents to install for (comma-separated numbers, Enter for all).
5. **MCP configuration**: merges the MCP server into each selected agent's config. Other servers already in those files are kept.

### Where files go

| Agent | Skills | MCP config |
|---|---|---|
| AGY | `~/.agents/skills/` | `~/.agents/mcp.json` |
| Gemini | `~/.gemini/config/skills/` | added with `agy mcp add` |
| Claude | `~/.claude/skills/` | Claude Desktop `claude_desktop_config.json` |
| Codex | `~/.codex/skills/` | `~/.codex/mcp.json` |
| Opencode | `~/.opencode/skills/` | `~/.opencode/mcp.json` |
| Cursor | `.mdc` rules in the project's `.cursor/rules/` | `~/.cursor/mcp.json` |

The Claude Desktop config lives in `~/Library/Application Support/Claude/` on macOS, `%APPDATA%\Claude\` on Windows, and `~/.config/Claude/` on Linux.

## Usage

Once installed, your AI agent recognizes these slash commands. With the Claude Code plugin they are prefixed with the plugin name (`/jira-git-workflow:checkout`); with the npx installer they are plain (`/checkout`).

| Command | What it does |
|---|---|
| `/checkout ["<ticket description>"]` | Fuzzy-matches your assigned tickets, shows acceptance criteria, and checks out the right branch. |
| `/commit` | Works out the subtasks and commits changes to the current branch. |
| `/checkout-and-commit` | Runs checkout and commit back to back. |
| `/pull-request ["assignee as <NAME>"]` | Pushes the branch, opens a PR/MR with `gh`/`glab`, and moves the Jira ticket to "Code Review". |
| `/checkout-commit-pull-request "<prompt>"` | The full end-to-end pipeline in one command. |

The `jira-install` skill walks you through creating an Atlassian API token and setting up the MCP connection by hand.

## Security

See [SECURITY.md](SECURITY.md) for the full policy and how to report a vulnerability privately.

- Zero runtime dependencies. CI runs `npm audit` and the test suite on Node 18, 20 and 22 for every pull request and weekly.
- The Claude Code plugin stores no credentials: its MCP config reads `JIRA_AUTH_TOKEN` from your environment.
- Credentials the npx installer writes go only to per-user config files in your home directory, with `0600` permissions (directories it creates get `0700`). Nothing secret is written into your project. For Gemini, the `agy` CLI stores the token under its own permissions.
- An existing MCP config that is not valid JSON is never overwritten. It is skipped with a warning.
- No telemetry.
- **Upgrading from 1.0.1 or earlier:** older versions wrote the token in plain text to the project's `.mcp.json` and `.cursor/mcp.json`. Delete those files, check they were never committed, and rotate your token.
- Known limitation: for Gemini, the token is passed to `agy mcp add` as a command-line argument and may be briefly visible to other local processes.

## Development

```bash
npm ci
npm test
claude plugin validate .          # check the plugin and marketplace manifests
claude --plugin-dir .             # try the plugin locally without installing it
```

### Releasing

1. Bump `version` in both `package.json` and `.claude-plugin/plugin.json` (a test checks they match).
2. Commit, then tag and push: `git tag v1.2.3 && git push origin v1.2.3`.
3. The `Release` workflow runs the audit and tests, then publishes to npm with provenance. It needs an `NPM_TOKEN` repository secret.

Claude Code users get the new version through `/plugin update jira-git-workflow`.

## License

[MIT](LICENSE) © 2026 Pushan Maharjan
