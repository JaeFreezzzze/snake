# NEON / SNAKE

A neon arcade Snake game built with plain HTML, CSS and JavaScript. No build step or dependencies required.

## Run

Open `index.html` in a modern browser, use `run.bat` on Windows, or serve locally:

```sh
python3 -m http.server 8000
```

## Controls

- **Enter**: start / resume / play again
- **Arrow keys / WASD**: steer
- **Space**: pause / resume
- **R**: reset to the start screen
- **Mobile**: swipe the board or use the directional buttons

Choose Chill, Classic or Hyper speed. Changing difficulty resets the round. Every five energy pickups increases the level and speed. Pick up energy within 3.2 seconds of the previous pickup to build a score multiplier up to ×5. The highest score is stored locally in your browser across all modes. Sound effects are optional and off by default.

Features include a glowing canvas arena, animated energy, particle bursts, shockwaves, collision feedback, automatic pause when the tab is hidden, and reduced-motion support.

## Arcade challenges

- Press **Shift** or tap the **冲刺** button for a 1.6-second speed burst with double pickup points (6.5-second cooldown).
- Every three normal pickups spawns a golden star: reach it within 6.5 seconds for 75 points (150 during dash).
- Every four normal pickups spawns a random shield or slow-time power-up, available for 10 seconds. Slow time lasts 7 seconds.
- A shield absorbs one collision: a wall hit wraps you to the opposite edge; a body hit sheds the tail.
- Complete the displayed pickup mission for bonus points and a shield; subsequent missions require more food.
- All gameplay timers, including combos and power-ups, freeze while paused. Changing difficulty or restarting resets the challenge.

## Roguelite progression

Every 5 normal pickups pauses the run for a random, distinct three-choice relic draft. Click a card or press **1 / 2 / 3**. Relics reset each run; stacks are capped and fully upgraded relics leave the pool. Seven relics support greed (points with faster movement), dash, slow-time, combos, shedding, shields, and treasure builds. If all relics are maxed, the run continues without a draft.

Open **成长基地** to buy permanent starting shield, dash cooldown reductions, or crystal income upgrades. Opening the base pauses a live run; purchases apply on the next run. Crystal payout is `floor((food + completed missions × 3 + floor(score / 100) + victory bonus 25) × (1 + collector level × 15%))`. Death, victory, reset, and difficulty changes settle a run once. Abandoning by refreshing or closing the page does not settle an unfinished run.

Wallet, permanent upgrades, and completed run count save to this browser's local storage (`neon-snake-meta-v1`). Existing high scores remain intact. No account or cloud sync is required; clearing browser data clears progression. When storage is unavailable, a visible notice explains that progression only lasts for the current page.

### Browser regression check

With Python Playwright and Chromium installed, run `python3 tests/roguelite_smoke.py`. The check serves the checkout on an automatically chosen local port and uses an isolated browser profile.
