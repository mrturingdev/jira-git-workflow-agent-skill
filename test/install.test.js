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
