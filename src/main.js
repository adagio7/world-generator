const state = {
  camGX: 0,
  camGY: 0,
  worldSeed: 1,
  lastSpeedX: 0,
  lastSpeedY: 0,
  hoveredTile: { gx: 0, gy: 0, biome: "grass", rawHeight: 0 },
  mobs: [],
  nextMobId: 1
};

function initializeWorld() {
  state.worldSeed = floor(random(1, 10_000_000));
  noiseSeed(state.worldSeed);
  WGMobs.reset(state);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  initializeWorld();
}

function draw() {
  WGRender.drawSky();
  WGCamera.updateFromMouse(state);
  WGRender.updateHoveredTileInfo(state);
  WGRender.drawWorldGrid(state);
  WGMobs.update(state);
  WGMobs.draw(state);
  WGHud.draw(state);
}

function keyPressed() {
  if (key === "n" || key === "N") {
    initializeWorld();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
