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
