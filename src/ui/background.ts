const DENSITY_CHARACTERS = ' .:-=+*#%@';
const CELL_WIDTH = 8;
const CELL_HEIGHT = 14;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (start: number, end: number, value: number) => {
  const progress = clamp((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
};

/** Creates seeded 2D noise samplers with values between 0 and 1. */
function createNoiseSamplers(seed: number) {
  const hash = (x: number, y: number) => {
    const hashedValue = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return hashedValue - Math.floor(hashedValue);
  };

  const sampleValueNoise = (x: number, y: number) => {
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);
    const fractionX = x - gridX;
    const fractionY = y - gridY;
    const weightX = fractionX * fractionX * (3 - 2 * fractionX);
    const weightY = fractionY * fractionY * (3 - 2 * fractionY);
    const top = hash(gridX, gridY) + (hash(gridX + 1, gridY) - hash(gridX, gridY)) * weightX;
    const bottom = hash(gridX, gridY + 1) + (hash(gridX + 1, gridY + 1) - hash(gridX, gridY + 1)) * weightX;
    return top + (bottom - top) * weightY;
  };

  const sampleFractalNoise = (x: number, y: number, octaves = 4) => {
    let weightedSum = 0;
    let amplitude = 0.5;
    let totalAmplitude = 0;
    for (let octave = 0; octave < octaves; octave++) {
      weightedSum += sampleValueNoise(x, y) * amplitude;
      totalAmplitude += amplitude;
      x *= 2.03;
      y *= 2.03;
      amplitude *= 0.5;
    }
    return weightedSum / totalAmplitude;
  };

  /** Folds the noise around its midpoint to form narrow ridges and wide valleys. */
  const sampleRidgedNoise = (x: number, y: number, octaves = 5) => {
    let weightedSum = 0;
    let amplitude = 0.55;
    let totalAmplitude = 0;
    for (let octave = 0; octave < octaves; octave++) {
      const ridge = 1 - Math.abs(sampleValueNoise(x, y) * 2 - 1);
      weightedSum += ridge * ridge * amplitude;
      totalAmplitude += amplitude;
      x *= 2.1;
      y *= 2.1;
      amplitude *= 0.48;
    }
    return weightedSum / totalAmplitude;
  };

  return { sampleFractalNoise, sampleRidgedNoise };
}

interface MountainLayer {
  baseline: number; // Fraction of the viewport height above the bottom.
  peakHeight: number; // Maximum rise above the baseline as a fraction of the viewport height.
  noiseFrequency: number;
  inkStrength: number;
}

// Ranges are ordered from the tallest, faintest background to the foreground.
const MOUNTAIN_LAYERS: MountainLayer[] = [
  { baseline: 0.16, peakHeight: 0.5, noiseFrequency: 0.011, inkStrength: 0.6 },
  { baseline: 0.08, peakHeight: 0.38, noiseFrequency: 0.018, inkStrength: 0.8 },
  { baseline: 0, peakHeight: 0.26, noiseFrequency: 0.03, inkStrength: 1 },
];

function drawMountainBackdrop(canvas: HTMLCanvasElement, seed: number): void {
  const pixelRatio = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  const context = canvas.getContext('2d');
  if (!context) return;
  context.scale(pixelRatio, pixelRatio);
  context.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.textBaseline = 'top';

  const themeStyles = getComputedStyle(document.documentElement);
  const inkColor = themeStyles.getPropertyValue('--ascii-ink').trim();
  const accentColor = themeStyles.getPropertyValue('--brand').trim();

  const { sampleFractalNoise, sampleRidgedNoise } = createNoiseSamplers(seed);
  // Add a column at each edge so every visible column has two neighbors for slope shading.
  const columnCount = Math.ceil(width / CELL_WIDTH) + 2;
  const rowCount = Math.ceil(height / CELL_HEIGHT);

  const crestHeights = MOUNTAIN_LAYERS.map((layer, layerIndex) =>
    Float32Array.from({ length: columnCount }, (_, column) => {
      const peak = sampleRidgedNoise(column * layer.noiseFrequency, layerIndex * 17.3) ** 1.8;
      const jitter = (sampleFractalNoise(column * 0.18, layerIndex * 9.1, 2) - 0.5) * 4;
      return (layer.baseline + layer.peakHeight * peak) * rowCount + jitter;
    }),
  );

  for (let column = 1; column < columnCount - 1; column++) {
    for (let row = 0; row < rowCount; row++) {
      const rowsFromBottom = rowCount - row;

      const groundFade = smoothstep(rowCount * 0.35, 0, rowsFromBottom);
      const grain = sampleFractalNoise(column * 0.9, row * 1.3, 2);

      // Blend from front to back so distant ranges show through the faded crests.
      let density = 0;
      let remainingVisibility = 1;
      for (let layerIndex = MOUNTAIN_LAYERS.length - 1; layerIndex >= 0 && remainingVisibility > 0.05; layerIndex--) {
        const crest = crestHeights[layerIndex]!;
        const depthBelowCrest = crest[column]! - rowsFromBottom;
        if (depthBelowCrest < 0) continue;

        // Left-facing light leaves the opposite slope darker.
        const slope = crest[column + 1]! - crest[column - 1]!;
        const shade = clamp(0.5 - slope * 0.18);
        const crestOpacity = smoothstep(0, 4 + layerIndex * 3, depthBelowCrest);

        // Offset the noise coordinates to give the rock strata irregular shapes.
        const textureX = column * 0.07;
        const textureY = row * 0.16 + layerIndex * 40;
        const warp = sampleFractalNoise(textureX + 3.1, textureY - 1.7, 3) * 2.4;
        const rockTexture = sampleFractalNoise(textureX + warp, textureY + warp * 0.6);

        const layerDensity = crestOpacity * MOUNTAIN_LAYERS[layerIndex]!.inkStrength
          * (0.3 + rockTexture * 0.7 + shade * 0.4 + groundFade * 0.15);
        density = Math.max(density, layerDensity * remainingVisibility);
        remainingVisibility *= 1 - crestOpacity;
      }

      if (density === 0) continue;
      density += (grain - 0.5) * 0.35;
      if (density <= 0.1) continue;

      const characterIndex = Math.min(
        DENSITY_CHARACTERS.length - 1,
        Math.floor(density * DENSITY_CHARACTERS.length * 0.9),
      );
      if (characterIndex === 0) continue;

      // Accent color appears in scattered clusters of the densest rock.
      const cluster = sampleFractalNoise(column * 0.06 + 50, row * 0.12 + 50, 3);
      const isHighlighted = characterIndex >= DENSITY_CHARACTERS.length - 2 && cluster > 0.72;

      context.fillStyle = isHighlighted ? accentColor : inkColor;
      context.globalAlpha = isHighlighted ? 0.85 : clamp(0.12 + density * 0.55, 0, 0.75);
      context.fillText(DENSITY_CHARACTERS[characterIndex]!, (column - 1) * CELL_WIDTH, row * CELL_HEIGHT);
    }
  }
}

/** Uses one random seed per load so resizing preserves the same mountain ranges. */
export function mountBackground(): void {
  const canvas = document.createElement('canvas');
  canvas.className = 'backdrop';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const seed = Math.random() * 1000;
  let redrawFrame = 0;
  const scheduleRedraw = () => {
    cancelAnimationFrame(redrawFrame);
    redrawFrame = requestAnimationFrame(() => drawMountainBackdrop(canvas, seed));
  };

  scheduleRedraw();
  window.addEventListener('resize', scheduleRedraw);
}
