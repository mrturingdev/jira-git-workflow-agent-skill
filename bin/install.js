#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const SKILLS_SOURCE = path.join(__dirname, '..', 'src', 'skills');

const TARGETS = {
  AGY: '.agents/skills',
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

  // Configure Jira MCP
  config.mcpServers["jira-mcp"] = {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-jira"],
    env: {}
  };

  // Configure Git MCP
  if (gitChoice === 'github') {
    config.mcpServers["github-mcp"] = {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: {}
    };
  } else if (gitChoice === 'gitlab') {
    config.mcpServers["gitlab-mcp"] = {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-gitlab"],
      env: {}
    };
  }

  // Ask to authenticate Git CLI
  const authGit = await askQuestion(`\nDo you want to authenticate with ${gitChoice === 'github' ? 'GitHub (gh)' : 'GitLab (glab)'} CLI now? (y/N): `);
  if (authGit.toLowerCase().startsWith('y')) {
    const cliCmd = gitChoice === 'github' ? 'gh' : 'glab';
    if (hasCommand(cliCmd)) {
      console.log(`\n🔑 Running ${cliCmd} auth login...`);
      try {
        execSync(`${cliCmd} auth login`, { stdio: 'inherit' });
        console.log(`✅ ${cliCmd} authentication complete.`);
      } catch (err) {
        console.log(`⚠️ ${cliCmd} authentication was interrupted or failed.`);
      }
    } else {
      console.log(`⚠️ The '${cliCmd}' CLI was not found on your system. Please install it first.`);
    }
  }

  // Ask to authenticate Jira CLI / Setup MCP Envs
  const authJira = await askQuestion(`\nDo you want to configure Jira authentication? (y/N): `);
  if (authJira.toLowerCase().startsWith('y')) {
    // 1. Try Jira CLI if they want CLI
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

    // 2. Also ask for MCP environment variables which the agent needs
    console.log(`\nTo allow the AI Agent to access Jira via MCP, please provide your Jira credentials.`);
    const jiraUrl = await askQuestion(`Jira URL (e.g., https://yourdomain.atlassian.net): `);
    const jiraEmail = await askQuestion(`Jira Email: `);
    const jiraToken = await askQuestion(`Jira API Token: `);
    
    if (jiraUrl && jiraEmail && jiraToken) {
      config.mcpServers["jira-mcp"].env = {
        JIRA_URL: jiraUrl.trim(),
        JIRA_EMAIL: jiraEmail.trim(),
        JIRA_API_TOKEN: jiraToken.trim()
      };
      console.log(`✅ Configured Jira MCP credentials.`);
    } else {
      console.log(`⚠️ Skipped Jira MCP environment configuration.`);
    }
  }

  fs.writeFileSync(mcpConfigPath, JSON.stringify(config, null, 2));
  console.log(`\n✅ Updated MCP configuration in .mcp.json`);
}

async function run() {
  console.log("🚀 Installing jira-git-workflow skill...\n");
  
  const gitAns = await askQuestion("Which Git provider do you use? (github/gitlab) [github]: ");
  const gitChoice = (gitAns.trim().toLowerCase() === 'gitlab') ? 'gitlab' : 'github';

  const projectRoot = process.cwd();
  
  console.log(`\n⚙️ Configuring MCP servers and Authentication...`);
  await setupMcpConfig(projectRoot, gitChoice);

  console.log(`\n📦 Installing skills to standard .agents/skills directory...`);
  const defaultTarget = path.join(projectRoot, '.agents', 'skills');
  copyFolderSync(SKILLS_SOURCE, defaultTarget);
  
  const agentsDir = path.join(projectRoot, '.agents');
  const skillsJsonPath = path.join(agentsDir, 'skills.json');
  if (!fs.existsSync(skillsJsonPath)) {
    fs.writeFileSync(skillsJsonPath, JSON.stringify({ entries: [{ path: "skills" }] }, null, 2));
    console.log(`✅ Created .agents/skills.json`);
  }

  for (const [agent, targetPath] of Object.entries(TARGETS)) {
    const fullPath = path.join(projectRoot, targetPath);
    if (agent === 'CURSOR' && fs.existsSync(path.join(projectRoot, '.cursor'))) {
      const cursorRulesDir = path.join(projectRoot, '.cursor', 'rules');
      if (!fs.existsSync(cursorRulesDir)) fs.mkdirSync(cursorRulesDir, { recursive: true });
      
      const skills = fs.readdirSync(SKILLS_SOURCE);
      for (const skill of skills) {
        const skillMd = path.join(SKILLS_SOURCE, skill, 'SKILL.md');
        if (fs.existsSync(skillMd)) {
          fs.copyFileSync(skillMd, path.join(cursorRulesDir, `${skill}.mdc`));
        }
      }
    } else if (agent !== 'AGY' && fs.existsSync(path.join(projectRoot, targetPath.split('/')[0]))) {
      copyFolderSync(SKILLS_SOURCE, fullPath);
    }
  }

  console.log("\n✨ Installation complete!");
  console.log(`Use /jira-git-workflow:checkout in your AI agent to begin!\n`);
}

run().catch(err => {
  console.error("❌ Installation failed:", err);
  process.exit(1);
});
