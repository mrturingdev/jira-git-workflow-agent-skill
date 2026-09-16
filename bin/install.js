#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const inquirer = require('inquirer');

const SKILLS_SOURCE = path.join(__dirname, '..', 'src', 'skills');

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
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

function hasCommand(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function setupMcpConfig(projectRoot, gitChoice) {
  const mcpConfigPath = path.join(projectRoot, '.mcp.json');
  let config = { mcpServers: {} };
  
  if (fs.existsSync(mcpConfigPath)) {
    try {
      config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
      if (!config.mcpServers) config.mcpServers = {};
    } catch (e) {
      console.warn("Could not parse existing .mcp.json, creating new one.");
    }
  }

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
    const jiraEmail = await askQuestion(`Jira Email (e.g. your.email@example.com): `);
    const jiraToken = await askQuestion(`Jira API Token: `);
    
    if (jiraEmail && jiraToken) {
      const base64Key = Buffer.from(`${jiraEmail.trim()}:${jiraToken.trim()}`).toString('base64');
      config.mcpServers["atlassian-rovo-mcp"].headers = {
        "Authorization": `Bearer ${base64Key}`
      };
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
  const mcpConfig = await setupMcpConfig(projectRoot, gitChoice);

  console.log(`\n📦 Installing skills to root 'skills' directory...`);
  const rootTarget = path.join(pcRoot, 'skills');
  copyFolderSync(SKILLS_SOURCE, rootTarget);

  const { selectedAgents } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedAgents',
      message: 'Select which AI providers to install this skill for:',
      choices: [
        { name: 'AGY (.agents)', value: 'AGY', checked: true },
        { name: 'Gemini', value: 'GEMINI', checked: true },
        { name: 'Claude', value: 'CLAUDE', checked: true },
        { name: 'Codex', value: 'CODEX', checked: true },
        { name: 'Opencode', value: 'OPENCODE', checked: true },
        { name: 'Cursor', value: 'CURSOR', checked: true }
      ]
    }
  ]);

  for (const [agent, targetPath] of Object.entries(TARGETS)) {
    // Install if the user selected this agent in the checkbox
    if (selectedAgents.includes(agent)) {
      console.log(`Setting up for ${agent}...`);
      if (agent === 'CURSOR') {
        const fullPath = path.join(projectRoot, targetPath);
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
        mcpPaths.push(path.join(projectRoot, '.cursor', 'mcp.json'));
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
        console.log(`\n🔑 Running agy mcp add for Gemini...`);
        const jiraConfig = mcpConfig.mcpServers["atlassian-rovo-mcp"];
        if (jiraConfig && jiraConfig.headers) {
          const headers = Object.entries(jiraConfig.headers).map(([k, v]) => `--header "${k}: ${v}"`).join(' ');
          try {
            execSync(`agy mcp add ${headers} atlassian-rovo-mcp ${jiraConfig.url}`, { stdio: 'inherit' });
          } catch (e) {
            console.log(`⚠️ agy CLI not found or failed to add MCP for Gemini.`);
          }
        }
      } else if (agent === 'AGY') {
        mcpPaths.push(path.join(projectRoot, '.mcp.json'));
        mcpPaths.push(path.join(pcRoot, '.agents', 'mcp.json'));
      } else if (agent === 'CODEX') {
        mcpPaths.push(path.join(pcRoot, '.codex', 'mcp.json'));
      } else if (agent === 'OPENCODE') {
        mcpPaths.push(path.join(pcRoot, '.opencode', 'mcp.json'));
      }

      for (const mcpPath of mcpPaths) {
        const dir = path.dirname(mcpPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        let currentConfig = { mcpServers: {} };
        if (fs.existsSync(mcpPath)) {
          try {
            currentConfig = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
            if (!currentConfig.mcpServers) currentConfig.mcpServers = {};
          } catch (e) {}
        }
        currentConfig.mcpServers = { ...currentConfig.mcpServers, ...mcpConfig.mcpServers };
        fs.writeFileSync(mcpPath, JSON.stringify(currentConfig, null, 2));
        console.log(`✅ Updated MCP config for ${agent} at ${mcpPath}`);
      }
    }
  }

  console.log("\n✨ Installation complete!");
  console.log(`Use /jira-git-workflow:checkout in your AI agent to begin!\n`);
}

run().catch(err => {
  console.error("❌ Installation failed:", err);
  process.exit(1);
});
