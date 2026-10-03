# Pixy Do

A minimal, gamified pixel-art to-do app. Plain HTML, CSS and JavaScript, no build step.

Open `index.html` in a browser and start adding quests.

## How it works

- **Quests**: add a task with a priority (High +30 XP, Medium +20, Low +10). Click a task's text to edit it.
- **XP and levels**: completing a quest earns XP, and every 100 XP is a level. Un-checking a quest takes its XP back.
- **Daily garden**: a pixel plant grows from seed to sprout to bloom as you finish today's quests.
- **Streak and week**: any day with a completed quest counts toward your streak.
- **Focus timer**: 25 minute focus / 5 minute break. A finished focus session gives +10 XP.
- **Shortcut**: press `N` to jump to the new quest input.

Everything is saved in your browser's `localStorage`.

## Files

- `index.html`: layout
- `style.css`: pixel styling
- `script.js`: state, XP, timer and rendering
