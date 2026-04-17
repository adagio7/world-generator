const DEAD_ZONE_RATIO = 0.22;
const MAX_SCROLL_SPEED = 12;

const TILE_W = 48;
const TILE_H = 24;
const HEIGHT_STEP = 10;

const MAX_MOBS = 54;
const MOB_DESPAWN_RADIUS = 55;
const MOB_SPAWN_RADIUS = 32;

let camGX = 0;
let camGY = 0;
let worldSeed = 1;
let lastSpeedX = 0;
let lastSpeedY = 0;
let hoveredTile = { gx: 0, gy: 0, biome: "grass", rawHeight: 0 };
let mobs = [];
let nextMobId = 1;

const BIOME_SPECIES = {
  sea: ["fish"],
  beach: ["crab", "seagull"],
  grass: ["rabbit", "sheep"],
  forest: ["deer", "fox"],
  village: ["cat", "dog"],
  desert: ["lizard", "fennec"],
  mountain: ["goat", "eagle"],
  snow: ["snow_hare", "penguin"]
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  initializeWorld();
}

function initializeWorld() {
  worldSeed = floor(random(1, 10_000_000));
  noiseSeed(worldSeed);
  mobs = [];
  nextMobId = 1;
}

function draw() {
  drawSky();
  updateCameraFromMouse();
  updateHoveredTileInfo();
  drawWorldGrid();
  updateMobs();
  drawMobs();
  drawHud();
}

function drawSky() {
  background(145, 211, 243);
  noStroke();
  for (let i = 0; i < 10; i += 1) {
    fill(188 - i * 4, 236 - i * 3, 250 - i * 2, 70);
    rect(0, (i / 10) * height * 0.42, width, height * 0.05);
  }
}

function updateCameraFromMouse() {
  const cx = width * 0.5;
  const cy = height * 0.5;
  const deadX = width * DEAD_ZONE_RATIO * 0.5;
  const deadY = height * DEAD_ZONE_RATIO * 0.5;

  const dx = mouseX - cx;
  const dy = mouseY - cy;

  lastSpeedX = 0;
  lastSpeedY = 0;

  if (abs(dx) > deadX) {
    const nx = constrain((abs(dx) - deadX) / (cx - deadX), 0, 1);
    lastSpeedX = (dx > 0 ? 1 : -1) * pow(nx, 1.25) * MAX_SCROLL_SPEED;
  }

  if (abs(dy) > deadY) {
    const ny = constrain((abs(dy) - deadY) / (cy - deadY), 0, 1);
    lastSpeedY = (dy > 0 ? 1 : -1) * pow(ny, 1.25) * MAX_SCROLL_SPEED;
  }

  camGX += lastSpeedX * 0.05;
  camGY += lastSpeedY * 0.05;
}

function updateHoveredTileInfo() {
  const originX = width * 0.5;
  const originY = height * 0.62;
  let guessHeight = 6;
  let gx = 0;
  let gy = 0;

  for (let i = 0; i < 2; i += 1) {
    const solved = screenToGrid(mouseX, mouseY, originX, originY, guessHeight);
    gx = round(solved.gx);
    gy = round(solved.gy);
    const tile = sampleTile(gx, gy);
    guessHeight = tile.height;
  }

  hoveredTile = {
    gx,
    gy,
    ...sampleTile(gx, gy)
  };
}

function screenToGrid(mx, my, ox, oy, hEstimate) {
  const u = (mx - ox) / (TILE_W * 0.5);
  const v = (my - oy + hEstimate * HEIGHT_STEP) / (TILE_H * 0.5);
  const rx = (u + v) * 0.5;
  const ry = (v - u) * 0.5;

  return {
    gx: rx + camGX,
    gy: ry + camGY
  };
}

function drawWorldGrid() {
  const originX = width * 0.5;
  const originY = height * 0.62;

  const rangeX = ceil(width / TILE_W) + 8;
  const rangeY = ceil(height / TILE_H) + 8;
  const baseGX = floor(camGX);
  const baseGY = floor(camGY);

  const tiles = [];
  for (let ly = -rangeY; ly <= rangeY; ly += 1) {
    for (let lx = -rangeX; lx <= rangeX; lx += 1) {
      const gx = baseGX + lx;
      const gy = baseGY + ly;
      const tile = sampleTile(gx, gy);
      const screen = toIso(gx - camGX, gy - camGY, tile.height, originX, originY);
      tiles.push({ gx, gy, ...tile, ...screen });
    }
  }

  tiles.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

  for (const t of tiles) {
    if (t.sx < -TILE_W || t.sx > width + TILE_W || t.sy > height + 160) {
      continue;
    }
    drawTileBlock(t);
  }

  for (const t of tiles) {
    if (t.sx < -TILE_W || t.sx > width + TILE_W || t.sy < -80 || t.sy > height + 120) {
      continue;
    }
    drawDecoration(t);
  }
}

