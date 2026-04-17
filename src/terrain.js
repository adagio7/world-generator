const WGTerrain = (() => {
  function sampleHeight(gx, gy) {
    const n = noise(gx * 0.08 + 100, gy * 0.08 + 200);
    const r = noise(gx * 0.028 + 4200, gy * 0.028 + 4300);
    let h = floor(map(n, 0, 1, 1, 11));
    h += floor(max(0, r - 0.54) * 6.4);
    return constrain(h, 1, 12);
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
    const isFlat =
      abs(sampleHeight(gx + 1, gy) - rawHeight) <= 1 &&
      abs(sampleHeight(gx, gy + 1) - rawHeight) <= 1;

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
    } else if (
      villageNoise > 0.83 &&
      isFlat &&
      rawHeight > seaLevel + 1 &&
      moisture > 0.35 &&
      moisture < 0.7
    ) {
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

  function toIso(x, y, h, ox, oy) {
    const sx = ox + (x - y) * (WGConfig.tileW * 0.5);
    const sy = oy + (x + y) * (WGConfig.tileH * 0.5) - h * WGConfig.heightStep;
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

  function formatBiomeName(biome) {
    return biome.charAt(0).toUpperCase() + biome.slice(1);
  }

  return {
    sampleHeight,
    sampleTile,
    toIso,
    biomePalette,
    formatBiomeName
  };
})();
