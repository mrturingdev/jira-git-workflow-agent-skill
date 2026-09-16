# Jira Git Workflow Agent Skill

A multi-agent, cross-platform skill that automates the full Jira-ticket-to-pull-request developer workflow. It enables your AI agent to check out branches for assigned Jira tickets, commit changes, and open merge/pull requests while keeping Jira in sync.

This package provides an interactive `npx` installer that configures the skill, sets up Model Context Protocol (MCP) servers globally, and authenticates your CLI tools automatically.

## Supported AI Agents

The installer automatically detects your selected agents and installs the skills globally into the appropriate directory, as well as wires up the global MCP config:
- **AGY (.agents default)**: `.agents/skills/` (and `.agents/mcp.json`)
- **Gemini (Ruflo)**: `.gemini/config/skills/` (and natively runs `agy mcp add`)
- **Claude Desktop / Code**: `.claude/skills/` (and `claude_desktop_config.json`)
- **Codex**: `.codex/skills/`
- **Opencode**: `.opencode/skills/`
- **Cursor**: `.cursor/rules/` (installs as `.mdc` rules and `.mcp.json` in the current project)

## Installation

You can install this skill directly via `npx` in the root of your project:

```bash
npx jira-git-workflow-agent-skill
```

*(Note: If testing locally from the repository, run `npx .` inside this package directory)*

### What the Installer Does

1. **Git Provider Selection**: Asks whether you use GitHub or GitLab.
2. **Interactive Authentication**: 
   - Detects the `gh` or `glab` CLI and launches their interactive `auth login` flow.
   - Detects the `jira` CLI and optionally launches `jira init`.
3. **MCP Configuration**: 
   - Prompts for your Jira Email and API Token.
   - Converts the credentials into a base64 string (`email:token`).
   - Automatically injects the HTTP-based `atlassian-rovo-mcp` (using the Bearer token) into your global agent MCP configuration.
4. **Skill Deployment**: Copies the individual skill commands into your agent's skills directory.

## Usage

### In the AI Agent TUI (Slash Commands)
Once installed, your AI agent will automatically recognize the following slash commands in its chat interface:

- `/checkout ["<ticket description>"]`: Fuzzy-matches your assigned tickets, shows acceptance criteria, and checks out the correct branch.
- `/commit`: Automatically determines subtasks and commits changes to the current branch.
- `/checkout-and-commit`: Runs checkout and commit back-to-back.
- `/pull-request ["assignee as <NAME>"]`: Pushes the branch, opens a PR/MR using native `gh`/`glab`, and moves the Jira ticket to "Code Review".
- `/checkout-commit-pull-request "<prompt>"`: The full end-to-end pipeline in one command.

## Prerequisites

- Node.js (for the installer)
- [GitHub CLI (`gh`)](https://cli.github.com/) or [GitLab CLI (`glab`)](https://gitlab.com/gitlab-org/cli)
- (Optional) [Jira CLI](https://github.com/ankitpokhrel/jira-cli)