function sampleTile(gx, gy) {
  const elevationNoise = noise(gx * 0.08 + 100, gy * 0.08 + 200);
  const moistureNoise = noise(gx * 0.05 + 800, gy * 0.05 + 900);
  const temperatureNoise = noise(gx * 0.045 + 1200, gy * 0.045 + 1300);
  const villageNoise = noise(gx * 0.12 + 1400, gy * 0.12 + 1500);
  const detailNoise = noise(gx * 0.19 + 2000, gy * 0.19 + 2100);
  const ridgeNoise = noise(gx * 0.028 + 4200, gy * 0.028 + 4300);

  const seaLevel = 4;
  let rawHeight = floor(map(elevationNoise, 0, 1, 1, 11));
  const ridgeBoost = max(0, ridgeNoise - 0.54) * 6.4;
  rawHeight += floor(ridgeBoost);
  rawHeight = constrain(rawHeight, 1, 12);

  const moisture = moistureNoise;
  const temperature = map(temperatureNoise, 0, 1, -0.2, 1.2) - rawHeight * 0.05;
  const isShallow = rawHeight <= seaLevel + 1;
  const isFlat = abs(sampleHeight(gx + 1, gy) - rawHeight) <= 1 && abs(sampleHeight(gx, gy + 1) - rawHeight) <= 1;

  let biome = "grass";
  if (rawHeight <= seaLevel - 1) {
    biome = "sea";
  } else if (isShallow && moisture < 0.58) {
    biome = "beach";
  } else if (rawHeight >= 10 && temperature < 0.35) {
    biome = "snow";
  } else if ((rawHeight >= 8 && moisture < 0.62) || (ridgeNoise > 0.73 && rawHeight >= 7)) {
    biome = "mountain";
  } else if (temperature > 0.72 && moisture < 0.36) {
    biome = "desert";
  } else if (moisture > 0.68) {
    biome = "forest";
  } else if (villageNoise > 0.83 && isFlat && rawHeight > seaLevel + 1 && moisture > 0.35 && moisture < 0.7) {
    biome = "village";
  }

  return {
    biome,
    height: max(rawHeight, seaLevel),
    rawHeight,
    moisture,
    temperature,
    treeChance: noise(gx * 0.23 + 2200, gy * 0.23 + 2300),
    houseChance: noise(gx * 0.19 + 2700, gy * 0.19 + 2800),
    flowerChance: noise(gx * 0.32 + 3500, gy * 0.32 + 3600),
    detailChance: detailNoise
  };
}

function sampleHeight(gx, gy) {
  const n = noise(gx * 0.08 + 100, gy * 0.08 + 200);
  const r = noise(gx * 0.028 + 4200, gy * 0.028 + 4300);
  let h = floor(map(n, 0, 1, 1, 11));
  h += floor(max(0, r - 0.54) * 6.4);
  return constrain(h, 1, 12);
}

function toIso(x, y, h, ox, oy) {
  const sx = ox + (x - y) * (TILE_W * 0.5);
  const sy = oy + (x + y) * (TILE_H * 0.5) - h * HEIGHT_STEP;
  return { sx, sy };
}

function biomePalette(biome, rawHeight) {
  if (biome === "sea" || rawHeight <= 3) {
    return {
      top: color(98, 178, 226),
      right: color(65, 149, 202),
      left: color(54, 133, 182)
    };
  }

  if (biome === "beach") {
    return {
      top: color(227, 208, 154),
      right: color(199, 177, 125),
      left: color(182, 161, 114)
    };
  }

  if (biome === "forest") {
    return {
      top: color(96, 187, 102),
      right: color(73, 161, 82),
      left: color(61, 146, 74)
    };
  }

  if (biome === "village") {
    return {
      top: color(202, 189, 156),
      right: color(178, 162, 129),
      left: color(162, 145, 116)
    };
  }

  if (biome === "desert") {
    return {
      top: color(234, 194, 108),
      right: color(210, 168, 88),
      left: color(194, 154, 78)
    };
  }

  if (biome === "mountain") {
    return {
      top: color(154, 153, 160),
      right: color(129, 129, 137),
      left: color(112, 112, 122)
    };
  }

  if (biome === "snow") {
    return {
      top: color(241, 246, 252),
      right: color(212, 223, 234),
      left: color(196, 208, 220)
    };
  }

  return {
    top: color(126, 212, 114),
    right: color(96, 183, 89),
    left: color(84, 166, 80)
  };
}

