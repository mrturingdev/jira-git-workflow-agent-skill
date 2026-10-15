---
name: jira-install
description: First-time Jira API authentication and token setup.
---

# Jira Authentication Setup

This skill guides you through obtaining an Atlassian API Token and configuring it for use with the Jira/Git workflow (specifically the `atlassian-rovo-mcp` MCP implementation).

## 1. Generate an API Token

1. **Log in to your Atlassian account:**
   Go to [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) and log in with the account you use for Jira.

2. **Create the token:**
   - Click the **Create API token** button.
   - Enter a memorable label for your token (e.g., `Antigravity CLI` or `Local Dev Workflow`).
   - Click **Create**.

3. **Copy the token:**
   - Click **Copy to clipboard**. 
   - **Important:** Make sure to save this token somewhere secure (like a password manager), as you won't be able to view it again once you close the window.

## 2. Setting Up the MCP

The installation script automatically wires this API key into the `atlassian-rovo-mcp` server by base64-encoding your Jira email and token (`email:token`), and passing it as a Bearer token:
```json
{
  "mcpServers": {
    "atlassian-rovo-mcp": {
      "url": "https://mcp.atlassian.com/v2/mcp",
      "headers": {
        "Authorization": "Bearer <base64-encoded-key>"
      }
    }
  }
}
```
*(Note: You can manually generate this token in the terminal with `echo -n "your.email@example.com:YOUR_API_TOKEN_HERE" | base64`)*

## 3. Credential Handling Rules

- Never print, log, or echo Jira/GitLab API keys or tokens in full — not to the terminal, not into commit messages, not into anything that could be pasted into Slack or a PR description.
- If a key must be referenced (e.g., confirming which account is active), show only a masked form (e.g., `••••1234`).
