# world-generator

A p5.js angled isometric-grid world generator with Perlin-noise terrain and mouse-driven panning.

## Features
- Infinite 2D terrain grid generated from Perlin noise.
- Biomes: sea, beach, grassland, forest, village, desert, mountain, and snow.
- Cute angled block aesthetics with shaded faces and biome-specific props (trees, flowers, houses, cacti, pines, rocks, palms).
- Random biome-native mobs wander around the world (fish, crabs, rabbits, deer, goats, foxes, cats, penguins, and more).
- Mountain generation is boosted to create larger and more frequent ranges.
- Center dead-zone control:
  - Mouse near screen center = world stays still.
  - Move mouse away from center = world pans in that direction.
- Top-left HUD shows the biome under the mouse cursor, tile coordinates, and active mob count.
- Press `N` to generate a fresh world seed.

## Run
Open `index.html` in your browser.

If you want a local server:
- `python3 -m http.server 8000`
- Visit `http://localhost:8000`