function drawTileBlock(tile) {
  const { sx, sy, biome, rawHeight } = tile;
  const palette = biomePalette(biome, rawHeight);

  const top = { x: sx, y: sy - TILE_H * 0.5 };
  const right = { x: sx + TILE_W * 0.5, y: sy };
  const bottom = { x: sx, y: sy + TILE_H * 0.5 };
  const left = { x: sx - TILE_W * 0.5, y: sy };
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
    ellipse(sx - 6, sy - 1, TILE_W * 0.35, TILE_H * 0.26);
  }
}

function drawDecoration(tile) {
  const { sx, sy, biome, rawHeight, treeChance, houseChance, flowerChance, detailChance } = tile;
  if (biome === "sea" || rawHeight <= 3) {
    return;
  }

  const anchorY = sy - TILE_H * 0.35;

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

function updateMobs() {
  const kept = [];
  for (const mob of mobs) {
    const dist = abs(mob.gx - camGX) + abs(mob.gy - camGY);
    if (dist <= MOB_DESPAWN_RADIUS) {
      kept.push(mob);
    }
  }
  mobs = kept;

  let attempts = 0;
  while (mobs.length < MAX_MOBS && attempts < MAX_MOBS * 3) {
    attempts += 1;
    const gx = floor(camGX + random(-MOB_SPAWN_RADIUS, MOB_SPAWN_RADIUS));
    const gy = floor(camGY + random(-MOB_SPAWN_RADIUS, MOB_SPAWN_RADIUS));
    const tile = sampleTile(gx, gy);

    if (tile.biome === "sea" && random() > 0.35) {
      continue;
    }
    if (random() < 0.45) {
      continue;
    }

    spawnMob(gx + random(-0.25, 0.25), gy + random(-0.25, 0.25), tile.biome);
  }

  for (const mob of mobs) {
    mob.wanderTimer -= 1;
    if (mob.wanderTimer <= 0 || dist(mob.gx, mob.gy, mob.targetGX, mob.targetGY) < 0.2) {
      pickMobTarget(mob);
      mob.wanderTimer = floor(random(45, 130));
    }

    const vx = mob.targetGX - mob.gx;
    const vy = mob.targetGY - mob.gy;
    const d = sqrt(vx * vx + vy * vy) + 0.0001;
    mob.gx += (vx / d) * mob.speed;
    mob.gy += (vy / d) * mob.speed;
    mob.anim += 0.13 + mob.speed * 2.5;
  }
}

function spawnMob(gx, gy, biome) {
  const speciesList = BIOME_SPECIES[biome] || ["rabbit"];
  const species = random(speciesList);
  mobs.push({
    id: nextMobId++,
    gx,
    gy,
    biome,
    species,
    targetGX: gx + random(-1, 1),
    targetGY: gy + random(-1, 1),
    speed: random(0.006, 0.02),
    wanderTimer: floor(random(40, 110)),
    anim: random(1000)
  });
}

function pickMobTarget(mob) {
  for (let i = 0; i < 8; i += 1) {
    const tx = round(mob.gx + random(-3, 3));
    const ty = round(mob.gy + random(-3, 3));
    const tile = sampleTile(tx, ty);
    if (tile.biome === mob.biome || random() < 0.22) {
      mob.targetGX = tx + random(-0.25, 0.25);
      mob.targetGY = ty + random(-0.25, 0.25);
      return;
    }
  }
  mob.targetGX = mob.gx + random(-1.2, 1.2);
  mob.targetGY = mob.gy + random(-1.2, 1.2);
}

function drawMobs() {
  const originX = width * 0.5;
  const originY = height * 0.62;
  const visible = [];

  for (const mob of mobs) {
    const tile = sampleTile(round(mob.gx), round(mob.gy));
    const pos = toIso(mob.gx - camGX, mob.gy - camGY, tile.height, originX, originY);
    const y = pos.sy - TILE_H * 0.35;
    if (pos.sx < -40 || pos.sx > width + 40 || y < -80 || y > height + 90) {
      continue;
    }
    visible.push({ ...mob, sx: pos.sx, sy: y, h: tile.height });
  }

  visible.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));
  for (const mob of visible) {
    drawMobSprite(mob);
  }
}

