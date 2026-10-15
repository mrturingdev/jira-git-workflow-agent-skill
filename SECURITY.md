# Security Policy

## Supported Versions

The latest published minor release (`1.x`) receives security fixes.

## Reporting a Vulnerability

Use GitHub private vulnerability reporting: open the repository's "Security" tab, then "Report a vulnerability". Do not open public issues for security problems.

- We acknowledge reports within 3 business days.
- We target a fix or mitigation within 30 days for high and critical issues.

## Scope

- The installer (`bin/install.js`)
- The shipped skill files

## Security Model

- Zero runtime dependencies.
- Credentials the installer writes itself go to per-user config files in the home directory with `0600` permissions; directories it creates get `0700`. For Gemini, the token is stored by the `agy` CLI under its own permissions.
- The installer does not write secrets into the project directory.
- Network access is limited to what your agents do with the configured Atlassian Rovo MCP endpoint (`https://mcp.atlassian.com/v2/mcp`) and the `gh`, `glab`, `jira`, and `agy` CLIs the installer invokes.
- No telemetry.

## Known Limitations

- When installing for Gemini, the token is passed to `agy mcp add` as a command-line argument and may be briefly visible to other local processes.

## Upgrading from 1.0.1 or earlier

Earlier versions wrote the Jira token in plain text to the project's `.mcp.json` and `.cursor/mcp.json`. After upgrading:

- Delete those entries or files.
- Check they were never committed. If they were, treat the token as leaked.
- Rotate the token at https://id.atlassian.com/manage-profile/security/api-tokens.
