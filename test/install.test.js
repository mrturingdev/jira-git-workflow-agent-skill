const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAgentSelection, AGENT_CHOICES } = require('../bin/install.js');

const ALL = ['AGY', 'GEMINI', 'CLAUDE', 'CODEX', 'OPENCODE', 'CURSOR'];

test('empty or whitespace answer selects all', () => {
  assert.deepEqual(parseAgentSelection('', AGENT_CHOICES), ALL);
  assert.deepEqual(parseAgentSelection('  ', AGENT_CHOICES), ALL);
});

test('comma-separated numbers with spaces', () => {
  assert.deepEqual(parseAgentSelection('1, 3', AGENT_CHOICES), ['AGY', 'CLAUDE']);
});

test('duplicates collapse', () => {
  assert.deepEqual(parseAgentSelection('2,2, 2', AGENT_CHOICES), ['GEMINI']);
});

test('invalid tokens throw naming the token', () => {
  for (const bad of ['0', '7', 'x']) {
    assert.throws(() => parseAgentSelection(bad, AGENT_CHOICES), new RegExp(`"${bad}"`));
  }
});

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { writeMcpConfig } = require('../bin/install.js');

const mode = p => fs.statSync(p).mode & 0o777;
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'jgw-'));

test('writeMcpConfig creates 0600 file and merges existing servers', () => {
  const p = path.join(tmp(), 'sub', 'mcp.json');
  writeMcpConfig(p, { a: { url: 'x' } });
  if (process.platform !== 'win32') assert.equal(mode(p), 0o600);
  writeMcpConfig(p, { b: { url: 'y' } });
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(p, 'utf8')).mcpServers), ['a', 'b']);
});

test('writeMcpConfig tightens an existing 0644 file to 0600', { skip: process.platform === 'win32' }, () => {
  const p = path.join(tmp(), 'mcp.json');
  fs.writeFileSync(p, '{"mcpServers":{}}', { mode: 0o644 });
  fs.chmodSync(p, 0o644);
  writeMcpConfig(p, { a: {} });
  assert.equal(mode(p), 0o600);
});

test('writeMcpConfig throws on invalid JSON and leaves file untouched', () => {
  const p = path.join(tmp(), 'mcp.json');
  fs.writeFileSync(p, '{not json');
  assert.throws(() => writeMcpConfig(p, { a: {} }), new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(fs.readFileSync(p, 'utf8'), '{not json');
});
