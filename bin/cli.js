#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// ─── Paths ───────────────────────────────────────────────────────────────────

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SETTINGS_PATH = path.join(CLAUDE_DIR, 'settings.json');
const CONFIG_PATH = path.join(CLAUDE_DIR, 'context-bar.json');
const STATUSLINE_SCRIPT = path.resolve(__dirname, '..', 'src', 'statusline.js');

// ─── ANSI ────────────────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  brightWhite: '\x1b[97m',
  brightCyan: '\x1b[96m',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeJSON(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

// ─── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  console.log('');
  console.log(`  ${C.brightCyan}${C.bold}◆ claude-context-bar${C.reset} setup`);
  console.log(`  ${C.dim}${'─'.repeat(40)}${C.reset}`);
  console.log('');

  // Ensure .claude directory exists
  if (!fs.existsSync(CLAUDE_DIR)) {
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  }

  // Read current settings
  const settings = readJSON(SETTINGS_PATH);
  const config = readJSON(CONFIG_PATH);

  // Detect and save existing statusline for chaining
  const existingCmd = settings.statusLine?.command;
  const ourCmd = `node "${normalizePath(STATUSLINE_SCRIPT)}"`;

  if (existingCmd && !existingCmd.includes('context-bar')) {
    config.chainCommand = existingCmd;
    console.log(`  ${C.cyan}→${C.reset} Found existing statusline — will chain with it`);
    console.log(`    ${C.dim}${existingCmd}${C.reset}`);
  } else if (existingCmd && existingCmd.includes('context-bar')) {
    console.log(`  ${C.yellow}→${C.reset} Already installed — updating configuration`);
  }

  // Set our statusline
  settings.statusLine = {
    type: 'command',
    command: ourCmd,
  };

  // Write settings
  writeJSON(SETTINGS_PATH, settings);
  console.log(`  ${C.green}→${C.reset} Status line configured in ${C.dim}settings.json${C.reset}`);

  // Write config with defaults for any missing keys
  const defaults = {
    barWidth: 20,
    showModel: true,
    showTokens: true,
    showCost: true,
    showDuration: false,
    showRateLimit: false,
    showLinesChanged: false,
    compactMode: false,
    thresholds: { green: 50, yellow: 70, red: 85 },
  };

  const merged = { ...defaults, ...config, thresholds: { ...defaults.thresholds, ...config.thresholds } };
  writeJSON(CONFIG_PATH, merged);
  console.log(`  ${C.green}→${C.reset} Config saved to ${C.dim}~/.claude/context-bar.json${C.reset}`);

  console.log('');
  console.log(`  ${C.green}${C.bold}✓ Done!${C.reset} Restart Claude Code to see your status bar.`);
  console.log('');
  console.log(`  ${C.dim}Customize:  Edit ~/.claude/context-bar.json${C.reset}`);
  console.log(`  ${C.dim}Remove:     npx claude-context-bar uninstall${C.reset}`);
  console.log('');

  // Show preview
  showPreview();
}

// ─── Uninstall ───────────────────────────────────────────────────────────────

function uninstall() {
  console.log('');
  console.log(`  ${C.brightCyan}${C.bold}◆ claude-context-bar${C.reset} uninstall`);
  console.log(`  ${C.dim}${'─'.repeat(40)}${C.reset}`);
  console.log('');

  const settings = readJSON(SETTINGS_PATH);
  const config = readJSON(CONFIG_PATH);

  // Restore chained statusline if one was saved
  if (config.chainCommand) {
    settings.statusLine = {
      type: 'command',
      command: config.chainCommand,
    };
    console.log(`  ${C.cyan}→${C.reset} Restored previous statusline`);
    console.log(`    ${C.dim}${config.chainCommand}${C.reset}`);
  } else {
    delete settings.statusLine;
    console.log(`  ${C.cyan}→${C.reset} Removed statusline from settings`);
  }

  writeJSON(SETTINGS_PATH, settings);

  // Remove config file
  try {
    fs.unlinkSync(CONFIG_PATH);
    console.log(`  ${C.cyan}→${C.reset} Removed config file`);
  } catch {
    // Already gone
  }

  console.log('');
  console.log(`  ${C.green}${C.bold}✓ Done!${C.reset} Restart Claude Code to apply changes.`);
  console.log('');
}

// ─── Preview ─────────────────────────────────────────────────────────────────

