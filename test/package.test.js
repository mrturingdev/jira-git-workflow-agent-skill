const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { SKILLS_SOURCE } = require('../bin/install.js');

const root = path.join(__dirname, '..');
const readJson = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

test('plugin and npm versions match', () => {
  assert.equal(readJson('.claude-plugin/plugin.json').version, readJson('package.json').version);
});

test('marketplace lists the plugin from the repo root', () => {
  const entry = readJson('.claude-plugin/marketplace.json').plugins.find(p => p.name === 'jira-git-workflow');
  assert.ok(entry);
  assert.equal(entry.source, './');
});

test('every skill name matches its directory (plugin adds the namespace)', () => {
  const dirs = fs.readdirSync(SKILLS_SOURCE).filter(d => fs.statSync(path.join(SKILLS_SOURCE, d)).isDirectory());
  assert.ok(dirs.length > 0);
  for (const dir of dirs) {
    const md = fs.readFileSync(path.join(SKILLS_SOURCE, dir, 'SKILL.md'), 'utf8');
    assert.equal(md.match(/^name:\s*(.+)$/m)[1].trim(), dir);
  }
});

test('plugin .mcp.json takes the token from the environment', () => {
  const auth = readJson('.mcp.json').mcpServers['atlassian-rovo-mcp'].headers.Authorization;
  assert.match(auth, /^Bearer \$\{JIRA_AUTH_TOKEN/);
});
