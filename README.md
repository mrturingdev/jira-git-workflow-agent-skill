# Jira Git Workflow Agent Skill

A multi-agent, cross-platform skill that automates the full Jira-ticket-to-pull-request developer workflow. It enables your AI agent to check out branches for assigned Jira tickets, commit changes, and open merge/pull requests while keeping Jira in sync.

This package provides an interactive `npx` installer that configures the skill, sets up Model Context Protocol (MCP) servers, and authenticates your CLI tools automatically.

## Supported AI Agents

The installer automatically detects your project environment and installs the skill into the appropriate directory:
- **AGY / Claude Flow**: `.agents/skills/`
- **Claude Code**: `.claude/skills/`
- **Codex**: `.codex/skills/`
- **Opencode**: `.opencode/skills/`
- **Cursor**: `.cursor/rules/` (installs as `.mdc` rules)

## Installation

You can install this skill directly via `npx` in the root of your project:

```bash
npx jira-git-workflow-agent-skill
```

*(Note: If testing locally from the repository, run `npx .` inside this package directory)*

### What the Installer Does

1. **Git Provider Selection**: Asks whether you use GitHub or GitLab and configures the respective MCP server.
2. **Interactive Authentication**: 
   - Detects the `gh` or `glab` CLI and launches their interactive `auth login` flow.
   - Detects the `jira` CLI and launches `jira init`.
3. **MCP Configuration**: Prompts for your Jira URL, Email, and API token, securely injecting them into your `.mcp.json` file so the AI Agent can access Jira immediately.
4. **Skill Deployment**: Copies the individual skill commands into your agent's skills directory.

## Usage

### In the AI Agent TUI (Slash Commands)
Once installed, your AI agent will automatically recognize the following slash commands in its chat interface:

- `/jira-git-workflow:checkout ["<ticket description>"]`: Fuzzy-matches your assigned tickets, shows acceptance criteria, and checks out the correct branch.
- `/jira-git-workflow:commit`: Automatically determines subtasks and commits changes to the current branch.
- `/jira-git-workflow:checkout-and-commit`: Runs checkout and commit back-to-back.
- `/jira-git-workflow:pull-request ["assignee as <NAME>"]`: Pushes the branch, opens a PR/MR using `gh`/`glab`, and moves the Jira ticket to "Code Review".
- `/jira-git-workflow:checkout-commit-pull-request "<prompt>"`: The full end-to-end pipeline in one command.

### From the CLI
We also provide shell wrappers so you can trigger these agent workflows directly from your terminal.

```bash
# Example: Triggering the checkout workflow directly from your terminal
./jira-git-workflow/checkout "Fix the topup flow"
```

## Prerequisites

- Node.js (for the installer)
- [GitHub CLI (`gh`)](https://cli.github.com/) or [GitLab CLI (`glab`)](https://gitlab.com/gitlab-org/cli)
- (Optional) [Jira CLI](https://github.com/ankitpokhrel/jira-cli)
