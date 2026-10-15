#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync, execFileSync } = require('child_process');

const SKILLS_SOURCE = path.join(__dirname, '..', 'skills');

const TARGETS = {
  AGY: '.agents/skills',
  GEMINI: '.gemini/config/skills',
  CLAUDE: '.claude/skills',
  CODEX: '.codex/skills',
  OPENCODE: '.opencode/skills',
  CURSOR: '.cursor/rules'
};

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  
  const elements = fs.readdirSync(from);
  for (const element of elements) {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  }
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve, reject) => {
    let answered = false;
    rl.on('close', () => {
      if (!answered) reject(new Error('Input closed before an answer was entered.'));
    });
    rl.question(query, ans => {
      answered = true;
      rl.close();
      resolve(ans);
    });
  });
}

function askSecret(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  let muted = false;
  if (typeof rl._writeToOutput === 'function') {
    const origWrite = rl._writeToOutput;
    rl._writeToOutput = function (str) {
      if (!muted) origWrite.call(rl, str);
    };
  } else {
    console.log('⚠️ Could not mute terminal input; the token will be visible as you type.');
  }
  return new Promise((resolve, reject) => {
    let answered = false;
    rl.on('close', () => {
      if (!answered) {
        muted = false;
        process.stdout.write('\n');
        reject(new Error('Input closed before a token was entered.'));
      }
    });
    rl.question(query, ans => {
      answered = true;
      muted = false;
      rl.close();
      process.stdout.write('\n');
      resolve(ans);
    });
    muted = true;
  });
}

const AGENT_CHOICES = [
  { name: 'AGY (.agents)', value: 'AGY' },
  { name: 'Gemini', value: 'GEMINI' },
  { name: 'Claude', value: 'CLAUDE' },
  { name: 'Codex', value: 'CODEX' },
  { name: 'Opencode', value: 'OPENCODE' },
  { name: 'Cursor', value: 'CURSOR' }
];

function parseAgentSelection(answer, agents) {
  if (!answer || !answer.trim()) return agents.map(a => a.value);
  const picked = new Set();
  for (const raw of answer.split(',')) {
    const tok = raw.trim();
    const n = Number(tok);
    if (!/^\d+$/.test(tok) || n < 1 || n > agents.length) {
      throw new Error(`Invalid selection "${tok}": enter numbers between 1 and ${agents.length}`);
    }
    picked.add(n);
  }
  return [...picked].sort((x, y) => x - y).map(n => agents[n - 1].value);
}

