# Jira Git Workflow Agent Skill

[![CI](https://github.com/mrturingdev/jira-git-workflow-agent-skill/actions/workflows/ci.yml/badge.svg)](https://github.com/mrturingdev/jira-git-workflow-agent-skill/actions/workflows/ci.yml)

A multi-agent, cross-platform skill that automates the full Jira-ticket-to-pull-request developer workflow. Your AI agent checks out branches for assigned Jira tickets, commits changes, and opens pull/merge requests while keeping Jira in sync.

The package ships an interactive `npx` installer with zero runtime dependencies. It installs the skills for the agents you choose, wires up the Atlassian Rovo MCP server, and helps you authenticate your Git and Jira CLIs.

## Prerequisites

- Node.js 18 or later (for the installer)
- [GitHub CLI (`gh`)](https://cli.github.com/) or [GitLab CLI (`glab`)](https://gitlab.com/gitlab-org/cli)
- A Jira account and an [Atlassian API token](https://id.atlassian.com/manage-profile/security/api-tokens)
- Optional: [Jira CLI](https://github.com/ankitpokhrel/jira-cli) (the installer offers to run `jira init` if it is installed)

## Installation

Run the installer from the root of your project:

```bash
npx jira-git-workflow-agent-skill
```

To test locally from a clone of this repository, run `npx .` inside the package directory.

### What the installer does

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

Once installed, your AI agent recognizes these slash commands:

| Command | What it does |
|---|---|
| `/jira-git-workflow:checkout ["<ticket description>"]` | Fuzzy-matches your assigned tickets, shows acceptance criteria, and checks out the right branch. |
| `/jira-git-workflow:commit` | Works out the subtasks and commits changes to the current branch. |
| `/jira-git-workflow:checkout-and-commit` | Runs checkout and commit back to back. |
| `/jira-git-workflow:pull-request ["assignee as <NAME>"]` | Pushes the branch, opens a PR/MR with `gh`/`glab`, and moves the Jira ticket to "Code Review". |
| `/jira-git-workflow:checkout-commit-pull-request "<prompt>"` | The full end-to-end pipeline in one command. |

The `jira-install` skill walks you through creating an Atlassian API token and setting up the MCP connection by hand.

## Security

See [SECURITY.md](SECURITY.md) for the full policy and how to report a vulnerability privately.

- Zero runtime dependencies. CI runs `npm audit` and the test suite on Node 18, 20 and 22 for every pull request and weekly.
- Credentials the installer writes go only to per-user config files in your home directory, with `0600` permissions (directories it creates get `0700`). Nothing secret is written into your project. For Gemini, the `agy` CLI stores the token under its own permissions.
- An existing MCP config that is not valid JSON is never overwritten. It is skipped with a warning.
- No telemetry.
- **Upgrading from 1.0.1 or earlier:** older versions wrote the token in plain text to the project's `.mcp.json` and `.cursor/mcp.json`. Delete those files, check they were never committed, and rotate your token.
- Known limitation: for Gemini, the token is passed to `agy mcp add` as a command-line argument and may be briefly visible to other local processes.

## Development

```bash
npm ci
npm test
```

## License

MIT
