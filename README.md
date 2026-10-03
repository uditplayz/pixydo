# Pixy Do

A minimal, gamified pixel-art to-do app. Plain HTML, CSS and JavaScript, no build step, no audio files.

Open `index.html` in a browser (or serve the folder) and start adding quests. The app starts empty.

## The game

- **Quests**: Boss (+30 XP), Main (+20) and Side (+10). Click a quest's text to edit it.
- **Combos**: finish quests within 90 seconds of each other to chain a combo, up to x5. Each step adds 25% bonus XP.
- **Daily goal**: complete 3 quests in a day for a +50 XP bonus. Your pixel plant grows from seed to sprout to bloom as you go.
- **Levels**: every 100 XP is a level, with a new title and a level-up screen.
- **Achievements**: 8 pixel badges to unlock (first quest, combos, boss quests, streaks, focus sessions, levels).
- **Streak and week**: any day with a completed quest counts toward your streak.
- **Focus timer**: 25 minute focus / 5 minute break. A finished focus session gives +15 XP.
- **Sound**: chiptune sound effects generated with the Web Audio API. Toggle with the `SFX` button or `M`.
- **Dark mode**: toggle with the `DARK` / `LIGHT` button or `D`. It follows your system theme until you pick one, and your choice is saved.
- **Shortcuts**: `N` jumps to the new quest input, `M` toggles sound, `D` toggles dark mode.

Un-checking a quest takes back the exact XP it gave. Deleting or clearing done quests keeps your XP.

## Screenshots

- **Light Mode**:
  
<img width="544" height="462" alt="image" src="https://github.com/user-attachments/assets/17b0b3a3-a288-46ab-b531-c9d03be61a5e" />

<br />

- **dark Mode**:

<img width="538" height="458" alt="image" src="https://github.com/user-attachments/assets/bf606472-78a0-41c0-b79f-72ec5b1c1e0f" />


## Your data

Everything is saved in your browser's `localStorage`, so it survives reloads. Use `[reset all data]` under the list to start over.

## Files

- `index.html`: layout
- `style.css`: pixel styling and animations
- `script.js`: game logic, sound, timer and rendering