function showPreview() {
  const bar20 = '\x1b[32m' + '\u2588'.repeat(4) + '\x1b[2m' + '\u2591'.repeat(16) + C.reset;
  const bar58 = '\x1b[93m' + '\u2588'.repeat(12) + '\x1b[2m' + '\u2591'.repeat(8) + C.reset;
  const bar87 = '\x1b[91m' + '\u2588'.repeat(17) + '\x1b[2m' + '\u2591'.repeat(3) + C.reset;

  console.log(`  ${C.dim}Preview:${C.reset}`);
  console.log(`  ${C.green}◆${C.reset} ${C.bold}${C.brightWhite}Opus 4.6${C.reset} ${C.dim}│${C.reset} ${bar20} ${C.green}${C.bold}20%${C.reset} ${C.dim}│${C.reset} ${C.dim}40K / 200K${C.reset}`);
  console.log(`  ${C.yellow}◆${C.reset} ${C.bold}${C.brightWhite}Opus 4.6${C.reset} ${C.dim}│${C.reset} ${bar58} ${C.yellow}${C.bold}58%${C.reset} ${C.dim}│${C.reset} ${C.dim}116K / 200K${C.reset} ${C.dim}│${C.reset} ${C.dim}${C.green}$2.15${C.reset}`);
  console.log(`  ${C.red}${C.bold}⚠${C.reset} ${C.bold}${C.brightWhite}Opus 4.6${C.reset} ${C.dim}│${C.reset} ${bar87} ${C.red}${C.bold}87%${C.reset} ${C.dim}│${C.reset} ${C.dim}174K / 200K${C.reset} ${C.dim}│${C.reset} ${C.dim}${C.green}$8.40${C.reset}`);
  console.log('');
}

// ─── Config ──────────────────────────────────────────────────────────────────

function showConfig() {
  console.log('');
  console.log(`  ${C.brightCyan}${C.bold}◆ claude-context-bar${C.reset} config`);
  console.log(`  ${C.dim}${'─'.repeat(40)}${C.reset}`);
  console.log('');

  const config = readJSON(CONFIG_PATH);
  if (Object.keys(config).length === 0) {
    console.log(`  ${C.yellow}No config found.${C.reset} Run ${C.cyan}npx claude-context-bar setup${C.reset} first.`);
  } else {
    console.log(`  ${C.dim}${CONFIG_PATH}${C.reset}`);
    console.log('');
    for (const [key, val] of Object.entries(config)) {
      if (typeof val === 'object' && val !== null) {
        console.log(`  ${C.brightWhite}${key}:${C.reset}`);
        for (const [k, v] of Object.entries(val)) {
          console.log(`    ${C.dim}${k}: ${C.reset}${v}`);
        }
      } else {
        const display = val === null ? `${C.dim}null${C.reset}` : val;
        console.log(`  ${C.brightWhite}${key}: ${C.reset}${display}`);
      }
    }
  }
  console.log('');
}

// ─── Help ────────────────────────────────────────────────────────────────────

function showHelp() {
  console.log('');
  console.log(`  ${C.brightCyan}${C.bold}◆ claude-context-bar${C.reset}`);
  console.log(`  ${C.dim}Beautiful context window status bar for Claude Code${C.reset}`);
  console.log('');
  console.log(`  ${C.bold}Usage:${C.reset}`);
  console.log(`    npx claude-context-bar ${C.green}setup${C.reset}       Install and configure`);
  console.log(`    npx claude-context-bar ${C.green}uninstall${C.reset}   Remove and restore previous`);
  console.log(`    npx claude-context-bar ${C.green}config${C.reset}      Show current configuration`);
  console.log(`    npx claude-context-bar ${C.green}preview${C.reset}     Preview the status bar`);
  console.log('');
  console.log(`  ${C.bold}Config:${C.reset} ${C.dim}~/.claude/context-bar.json${C.reset}`);
  console.log('');
  console.log(`  ${C.bold}Options:${C.reset}`);
  console.log(`    ${C.brightWhite}barWidth${C.reset}          Bar width in chars ${C.dim}(default: 20)${C.reset}`);
  console.log(`    ${C.brightWhite}showModel${C.reset}         Show model name ${C.dim}(default: true)${C.reset}`);
  console.log(`    ${C.brightWhite}showTokens${C.reset}        Show token counts ${C.dim}(default: true)${C.reset}`);
  console.log(`    ${C.brightWhite}showCost${C.reset}          Show session cost ${C.dim}(default: true)${C.reset}`);
  console.log(`    ${C.brightWhite}showDuration${C.reset}      Show session time ${C.dim}(default: false)${C.reset}`);
  console.log(`    ${C.brightWhite}showRateLimit${C.reset}     Show rate limit % ${C.dim}(default: false)${C.reset}`);
  console.log(`    ${C.brightWhite}showLinesChanged${C.reset}  Show +/- lines ${C.dim}(default: false)${C.reset}`);
  console.log(`    ${C.brightWhite}compactMode${C.reset}       Shorter display ${C.dim}(default: false)${C.reset}`);
  console.log(`    ${C.brightWhite}thresholds${C.reset}        Color thresholds ${C.dim}(green/yellow/red)${C.reset}`);
  console.log(`    ${C.brightWhite}chainCommand${C.reset}      Command to run after ${C.dim}(auto-detected)${C.reset}`);
  console.log('');

  showPreview();
}

// ─── CLI Entry ───────────────────────────────────────────────────────────────

const cmd = process.argv[2];

switch (cmd) {
  case 'setup':
  case 'install':
    setup();
    break;
  case 'uninstall':
  case 'remove':
    uninstall();
    break;
  case 'config':
  case 'status':
    showConfig();
    break;
  case 'preview':
  case 'demo':
    showPreview();
    break;
  default:
    showHelp();
    break;
}