// keepExisting: server names that must not be overwritten if already present in the file.
function writeMcpConfig(mcpPath, servers, { keepExisting = [] } = {}) {
  let current = { mcpServers: {} };
  if (fs.existsSync(mcpPath)) {
    try {
      current = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
    } catch {
      throw new Error(`Could not parse existing MCP config at ${mcpPath}. Fix or move it, then re-run the installer.`);
    }
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      throw new Error(`Existing MCP config at ${mcpPath} is not a JSON object. Fix or move it, then re-run the installer.`);
    }
    if (current.mcpServers === undefined) {
      current.mcpServers = {};
    } else if (!current.mcpServers || typeof current.mcpServers !== 'object' || Array.isArray(current.mcpServers)) {
      throw new Error(`"mcpServers" in existing MCP config at ${mcpPath} is not a JSON object. Fix or move it, then re-run the installer.`);
    }
  }
  const toWrite = { ...servers };
  for (const name of keepExisting) {
    if (Object.prototype.hasOwnProperty.call(current.mcpServers, name)) delete toWrite[name];
  }
  current.mcpServers = { ...current.mcpServers, ...toWrite };
  fs.mkdirSync(path.dirname(mcpPath), { recursive: true, mode: 0o700 });
  const tmpPath = `${mcpPath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(current, null, 2), { mode: 0o600, flag: 'wx' });
    fs.chmodSync(tmpPath, 0o600);
    fs.renameSync(tmpPath, mcpPath);
  } catch (e) {
    fs.rmSync(tmpPath, { force: true });
    throw e;
  }
}

function hasCommand(cmd) {
  try {
    execFileSync('sh', ['-c', 'command -v "$1"', 'sh', cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function setupMcpConfig(gitChoice) {
  const config = { mcpServers: {}, hasCredentials: false };

  // Configure Jira MCP using Atlassian Rovo
  config.mcpServers["atlassian-rovo-mcp"] = {
    url: "https://mcp.atlassian.com/v2/mcp",
    headers: {
      "Authorization": "Bearer YOUR_API_KEY_HERE"
    }
  };

  // Ask to authenticate Git CLI
  const cliCmd = gitChoice === 'github' ? 'gh' : 'glab';
  const providerName = gitChoice === 'github' ? 'GitHub (gh)' : 'GitLab (glab)';
  let isAuthenticated = false;

  if (hasCommand(cliCmd)) {
    try {
      execSync(`${cliCmd} auth status`, { stdio: 'ignore' });
      isAuthenticated = true;
      console.log(`\n✅ You are already authenticated with ${providerName}.`);
    } catch {
      console.log(`\n⚠️ You are not currently authenticated with ${providerName}.`);
    }
    
    const promptMsg = isAuthenticated 
      ? `Do you want to re-authenticate or add a new account for ${providerName} now? (y/N): ` 
      : `Do you want to authenticate with ${providerName} now? (y/N): `;

    const authGit = await askQuestion(promptMsg);
    if (authGit.toLowerCase().startsWith('y')) {
      console.log(`\n🔑 Running ${cliCmd} auth login...`);
      try {
        execSync(`${cliCmd} auth login`, { stdio: 'inherit' });
        console.log(`✅ ${cliCmd} authentication complete.`);
      } catch (err) {
        console.log(`⚠️ ${cliCmd} authentication was interrupted or failed.`);
      }
    }
  } else {
    console.log(`\n⚠️ The '${cliCmd}' CLI was not found on your system. Please install it to interact with ${providerName}.`);
  }

  // Ask to authenticate Jira CLI / Setup MCP Envs
  const authJira = await askQuestion(`\nDo you want to configure Jira authentication? (y/N): `);
  if (authJira.toLowerCase().startsWith('y')) {
    if (hasCommand('jira')) {
      const runJiraCli = await askQuestion(`We detected the 'jira' CLI. Do you want to run 'jira init'? (y/N): `);
      if (runJiraCli.toLowerCase().startsWith('y')) {
        console.log(`\n🔑 Running jira init...`);
        try {
          execSync('jira init', { stdio: 'inherit' });
          console.log(`✅ Jira CLI authentication complete.`);
        } catch (err) {
          console.log(`⚠️ Jira authentication was interrupted or failed.`);
        }
      }
    }

    console.log(`\nTo allow the AI Agent to access Jira via MCP, please provide your Jira credentials.`);
    console.log(`\nTo generate an API token:`);
    console.log(`1. Go to https://id.atlassian.com/manage-profile/security/api-tokens`);
    console.log(`2. Click 'Create API token', enter a label, and click 'Create'.`);
    console.log(`3. Copy the generated token.\n`);
    const jiraEmail = (await askQuestion(`Jira Email (e.g. your.email@example.com): `)).trim();
    let jiraToken = (process.env.JIRA_API_TOKEN || '').trim();
    if (jiraToken) {
      console.log(`Using JIRA_API_TOKEN from environment.`);
    } else {
      jiraToken = (await askSecret(`Jira API Token: `)).trim();
    }

    if (jiraEmail && jiraToken) {
      const base64Key = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
      config.mcpServers["atlassian-rovo-mcp"].headers = {
        "Authorization": `Bearer ${base64Key}`
      };
      config.hasCredentials = true;
      console.log(`✅ Configured Jira MCP credentials.`);
    } else {
      console.log(`⚠️ Skipped Jira MCP environment configuration.`);
    }
  }

  return config;
}