function drawMobSprite(mob) {
  const bounce = sin(mob.anim) * 1.3;
  const x = mob.sx;
  const y = mob.sy + bounce;

  noStroke();
  if (mob.species === "fish") {
    fill(255, 172, 116);
    ellipse(x, y, 13, 8);
    triangle(x + 6, y, x + 11, y - 4, x + 11, y + 4);
    return;
  }

  if (mob.species === "crab") {
    fill(228, 96, 76);
    ellipse(x, y, 12, 8);
    rect(x - 8, y - 2, 4, 2, 2);
    rect(x + 4, y - 2, 4, 2, 2);
    return;
  }

  if (mob.species === "seagull" || mob.species === "eagle") {
    fill(mob.species === "eagle" ? color(110, 90, 66) : color(246, 248, 252));
    ellipse(x, y - 3, 11, 7);
    stroke(60, 60, 60, 120);
    strokeWeight(1.2);
    line(x - 8, y - 3, x - 2, y - 7);
    line(x + 8, y - 3, x + 2, y - 7);
    noStroke();
    return;
  }

  if (mob.species === "rabbit" || mob.species === "snow_hare") {
    fill(mob.species === "snow_hare" ? color(244, 246, 250) : color(227, 221, 214));
    ellipse(x, y, 11, 9);
    rect(x - 4, y - 9, 2.2, 6, 2);
    rect(x - 1, y - 10, 2.2, 7, 2);
    return;
  }

  if (mob.species === "sheep") {
    fill(246, 248, 252);
    ellipse(x, y, 14, 10);
    fill(72, 72, 72);
    ellipse(x + 5, y + 1, 5, 4);
    return;
  }

  if (mob.species === "deer" || mob.species === "goat") {
    fill(mob.species === "goat" ? color(188, 180, 168) : color(167, 119, 83));
    ellipse(x, y, 13, 8);
    ellipse(x + 5, y - 3, 6, 5);
    return;
  }

  if (mob.species === "fox" || mob.species === "fennec") {
    fill(mob.species === "fennec" ? color(239, 205, 151) : color(208, 118, 74));
    ellipse(x, y, 12, 8);
    triangle(x + 5, y + 1, x + 12, y - 2, x + 11, y + 3);
    return;
  }

  if (mob.species === "cat" || mob.species === "dog") {
    fill(mob.species === "cat" ? color(160, 154, 149) : color(181, 141, 106));
    ellipse(x, y, 10, 8);
    triangle(x - 3, y - 4, x - 1, y - 8, x, y - 4);
    triangle(x + 1, y - 4, x + 3, y - 8, x + 4, y - 4);
    return;
  }

  if (mob.species === "lizard") {
    fill(88, 156, 96);
    ellipse(x, y, 12, 5);
    triangle(x + 4, y, x + 11, y - 2, x + 11, y + 2);
    return;
  }

  if (mob.species === "penguin") {
    fill(30, 36, 48);
    ellipse(x, y, 10, 13);
    fill(240, 246, 250);
    ellipse(x, y + 1, 6, 8);
    return;
  }

  fill(250, 220, 180);
  ellipse(x, y, 10, 8);
}

function formatBiomeName(biome) {
  return biome.charAt(0).toUpperCase() + biome.slice(1);
}

function drawHud() {
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

  const biomeName = formatBiomeName(hoveredTile.biome);
  const palette = biomePalette(hoveredTile.biome, hoveredTile.rawHeight);
  fill(palette.top);
  rect(padX + 14, padY + 56, 84, 28, 8);

  fill(27, 42, 54);
  textSize(13);
  text(`Biome: ${biomeName}`, padX + 106, padY + 74);

  fill(88, 103, 117);
  textSize(12);
  text(`Tile: (${hoveredTile.gx}, ${hoveredTile.gy})`, padX + 106, padY + 91);

  fill(47, 63, 78);
  textSize(12);
  text(`Seed ${worldSeed}  VX ${nf(lastSpeedX, 1, 2)}  VY ${nf(lastSpeedY, 1, 2)}  Mobs ${mobs.length}`, padX + 14, padY + 108);
}

function keyPressed() {
  if (key === "n" || key === "N") {
    initializeWorld();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
