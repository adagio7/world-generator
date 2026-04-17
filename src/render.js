const WGRender = (() => {
  function drawSky() {
    background(145, 211, 243);
    noStroke();
    for (let i = 0; i < 10; i += 1) {
      fill(188 - i * 4, 236 - i * 3, 250 - i * 2, 70);
      rect(0, (i / 10) * height * 0.42, width, height * 0.05);
    }
  }

  function updateHoveredTileInfo(state) {
    let guessHeight = 6;
    let gx = 0;
    let gy = 0;

    for (let i = 0; i < 2; i += 1) {
      const solved = WGCamera.screenToGrid(mouseX, mouseY, state, guessHeight);
      gx = round(solved.gx);
      gy = round(solved.gy);
      const tile = WGTerrain.sampleTile(gx, gy);
      guessHeight = tile.height;
    }

    state.hoveredTile = {
      gx,
      gy,
      ...WGTerrain.sampleTile(gx, gy)
    };
  }

  function drawWorldGrid(state) {
    const originX = width * 0.5;
    const originY = height * 0.62;
    const rangeX = ceil(width / WGConfig.tileW) + 8;
    const rangeY = ceil(height / WGConfig.tileH) + 8;
    const baseGX = floor(state.camGX);
    const baseGY = floor(state.camGY);

    const tiles = [];
    for (let ly = -rangeY; ly <= rangeY; ly += 1) {
      for (let lx = -rangeX; lx <= rangeX; lx += 1) {
        const gx = baseGX + lx;
        const gy = baseGY + ly;
        const tile = WGTerrain.sampleTile(gx, gy);
        const screen = WGTerrain.toIso(gx - state.camGX, gy - state.camGY, tile.height, originX, originY);
        tiles.push({ gx, gy, ...tile, ...screen });
      }
    }

    tiles.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

    for (const t of tiles) {
      if (t.sx < -WGConfig.tileW || t.sx > width + WGConfig.tileW || t.sy > height + 160) {
        continue;
      }
      drawTileBlock(t);
    }

    for (const t of tiles) {
      if (t.sx < -WGConfig.tileW || t.sx > width + WGConfig.tileW || t.sy < -80 || t.sy > height + 120) {
        continue;
      }
      drawDecoration(t);
    }
  }

  function drawTileBlock(tile) {
    const { sx, sy, biome, rawHeight } = tile;
    const palette = WGTerrain.biomePalette(biome, rawHeight);

    const top = { x: sx, y: sy - WGConfig.tileH * 0.5 };
    const right = { x: sx + WGConfig.tileW * 0.5, y: sy };
    const bottom = { x: sx, y: sy + WGConfig.tileH * 0.5 };
    const left = { x: sx - WGConfig.tileW * 0.5, y: sy };
    const depth = 36 + tile.height * 2.8;

    noStroke();
    fill(palette.left);
    quad(left.x, left.y, bottom.x, bottom.y, bottom.x, bottom.y + depth, left.x, left.y + depth);

    fill(palette.right);
    quad(right.x, right.y, bottom.x, bottom.y, bottom.x, bottom.y + depth, right.x, right.y + depth);

    fill(palette.top);
    quad(top.x, top.y, right.x, right.y, bottom.x, bottom.y, left.x, left.y);

    stroke(255, 255, 255, 34);
    strokeWeight(1);
    line(left.x, left.y, top.x, top.y);
    line(top.x, top.y, right.x, right.y);
    noStroke();

    if (biome === "sea") {
      fill(200, 236, 252, 90);
      ellipse(sx - 6, sy - 1, WGConfig.tileW * 0.35, WGConfig.tileH * 0.26);
    }
  }

  function drawDecoration(tile) {
    const { sx, sy, biome, rawHeight, treeChance, houseChance, flowerChance, detailChance } = tile;
    if (biome === "sea" || rawHeight <= 3) {
      return;
    }

    const anchorY = sy - WGConfig.tileH * 0.35;

    if (biome === "forest" && treeChance > 0.48) {
      const trunkH = 14 + treeChance * 12;
      noStroke();
      fill(133, 90, 61);
      rect(sx - 4, anchorY - trunkH, 8, trunkH);
      fill(67, 150, 80);
      ellipse(sx, anchorY - trunkH - 6, 32, 25);
      fill(95, 188, 109, 190);
      ellipse(sx - 6, anchorY - trunkH - 9, 15, 12);
      return;
    }

    if (biome === "village" && houseChance > 0.57) {
      const houseW = 24;
      const houseH = 16;
      const roofH = 11 + houseChance * 3;
      noStroke();
      fill(242, 219, 179);
      rect(sx - houseW * 0.5, anchorY - houseH, houseW, houseH, 4);
      fill(193, 94, 78);
      triangle(
        sx - houseW * 0.58,
        anchorY - houseH + 2,
        sx + houseW * 0.58,
        anchorY - houseH + 2,
        sx,
        anchorY - houseH - roofH
      );
      fill(120, 84, 61);
      rect(sx - 3, anchorY - 9, 6, 9, 2);
      return;
    }

    if (biome === "desert" && detailChance > 0.66) {
      noStroke();
      fill(66, 154, 91);
      rect(sx - 2, anchorY - 14, 4, 14, 2);
      rect(sx - 8, anchorY - 10, 4, 8, 2);
      rect(sx + 4, anchorY - 11, 4, 9, 2);
      return;
    }

    if (biome === "snow" && detailChance > 0.63) {
      noStroke();
      fill(58, 113, 82);
      triangle(sx, anchorY - 16, sx - 9, anchorY - 3, sx + 9, anchorY - 3);
      triangle(sx, anchorY - 11, sx - 8, anchorY, sx + 8, anchorY);
      fill(240, 246, 252, 170);
      ellipse(sx - 2, anchorY - 12, 6, 4);
      return;
    }

    if (biome === "mountain" && detailChance > 0.58) {
      noStroke();
      fill(108, 108, 116);
      ellipse(sx - 3, anchorY - 2, 9, 6);
      ellipse(sx + 4, anchorY - 1, 7, 5);
      return;
    }

    if (biome === "beach" && detailChance > 0.73) {
      stroke(140, 110, 74);
      strokeWeight(2);
      line(sx, anchorY, sx + 2, anchorY - 12);
      noStroke();
      fill(72, 169, 92);
      ellipse(sx + 5, anchorY - 12, 12, 6);
      ellipse(sx - 1, anchorY - 14, 11, 5);
      return;
    }

    if (biome === "grass" && flowerChance > 0.76) {
      stroke(73, 168, 73);
      strokeWeight(2);
      line(sx, anchorY, sx, anchorY - 9);
      noStroke();
      fill(245, 230, 88);
      ellipse(sx, anchorY - 9, 4.6, 4.6);
      fill(flowerChance > 0.9 ? color(244, 154, 176) : color(255, 205, 132));
      ellipse(sx - 3, anchorY - 9, 4, 4);
      ellipse(sx + 3, anchorY - 9, 4, 4);
      ellipse(sx, anchorY - 12, 4, 4);
      ellipse(sx, anchorY - 6, 4, 4);
    }
  }

  return {
    drawSky,
    updateHoveredTileInfo,
    drawWorldGrid
  };
})();
