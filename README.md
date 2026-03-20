# claude-context-bar

Beautiful context window status bar for Claude Code CLI.

```
◆ Opus 4.6 │ ████████████░░░░░░░░ 58% │ 116K / 200K │ $2.15
```

Shows your model, context usage with a colored progress bar, token counts, and session cost — all at a glance below the chat input.

## Features

- **Colored progress bar** — green → yellow → red as context fills up
- **Model display** — current model name
- **Token counts** — current context / max window size
- **Session cost** — running total
- **Warning indicator** — ⚠ when context is critically high
- **Chain-compatible** — works alongside other statuslines (e.g., claude-presence)
- **Zero dependencies** — pure Node.js
- **Configurable** — customize bar width, thresholds, what to show

## Install

```bash
npx claude-context-bar setup
```

That's it. Restart Claude Code and the status bar appears.

### What setup does

1. Detects any existing statusline and saves it for chaining
2. Sets `claude-context-bar` as your statusline in `~/.claude/settings.json`
3. Creates a config file at `~/.claude/context-bar.json`

### Global install (optional)

```bash
npm install -g claude-context-bar
claude-context-bar setup
```

## Uninstall

```bash
npx claude-context-bar uninstall
```

Restores your previous statusline if one existed.

## Configuration

Edit `~/.claude/context-bar.json`:

```json
{
  "barWidth": 20,
  "showModel": true,
  "showTokens": true,
  "showCost": true,
  "showDuration": false,
  "showRateLimit": false,
  "showLinesChanged": false,
  "compactMode": false,
  "thresholds": {
    "green": 50,
    "yellow": 70,
    "red": 85
  },
  "chainCommand": null
}
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `barWidth` | `20` | Width of the progress bar in characters |
| `showModel` | `true` | Show current model name |
| `showTokens` | `true` | Show token count (used / max) |
| `showCost` | `true` | Show session cost |
| `showDuration` | `false` | Show session duration |
| `showRateLimit` | `false` | Show rate limit usage when > 50% |
| `showLinesChanged` | `false` | Show lines added/removed |
| `compactMode` | `false` | Shorter model names (Opus → O) |
| `thresholds` | `{50,70,85}` | Percentage thresholds for color changes |
| `chainCommand` | `null` | Command to run after rendering (auto-detected) |

### Color thresholds

The progress bar changes color based on context usage:

| Range | Color | Meaning |
|-------|-------|---------|
| 0–49% | Green | Healthy |
| 50–69% | Yellow | Moderate |
| 70–84% | Red | High usage |
| 85–100% | Bright Red + ⚠ | Critical — approaching auto-compact |

### Chaining

If you have another statusline tool (like `claude-presence` for Discord RPC), `claude-context-bar` automatically detects it during setup and chains with it. Your existing tool continues to work — it just receives the JSON payload after our bar renders.

To manually set a chain:

```json
{
  "chainCommand": "node \"/path/to/other/statusline.js\""
}
```

## CLI Commands

```bash
npx claude-context-bar setup      # Install and configure
npx claude-context-bar uninstall  # Remove and restore previous
npx claude-context-bar config     # Show current configuration
npx claude-context-bar preview    # Preview the status bar styles
npx claude-context-bar            # Show help
```

## How it works

Claude Code pipes JSON session data to the statusline command's stdin on every update. This includes:

- `context_window.used_percentage` — how full your context is
- `context_window.context_window_size` — max tokens (200K, 1M, etc.)
- `context_window.current_usage.input_tokens` — current token count
- `model.display_name` — active model name
- `cost.total_cost_usd` — running session cost
- `rate_limits` — API rate limit status

The script reads this JSON, renders a colored status line, and prints it to stdout. Claude Code displays the output at the bottom of the interface.

## License

MIT
