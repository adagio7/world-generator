const WGMobs = (() => {
  function reset(state) {
    state.mobs = [];
    state.nextMobId = 1;
  }

  function update(state) {
    const kept = [];
    for (const mob of state.mobs) {
      const d = abs(mob.gx - state.camGX) + abs(mob.gy - state.camGY);
      if (d <= WGConfig.mobDespawnRadius) {
        kept.push(mob);
      }
    }
    state.mobs = kept;

    let attempts = 0;
    while (state.mobs.length < WGConfig.maxMobs && attempts < WGConfig.maxMobs * 3) {
      attempts += 1;
      const gx = floor(state.camGX + random(-WGConfig.mobSpawnRadius, WGConfig.mobSpawnRadius));
      const gy = floor(state.camGY + random(-WGConfig.mobSpawnRadius, WGConfig.mobSpawnRadius));
      const tile = WGTerrain.sampleTile(gx, gy);

      if (tile.biome === "sea" && random() > 0.35) {
        continue;
      }
      if (random() < 0.45) {
        continue;
      }

      spawn(state, gx + random(-0.25, 0.25), gy + random(-0.25, 0.25), tile.biome);
    }

    for (const mob of state.mobs) {
      mob.wanderTimer -= 1;
      if (mob.wanderTimer <= 0 || dist(mob.gx, mob.gy, mob.targetGX, mob.targetGY) < 0.2) {
        pickTarget(mob);
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

  function spawn(state, gx, gy, biome) {
    const species = random(WGBiomeSpecies[biome] || ["rabbit"]);
    state.mobs.push({
      id: state.nextMobId++,
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

  function pickTarget(mob) {
    for (let i = 0; i < 8; i += 1) {
      const tx = round(mob.gx + random(-3, 3));
      const ty = round(mob.gy + random(-3, 3));
      const tile = WGTerrain.sampleTile(tx, ty);
      if (tile.biome === mob.biome || random() < 0.22) {
        mob.targetGX = tx + random(-0.25, 0.25);
        mob.targetGY = ty + random(-0.25, 0.25);
        return;
      }
    }
    mob.targetGX = mob.gx + random(-1.2, 1.2);
    mob.targetGY = mob.gy + random(-1.2, 1.2);
  }

  function draw(state) {
    const originX = width * 0.5;
    const originY = height * 0.62;
    const visible = [];

    for (const mob of state.mobs) {
      const tile = WGTerrain.sampleTile(round(mob.gx), round(mob.gy));
      const pos = WGTerrain.toIso(mob.gx - state.camGX, mob.gy - state.camGY, tile.height, originX, originY);
      const y = pos.sy - WGConfig.tileH * 0.35;
      if (pos.sx < -40 || pos.sx > width + 40 || y < -80 || y > height + 90) {
        continue;
      }
      visible.push({ ...mob, sx: pos.sx, sy: y });
    }

    visible.sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));
    for (const mob of visible) {
      drawSprite(mob);
    }
  }

  function drawSprite(mob) {
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

  return {
    reset,
    update,
    draw
  };
})();
