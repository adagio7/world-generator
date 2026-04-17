const WGCamera = (() => {
  function updateFromMouse(state) {
    const cx = width * 0.5;
    const cy = height * 0.5;
    const deadX = width * WGConfig.deadZoneRatio * 0.5;
    const deadY = height * WGConfig.deadZoneRatio * 0.5;

    const dx = mouseX - cx;
    const dy = mouseY - cy;

    state.lastSpeedX = 0;
    state.lastSpeedY = 0;

    if (abs(dx) > deadX) {
      const nx = constrain((abs(dx) - deadX) / (cx - deadX), 0, 1);
      state.lastSpeedX = (dx > 0 ? 1 : -1) * pow(nx, 1.25) * WGConfig.maxScrollSpeed;
    }

    if (abs(dy) > deadY) {
      const ny = constrain((abs(dy) - deadY) / (cy - deadY), 0, 1);
      state.lastSpeedY = (dy > 0 ? 1 : -1) * pow(ny, 1.25) * WGConfig.maxScrollSpeed;
    }

    state.camGX += state.lastSpeedX * 0.05;
    state.camGY += state.lastSpeedY * 0.05;
  }

  function screenToGrid(mx, my, state, hEstimate) {
    const originX = width * 0.5;
    const originY = height * 0.62;
    const u = (mx - originX) / (WGConfig.tileW * 0.5);
    const v = (my - originY + hEstimate * WGConfig.heightStep) / (WGConfig.tileH * 0.5);
    const rx = (u + v) * 0.5;
    const ry = (v - u) * 0.5;

    return {
      gx: rx + state.camGX,
      gy: ry + state.camGY
    };
  }

  return {
    updateFromMouse,
    screenToGrid
  };
})();
