#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// ─── Config ──────────────────────────────────────────────────────────────────

const CONFIG_PATH = path.join(os.homedir(), '.claude', 'context-bar.json');

const DEFAULTS = {
  barWidth: 20,
  showModel: true,
  showTokens: true,
  showCost: true,
  showDuration: false,
  showRateLimit: false,
  showLinesChanged: false,
  compactMode: false,
  chainCommand: null,
  thresholds: { green: 50, yellow: 70, red: 85 },
};

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const user = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...user,
      thresholds: { ...DEFAULTS.thresholds, ...user.thresholds },
    };
  } catch {
    return { ...DEFAULTS };
  }
}

// ─── ANSI Colors ─────────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
};

// ─── Rendering ───────────────────────────────────────────────────────────────

function getBarColor(pct, thresholds) {
  if (pct >= thresholds.red) return C.brightRed;
  if (pct >= thresholds.yellow) return C.yellow;
  if (pct >= thresholds.green) return C.brightYellow;
  return C.green;
}

function getIndicator(pct, thresholds) {
  if (pct >= thresholds.red) return `${C.brightRed}${C.bold}⚠${C.reset}`;
  return `${getBarColor(pct, thresholds)}◆${C.reset}`;
}

function renderBar(pct, width, thresholds) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  const color = getBarColor(clamped, thresholds);

  const filledStr = '\u2588'.repeat(filled); // █
  const emptyStr = '\u2591'.repeat(empty);   // ░

  return `${color}${filledStr}${C.dim}${emptyStr}${C.reset}`;
}

function formatTokens(tokens) {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return `${tokens}`;
}

function formatCost(usd) {
  if (usd >= 100) return `$${Math.round(usd)}`;
  if (usd >= 10) return `$${usd.toFixed(1)}`;
  return `$${usd.toFixed(2)}`;
}

function formatDuration(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hrs > 0) return `${hrs}h${String(mins).padStart(2, '0')}m`;
  if (mins > 0) return `${mins}m${String(secs).padStart(2, '0')}s`;
  return `${secs}s`;
}

// ─── Model Name Prettifier ───────────────────────────────────────────────────

function prettifyModelName(raw) {
  if (!raw || raw === 'Claude') return 'Claude';

  // Already a display name like "Claude Opus 4.6" — just strip "Claude " prefix
  if (/^Claude\s/i.test(raw)) {
    return raw.replace(/^Claude\s*/i, '');
  }

  // Model ID like "claude-opus-4-6" or "claude-sonnet-4-5-20241022"
  const idMatch = raw.match(/claude-(\w+)-(\d+)-(\d+)(?:-\d+)?/i);
  if (idMatch) {
    const family = idMatch[1].charAt(0).toUpperCase() + idMatch[1].slice(1);
    return `${family} ${idMatch[2]}.${idMatch[3]}`;
  }

  // Fallback: strip "claude-" prefix and capitalize
  return raw.replace(/^claude-?/i, '').replace(/^\w/, c => c.toUpperCase()) || 'Claude';
}

// ─── Status Line Builder ─────────────────────────────────────────────────────

function buildStatusLine(input, config) {
  const sep = ` ${C.dim}\u2502${C.reset} `; // │

  // Extract data from Claude Code's JSON payload
  const rawModel = input.model?.display_name || input.model?.id || 'Claude';
  const modelName = prettifyModelName(rawModel);
  const usedPct = Math.round(input.context_window?.used_percentage || 0);
  const windowSize = input.context_window?.context_window_size || 200_000;
  const costUsd = input.cost?.total_cost_usd || 0;
  const duration = input.cost?.total_duration_ms || 0;
  const linesAdded = input.cost?.total_lines_added || 0;
  const linesRemoved = input.cost?.total_lines_removed || 0;

  // Derive token count from percentage — current_usage.input_tokens is per-call, not total context
  const currentTokens = Math.round((usedPct / 100) * windowSize);

  const thresholds = config.thresholds;
  const barColor = getBarColor(usedPct, thresholds);
  const parts = [];

  // ── Indicator + Model ──
  if (config.showModel) {
    const indicator = getIndicator(usedPct, thresholds);
    if (config.compactMode) {
      // Short model name: "Opus 4.6" → "O4.6", "Sonnet 4.6" → "S4.6"
      const short = (modelName
        .replace(/^Claude\s+/i, '')
        .replace(/Opus/i, 'O')
        .replace(/Sonnet/i, 'S')
        .replace(/Haiku/i, 'H')) || modelName;
      parts.push(`${indicator} ${C.bold}${C.brightWhite}${short}${C.reset}`);
    } else {
      const clean = modelName.replace(/^Claude\s+/i, '') || modelName;
      parts.push(`${indicator} ${C.bold}${C.brightWhite}${clean}${C.reset}`);
    }
  }

  // ── Progress Bar + Percentage ──
  const bar = renderBar(usedPct, config.barWidth, thresholds);
  const pctStr = `${barColor}${C.bold}${usedPct}%${C.reset}`;
  parts.push(`${bar} ${pctStr}`);

  // ── Token Count ──
  if (config.showTokens) {
    const used = formatTokens(currentTokens);
    const total = formatTokens(windowSize);
    parts.push(`${C.dim}${used} / ${total}${C.reset}`);
  }

  // ── Cost ──
  if (config.showCost && costUsd > 0) {
    parts.push(`${C.dim}${C.green}${formatCost(costUsd)}${C.reset}`);
  }

  // ── Duration ──
  if (config.showDuration && duration > 0) {
    parts.push(`${C.dim}${formatDuration(duration)}${C.reset}`);
  }

  // ── Lines Changed ──
  if (config.showLinesChanged && (linesAdded > 0 || linesRemoved > 0)) {
    const added = linesAdded > 0 ? `${C.green}+${linesAdded}${C.reset}` : '';
    const removed = linesRemoved > 0 ? `${C.red}-${linesRemoved}${C.reset}` : '';
    const divider = added && removed ? ` ${C.dim}/${C.reset} ` : '';
    parts.push(`${C.dim}${added}${divider}${removed}${C.reset}`);
  }

  // ── Rate Limit Warning ──
  if (config.showRateLimit) {
    const fiveHr = input.rate_limits?.five_hour?.used_percentage;
    const sevenDay = input.rate_limits?.seven_day?.used_percentage;
    const maxRate = Math.max(fiveHr || 0, sevenDay || 0);
    if (maxRate >= 50) {
      const rateColor = maxRate >= 80 ? C.brightRed : maxRate >= 60 ? C.yellow : C.dim;
      parts.push(`${rateColor}Rate: ${Math.round(maxRate)}%${C.reset}`);
    }
  }

  return parts.join(sep);
}

// ─── stdin reader ────────────────────────────────────────────────────────────

function readStdin(timeoutMs) {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), timeoutMs);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(data); });
    process.stdin.resume();
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const raw = await readStdin(3000);
  if (!raw) return;

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return;
  }

  const config = loadConfig();

  // Render our status line
  try {
    const line = buildStatusLine(input, config);
    process.stdout.write(line + '\n');
  } catch {
    // Never crash — worst case, show nothing
  }

  // Chain to previous statusline (e.g., claude-presence for Discord RPC)
  if (config.chainCommand) {
    try {
      const output = execSync(config.chainCommand, {
        input: raw,
        encoding: 'utf8',
        timeout: 3000,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      if (output && output.trim()) {
        process.stdout.write(output);
      }
    } catch {
      // Don't let chain errors break the status line
    }
  }
}

main().then(() => process.exit(0));
