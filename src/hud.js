const WGHud = (() => {
  function draw(state) {
    const padX = 16;
    const padY = 16;
    const cardW = 440;
    const cardH = 120;

    noStroke();
    fill(18, 33, 47, 132);
    rect(padX + 4, padY + 4, cardW, cardH, 12);

    fill(247, 252, 255, 232);
    rect(padX, padY, cardW, cardH, 12);

    fill(33, 50, 64);
    textSize(17);
    text("Isometric World Generator", padX + 14, padY + 28);

    textSize(12);
    fill(72, 90, 105);
    text("Perlin terrain, biome mobs, center-deadzone panning", padX + 14, padY + 46);

    const biomeName = WGTerrain.formatBiomeName(state.hoveredTile.biome);
    const palette = WGTerrain.biomePalette(state.hoveredTile.biome, state.hoveredTile.rawHeight);
    fill(palette.top);
    rect(padX + 14, padY + 56, 84, 28, 8);

    fill(27, 42, 54);
    textSize(13);
    text(`Biome: ${biomeName}`, padX + 106, padY + 74);

    fill(88, 103, 117);
    textSize(12);
    text(`Tile: (${state.hoveredTile.gx}, ${state.hoveredTile.gy})`, padX + 106, padY + 91);

    fill(47, 63, 78);
    textSize(12);
    text(
      `Seed ${state.worldSeed}  VX ${nf(state.lastSpeedX, 1, 2)}  VY ${nf(state.lastSpeedY, 1, 2)}  Mobs ${state.mobs.length}`,
      padX + 14,
      padY + 108
    );
  }

  return {
    draw
  };
})();