async function run() {
  console.log("🚀 Installing jira-git-workflow skill...\n");
  
  const gitAns = await askQuestion("Which Git provider do you use? (github/gitlab) [github]: ");
  const gitChoice = (gitAns.trim().toLowerCase() === 'gitlab') ? 'gitlab' : 'github';

  const os = require('os');
  const projectRoot = process.cwd();
  const pcRoot = os.homedir();
  
  console.log(`\n⚙️ Configuring MCP servers and Authentication...`);
  const mcpConfig = await setupMcpConfig(gitChoice);

  console.log(`\n📦 Installing skills to root 'skills' directory...`);
  const rootTarget = path.join(pcRoot, 'skills');
  copyFolderSync(SKILLS_SOURCE, rootTarget);

  console.log('\nAI providers:');
  AGENT_CHOICES.forEach((a, i) => console.log(`  ${i + 1}. ${a.name}`));
  const allNums = AGENT_CHOICES.map((_, i) => i + 1).join(',');
  let selectedAgents;
  while (!selectedAgents) {
    const ans = await askQuestion(`Select AI providers to install for (comma-separated numbers, Enter for all) [${allNums}]: `);
    try {
      selectedAgents = parseAgentSelection(ans, AGENT_CHOICES);
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
  }

  for (const [agent, targetPath] of Object.entries(TARGETS)) {
    if (selectedAgents.includes(agent)) {
      console.log(`Setting up for ${agent}...`);
      if (agent === 'CURSOR') {
        const cursorRulesDir = path.join(projectRoot, '.cursor', 'rules');
        if (!fs.existsSync(cursorRulesDir)) fs.mkdirSync(cursorRulesDir, { recursive: true });
        
        const skills = fs.readdirSync(SKILLS_SOURCE);
        for (const skill of skills) {
          const skillMd = path.join(SKILLS_SOURCE, skill, 'SKILL.md');
          if (fs.existsSync(skillMd)) {
            fs.copyFileSync(skillMd, path.join(cursorRulesDir, `${skill}.mdc`));
          }
        }
      } else {
        const fullPath = path.join(pcRoot, targetPath);
        copyFolderSync(SKILLS_SOURCE, fullPath);
        
        if (agent === 'AGY') {
          const agentsDir = path.join(pcRoot, '.agents');
          const skillsJsonPath = path.join(agentsDir, 'skills.json');
          if (!fs.existsSync(skillsJsonPath)) {
            fs.writeFileSync(skillsJsonPath, JSON.stringify({ entries: [{ path: "skills" }] }, null, 2));
          }
        }
      }
      
      // Install MCP config in the provider's specific way
      let mcpPaths = [];
      if (agent === 'CURSOR') {
        mcpPaths.push(path.join(pcRoot, '.cursor', 'mcp.json'));
      } else if (agent === 'CLAUDE') {
        if (process.platform === 'win32') {
          mcpPaths.push(path.join(pcRoot, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'));
        } else if (process.platform === 'darwin') {
          mcpPaths.push(path.join(pcRoot, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'));
        } else {
          mcpPaths.push(path.join(pcRoot, '.config', 'Claude', 'claude_desktop_config.json'));
        }
      } else if (agent === 'GEMINI') {
        // Use default MCP installation process for GEMINI via agy mcp add
        const jiraConfig = mcpConfig.mcpServers["atlassian-rovo-mcp"];
        if (!mcpConfig.hasCredentials) {
          console.log(`⚠️ No Jira credentials provided; skipping agy mcp add for Gemini.`);
        } else if (jiraConfig && jiraConfig.headers) {
          console.log(`\n🔑 Running agy mcp add for Gemini...`);
          const headerArgs = Object.entries(jiraConfig.headers).flatMap(([k, v]) => ['--header', `${k}: ${v}`]);
          try {
            execFileSync('agy', ['mcp', 'add', ...headerArgs, 'atlassian-rovo-mcp', jiraConfig.url], { stdio: 'inherit' });
          } catch (e) {
            console.log(`⚠️ agy CLI not found or failed to add MCP for Gemini.`);
          }
        }
      } else if (agent === 'AGY') {
        mcpPaths.push(path.join(pcRoot, '.agents', 'mcp.json'));
      } else if (agent === 'CODEX') {
        mcpPaths.push(path.join(pcRoot, '.codex', 'mcp.json'));
      } else if (agent === 'OPENCODE') {
        mcpPaths.push(path.join(pcRoot, '.opencode', 'mcp.json'));
      }

      for (const mcpPath of mcpPaths) {
        try {
          writeMcpConfig(mcpPath, mcpConfig.mcpServers, {
            keepExisting: mcpConfig.hasCredentials ? [] : ['atlassian-rovo-mcp'],
          });
          console.log(`✅ Updated MCP config for ${agent} at ${mcpPath}`);
        } catch (e) {
          console.log(`⚠️ ${e.message}`);
        }
      }
    }
  }

  console.log("\n✨ Installation complete!");
  console.log(`Use /checkout in your AI agent to begin!\n`);
}

if (require.main === module) {
  run().catch(err => {
    console.error("❌ Installation failed:", err.message || err);
    process.exit(1);
  });
}

module.exports = { parseAgentSelection, AGENT_CHOICES, writeMcpConfig, SKILLS_SOURCE };
