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
- Credentials are written only to per-user config files in the home directory, with `0600` permissions (directories `0700`).
- The installer never writes secrets into the project directory.
- Network access is limited to what your agents do with the configured Atlassian Rovo MCP endpoint (`https://mcp.atlassian.com/v2/mcp`) and the `gh`, `glab`, `jira`, and `agy` CLIs the installer invokes.
- No telemetry.

## Known Limitations

- When installing for Gemini, the token is passed to `agy mcp add` as a command-line argument and may be briefly visible to other local processes.
