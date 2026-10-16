import { useEffect, useRef, useState } from 'react';
import '../components/Day08Layout.css';
import SleighMessageReveal from '../components/SleighMessageReveal';

const GAME_WIDTH = 360;
const GAME_HEIGHT = 560;
const MOON_HORIZON = 125;
// Leave a modest gap below the artwork for steering without covering the sleigh.
const INITIAL_SLEIGH = { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 82, vx: 0 };
const INITIAL_SPEED = 150;
const CRUISING_SPEED = 300;
const MAX_SPEED = 420;
const SPEED_ACCELERATION = 40;
const SPEED_BOOST_AFTER_SECONDS = 5;
const BOOSTED_ACCELERATION = 80;
const MESSAGE_RIDE_SECONDS = 10;
const FIRST_CRATER_TRAVEL = 24;
const MIN_CRATER_GAP = 70;
const MAX_CRATER_GAP = 100;
// Match the previous size at the sleigh's height, keeping it fixed for the whole approach.
const CRATER_SCALE = 0.79;
const CRATER_ZONES = [44, 112, 180, 248, 316];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createCraterPattern() {
  return { zones: [], recentX: [], seed: 0xdec08, count: 0 };
}

// A private, resettable generator makes the route independent of input and frame rate.
function nextCraterRandom(pattern) {
  pattern.seed = (Math.imul(pattern.seed, 1664525) + 1013904223) >>> 0;
  return pattern.seed / 4294967296;
}

function takeCraterZone(pattern) {
  if (pattern.zones.length === 0) {
    pattern.zones = [...CRATER_ZONES];
    for (let index = pattern.zones.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(nextCraterRandom(pattern) * (index + 1));
      [pattern.zones[index], pattern.zones[swap]] = [pattern.zones[swap], pattern.zones[index]];
    }
  }

  const recent = pattern.recentX;
  const lastX = recent[recent.length - 1];
  const isDifferentZone = (x) => lastX === undefined || Math.abs(x - lastX) >= 48;
  const followsLongSweep = (x) => recent.length === 3
    && Math.sign(recent[1] - recent[0]) === Math.sign(recent[2] - recent[1])
    && Math.sign(x - recent[2]) === Math.sign(recent[2] - recent[1]);
  // Reorder the remaining zones instead of forcing a repeating left/right pattern.
  let index = pattern.zones.findIndex((x) => isDifferentZone(x) && !followsLongSweep(x));
  if (index < 0) index = pattern.zones.findIndex(isDifferentZone);
  if (index < 0) index = 0;
  return pattern.zones.splice(index, 1)[0];
}

function createCrater(travel, pattern) {
  const radius = 28 + nextCraterRandom(pattern) * 30;
  const targetX = takeCraterZone(pattern) + (nextCraterRandom(pattern) - 0.5) * 16;
  const edge = radius * CRATER_SCALE + 4;
  const x = clamp(targetX, edge, GAME_WIDTH - edge);
  pattern.recentX = [...pattern.recentX.slice(-2), x];

  return {
    id: pattern.count++,
    x,
    groundY: -travel,
    radius,
    depth: 0.35 + nextCraterRandom(pattern) * 0.3,
  };
}

function craterFootprint(crater, travel) {
  const y = MOON_HORIZON + crater.groundY + travel;
  const radiusX = crater.radius * CRATER_SCALE;
  return { x: crater.x, y, radiusX, radiusY: radiusX * 0.38 };
}

function drawMoonSky(context, aspectCorrection = 1) {
  context.save();
  context.scale(1, aspectCorrection);
  const sky = context.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, '#091018');
  sky.addColorStop(0.45, '#112236');
  sky.addColorStop(1, '#26364b');
  context.fillStyle = sky;
  context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  context.fillStyle = 'rgba(255, 246, 220, 0.9)';
  for (let index = 0; index < 18; index += 1) {
    const x = ((index * 47) % 320) + 20;
    const y = ((index * 83) % 160) + 26;
    const size = index % 3 === 0 ? 2.4 : 1.5;
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
  }

  // Keep Earth above the raised horizon even on shorter phone layouts.
  const earthScale = Math.min(1, (MOON_HORIZON - 12) / (100 * aspectCorrection));
  context.save();
  context.translate(282, 52 * earthScale);
  context.scale(earthScale, earthScale);
  const glow = context.createRadialGradient(0, 0, 28, 0, 0, 76);
  glow.addColorStop(0, 'rgba(110, 198, 255, 0.28)');
  glow.addColorStop(1, 'rgba(110, 198, 255, 0)');
  context.fillStyle = glow;
  context.fillRect(-76, -76, 152, 152);

  context.save();
  context.beginPath();
  context.arc(0, 0, 35, 0, Math.PI * 2);
  context.clip();

  const ocean = context.createRadialGradient(-13, -15, 2, 0, 0, 39);
  ocean.addColorStop(0, '#7ed7ee');
  ocean.addColorStop(0.45, '#258cc6');
  ocean.addColorStop(1, '#0c3979');
  context.fillStyle = ocean;
  context.fillRect(-35, -35, 70, 70);

  // Simplified continents and cloud bands make Earth readable at phone size.
  context.fillStyle = '#85b88b';
  context.beginPath();
  context.moveTo(-30, -19);
  context.lineTo(-19, -28);
  context.lineTo(-8, -26);
  context.lineTo(-3, -19);
  context.lineTo(3, -16);
  context.lineTo(-4, -9);
  context.lineTo(-2, -4);
  context.lineTo(-8, 0);
  context.lineTo(-13, -6);
  context.lineTo(-23, -10);
  context.closePath();
  context.fill();

  context.beginPath();
  context.moveTo(-8, -1);
  context.lineTo(-1, 3);
  context.lineTo(1, 8);
  context.lineTo(-4, 5);
  context.closePath();
  context.fill();

  context.fillStyle = '#6da677';
  context.beginPath();
  context.moveTo(0, 5);
  context.quadraticCurveTo(9, 3, 16, 12);
  context.lineTo(10, 20);
  context.lineTo(7, 28);
  context.lineTo(2, 33);
  context.lineTo(-2, 23);
  context.lineTo(-5, 13);
  context.closePath();
  context.fill();

  context.fillStyle = '#e0f2ec';
  context.beginPath();
  context.ellipse(4, -33, 15, 4, -0.1, 0, Math.PI * 2);
  context.ellipse(8, -26, 4, 7, 0.4, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = 'rgba(247, 253, 255, 0.8)';
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(-31, -16);
  context.bezierCurveTo(-17, -24, 4, -17, 26, -22);
  context.moveTo(-30, 4);
  context.bezierCurveTo(-15, -1, -7, 6, -1, 4);
  context.moveTo(12, 0);
  context.bezierCurveTo(27, -6, 32, 4, 23, 9);
  context.moveTo(-22, 22);
  context.bezierCurveTo(-10, 17, 14, 30, 30, 18);
  context.stroke();

  const shade = context.createLinearGradient(-26, -10, 35, 15);
  shade.addColorStop(0, 'rgba(4, 17, 45, 0)');
  shade.addColorStop(0.6, 'rgba(4, 17, 45, 0.04)');
  shade.addColorStop(1, 'rgba(4, 17, 45, 0.65)');
  context.fillStyle = shade;
  context.fillRect(-35, -35, 70, 70);
  context.restore();

  context.strokeStyle = 'rgba(162, 225, 255, 0.6)';
  context.lineWidth = 1.3;
  context.beginPath();
  context.arc(0, 0, 35, 0, Math.PI * 2);
  context.stroke();
  context.restore();
  context.restore();
}

function createMoonGroundLight(context, top, bottom) {
  const light = context.createLinearGradient(0, top, 0, bottom);
  light.addColorStop(0, 'rgba(46, 50, 56, 0.32)');
  light.addColorStop(0.2, 'rgba(57, 61, 66, 0.12)');
  light.addColorStop(0.65, 'rgba(218, 217, 210, 0.03)');
  light.addColorStop(1, 'rgba(218, 217, 210, 0.16)');
  return light;
}

function drawMoonGround(context, travel, texture) {
  // A few low, gentle rises keep the distant horizon almost level.
  context.fillStyle = '#737677';
  context.beginPath();
  context.moveTo(0, MOON_HORIZON - 1);
  context.quadraticCurveTo(24, MOON_HORIZON - 5, 48, MOON_HORIZON - 3);
  context.bezierCurveTo(70, MOON_HORIZON - 1, 87, MOON_HORIZON - 6, 110, MOON_HORIZON - 4);
  context.quadraticCurveTo(148, MOON_HORIZON, 181, MOON_HORIZON - 2);
  context.quadraticCurveTo(217, MOON_HORIZON - 4, 245, MOON_HORIZON - 3);
  context.quadraticCurveTo(275, MOON_HORIZON, 302, MOON_HORIZON - 3);
  context.quadraticCurveTo(329, MOON_HORIZON - 5, GAME_WIDTH, MOON_HORIZON - 2);
  context.lineTo(GAME_WIDTH, MOON_HORIZON + 1);
  context.lineTo(0, MOON_HORIZON + 1);
  context.closePath();
  context.fill();

  context.save();
  context.beginPath();
  context.rect(0, MOON_HORIZON, GAME_WIDTH, GAME_HEIGHT - MOON_HORIZON);
  context.clip();

  context.fillStyle = '#999997';
  context.fillRect(0, MOON_HORIZON, GAME_WIDTH, GAME_HEIGHT - MOON_HORIZON);
  if (texture?.complete && texture.naturalWidth > 0 && texture.naturalHeight > 0) {
    const tileHeight = GAME_WIDTH * (texture.naturalHeight / texture.naturalWidth);
    const offset = travel % tileHeight;
    // Preserve the image proportions and keep its movement locked to the craters.
    for (let y = MOON_HORIZON + offset - tileHeight; y < GAME_HEIGHT; y += tileHeight) {
      context.drawImage(texture, 0, y, GAME_WIDTH, tileHeight);
    }
  }

  context.fillStyle = createMoonGroundLight(context, MOON_HORIZON, GAME_HEIGHT);
  context.fillRect(0, MOON_HORIZON, GAME_WIDTH, GAME_HEIGHT - MOON_HORIZON);
  context.restore();
}

function traceCraterRim(context, radius, phase) {
  context.beginPath();
  for (let index = 0; index <= 48; index += 1) {
    const angle = (index / 48) * Math.PI * 2;
    const weathering = 1 + Math.sin(angle * 3 + phase) * 0.035
      + Math.sin(angle * 7 - phase) * 0.022 + Math.cos(angle * 13 + phase) * 0.012;
    const x = Math.cos(angle) * radius * weathering;
    const y = Math.sin(angle) * radius * weathering;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

function drawCrater(context, crater, travel, texture) {
  const { x, y, radiusX, radiusY } = craterFootprint(crater, travel);
  // Keep each crater's weathering fixed as it travels, with sunlight from the upper left.
  const phase = crater.x * 0.19 + crater.radius * 0.37;
  context.save();
  context.translate(x, y);
  context.scale(radiusX, radiusY);

  const dust = context.createRadialGradient(0, 0, 0.8, 0, 0, 1.3);
  dust.addColorStop(0, 'rgba(151, 150, 144, 0.16)');
  dust.addColorStop(0.6, 'rgba(151, 150, 144, 0.05)');
  dust.addColorStop(1, 'rgba(151, 150, 144, 0)');
  context.fillStyle = dust;
  context.fillRect(-1.3, -1.3, 2.6, 2.6);

  context.save();
  traceCraterRim(context, 1, phase);
  context.clip();
  context.fillStyle = '#858580';
  context.fillRect(-1.1, -1.1, 2.2, 2.2);
  if (texture?.complete && texture.naturalWidth > 0 && texture.naturalHeight > 0) {
    const tileHeight = GAME_WIDTH * (texture.naturalHeight / texture.naturalWidth);
    const offset = travel % tileHeight;
    // Sample the ground at the same world position, preserving its grain scale and motion.
    for (let tileY = MOON_HORIZON + offset - tileHeight; tileY < y + radiusY * 1.1; tileY += tileHeight) {
      if (tileY + tileHeight < y - radiusY * 1.1) continue;
      context.drawImage(texture, -x / radiusX, (tileY - y) / radiusY, GAME_WIDTH / radiusX, tileHeight / radiusY);
    }
  }
  context.fillStyle = createMoonGroundLight(context, (MOON_HORIZON - y) / radiusY, (GAME_HEIGHT - y) / radiusY);
  context.fillRect(-1.1, -1.1, 2.2, 2.2);
  const rim = context.createLinearGradient(-0.6, -0.8, 0.6, 0.9);
  rim.addColorStop(0, 'rgba(218, 215, 205, 0.22)');
  rim.addColorStop(0.42, 'rgba(138, 137, 130, 0.05)');
  rim.addColorStop(1, 'rgba(34, 34, 31, 0.4)');
  context.fillStyle = rim;
  context.fillRect(-1.1, -1.1, 2.2, 2.2);
  context.restore();

  // Broken radial ridges soften the smooth ring into a worn, rocky lip.
  context.lineWidth = 0.025;
  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2 + phase;
    const reach = 0.94 + Math.sin(index * 2.7 + phase) * 0.05;
    context.strokeStyle = index % 3 === 0 ? 'rgba(42, 42, 38, 0.22)' : 'rgba(199, 196, 185, 0.18)';
    context.beginPath();
    context.moveTo(Math.cos(angle) * 0.77, Math.sin(angle) * 0.77);
    context.lineTo(Math.cos(angle + 0.025) * reach, Math.sin(angle + 0.025) * reach);
    context.stroke();
  }

  context.save();
  traceCraterRim(context, 0.8, phase);
  context.clip();
  // A dark near wall and a lit far wall make the basin read as a depression.
  const bowl = context.createLinearGradient(-0.35, -0.7, 0.4, 0.8);
  bowl.addColorStop(0, 'rgba(24, 24, 22, 0.7)');
  bowl.addColorStop(0.28, 'rgba(33, 33, 29, 0.57)');
  bowl.addColorStop(0.58, 'rgba(58, 58, 52, 0.32)');
  bowl.addColorStop(1, 'rgba(185, 181, 167, 0.1)');
  context.fillStyle = bowl;
  context.fillRect(-1, -1, 2, 2);

  const shadow = context.createRadialGradient(-0.2, -0.38, 0.12, -0.04, -0.15, 0.85);
  shadow.addColorStop(0, `rgba(22, 22, 20, ${0.2 + crater.depth * 0.18})`);
  shadow.addColorStop(1, 'rgba(22, 22, 20, 0)');
  context.fillStyle = shadow;
  context.fillRect(-1, -1, 2, 2);

  const floor = context.createRadialGradient(0.08, 0.18, 0.06, 0.08, 0.18, 0.57);
  floor.addColorStop(0, 'rgba(142, 140, 130, 0.16)');
  floor.addColorStop(1, 'rgba(142, 140, 130, 0)');
  context.fillStyle = floor;
  context.fillRect(-0.6, -0.4, 1.3, 1.2);

  context.restore();

  // A narrow, uneven sunlit crest instead of a bright outline around the whole crater.
  context.strokeStyle = 'rgba(218, 213, 198, 0.26)';
  context.lineWidth = 0.025;
  context.beginPath();
  for (let index = 0; index <= 16; index += 1) {
    const angle = Math.PI * (1.05 + (index / 16) * 0.55);
    const radius = 0.91 + Math.sin(angle * 7 - phase) * 0.022;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.stroke();
  context.restore();
}

function drawSleigh(context, sleigh, image, aspectCorrection = 1) {
  context.save();
  context.translate(sleigh.x, sleigh.y);
  context.scale(1, aspectCorrection);
  context.rotate(clamp(sleigh.vx * 0.012, -0.22, 0.22));

  if (image?.complete && image.naturalWidth > 0) {
    const width = 64;
    const height = width * (image.naturalHeight / image.naturalWidth);
    context.drawImage(image, -width / 2, 3 - height / 2, width, height);
    context.restore();
    return;
  }

  // Keep a rear-view silhouette visible while the artwork loads, or if it fails.
  context.strokeStyle = '#d8b55b';
  context.lineWidth = 4;
  context.lineCap = 'round';

  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(side * 20, 30);
    context.lineTo(side * 16, -22);
    context.quadraticCurveTo(side * 17, -31, side * 21, -26);
    context.stroke();
  }

  context.fillStyle = '#701724';
  context.fillRect(-16, -21, 32, 24);
  context.fillStyle = '#fff0ca';
  context.fillRect(-9, -18, 18, 16);
  context.fillStyle = '#2f8051';
  context.fillRect(-2, -18, 4, 16);
  context.fillRect(-9, -12, 18, 4);

  context.fillStyle = '#9b1629';
  context.beginPath();
  context.moveTo(-26, -6);
  context.quadraticCurveTo(0, 3, 26, -6);
  context.lineTo(24, 17);
  context.quadraticCurveTo(0, 25, -24, 17);
  context.closePath();
  context.fill();
  context.lineWidth = 2;
  context.stroke();

  context.restore();
}

export default function Day08() {
  const canvasRef = useRef(null);
  const sleighImageRef = useRef(null);
  const groundImageRef = useRef(null);
  const sceneRef = useRef(null);
  const animationRef = useRef(0);
  const pointerRef = useRef({ id: null, x: INITIAL_SLEIGH.x });
  const messageCompleteRef = useRef(false);
  const gameRef = useRef({
    sleigh: { ...INITIAL_SLEIGH },
    craters: [],
    speed: INITIAL_SPEED,
    travel: 0,
    distance: 0,
    elapsed: 0,
    nextCraterTravel: FIRST_CRATER_TRAVEL,
    craterPattern: createCraterPattern(),
  });

  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [distance, setDistance] = useState(0);
  const [messageProgress, setMessageProgress] = useState(0);
  const [messageComplete, setMessageComplete] = useState(false);

  useEffect(() => {
    const image = new Image();
    image.src = '/images/day08-christmas-sleigh-rear.png';
    sleighImageRef.current = image;

    const groundImage = new Image();
    groundImage.src = '/images/day08-lunar-surface.png';
    groundImageRef.current = groundImage;

    return () => {
      sleighImageRef.current = null;
      groundImageRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    let previousTime = performance.now();
    let distanceAccumulator = 0;

    const syncCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      // Drawing and pointer input share the same logical game coordinates.
      context.setTransform(canvas.width / GAME_WIDTH, 0, 0, canvas.height / GAME_HEIGHT, 0, 0);
      context.imageSmoothingQuality = 'high';
    };

    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);

    const update = (deltaSeconds) => {
      const state = gameRef.current;

      if (!started || gameOver) return;

      const pointer = pointerRef.current;
      const gentleSeconds = Math.min(deltaSeconds, Math.max(0, SPEED_BOOST_AFTER_SECONDS - state.elapsed));
      if (gentleSeconds > 0) {
        state.speed = Math.min(CRUISING_SPEED, state.speed + gentleSeconds * SPEED_ACCELERATION);
      }
      state.speed = Math.min(MAX_SPEED, state.speed + (deltaSeconds - gentleSeconds) * BOOSTED_ACCELERATION);

      if (pointer.id !== null) {
        const follow = 1 - Math.exp(-18 * deltaSeconds);
        const nextX = clamp(state.sleigh.x + (pointer.x - state.sleigh.x) * follow, 44, GAME_WIDTH - 44);
        state.sleigh.vx = deltaSeconds > 0 ? (nextX - state.sleigh.x) / deltaSeconds : 0;
        state.sleigh.x = nextX;
      } else {
        state.sleigh.vx = 0;
      }

      // Surface marks and embedded craters advance through the same ground coordinates.
      state.travel += state.speed * deltaSeconds;

      while (state.travel >= state.nextCraterTravel) {
        state.craters.push(createCrater(state.nextCraterTravel, state.craterPattern));
        state.nextCraterTravel += MIN_CRATER_GAP + nextCraterRandom(state.craterPattern) * (MAX_CRATER_GAP - MIN_CRATER_GAP);
      }

      state.craters = state.craters.filter((crater) => {
        const footprint = craterFootprint(crater, state.travel);
        return footprint.y - footprint.radiusY < GAME_HEIGHT + 26;
      });

      const collision = state.craters.some((crater) => {
        const footprint = craterFootprint(crater, state.travel);
        const dx = (state.sleigh.x - footprint.x) / (footprint.radiusX + 12);
        const dy = (state.sleigh.y - footprint.y) / (footprint.radiusY + 8);
        return dx * dx + dy * dy < 1;
      });

      if (collision) {
        setGameOver(true);
        if (!messageCompleteRef.current) setMessageProgress(0);
        return;
      }

      state.elapsed += deltaSeconds;
      if (!messageCompleteRef.current && state.elapsed >= MESSAGE_RIDE_SECONDS) {
        messageCompleteRef.current = true;
        setMessageComplete(true);
        setMessageProgress(1);
      }
      state.distance += deltaSeconds * (state.speed * 0.12);
      distanceAccumulator += deltaSeconds;

      if (distanceAccumulator >= 0.12) {
        distanceAccumulator = 0;
        setDistance(Math.floor(state.distance));
        if (!messageCompleteRef.current) setMessageProgress(state.elapsed / MESSAGE_RIDE_SECONDS);
      }
    };

    const render = () => {
      context.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      const aspectCorrection = (canvas.width / GAME_WIDTH) / (canvas.height / GAME_HEIGHT);
      drawMoonSky(context, aspectCorrection);
      drawMoonGround(context, gameRef.current.travel, groundImageRef.current);

      context.save();
      context.beginPath();
      context.rect(0, MOON_HORIZON, GAME_WIDTH, GAME_HEIGHT - MOON_HORIZON);
      context.clip();
      gameRef.current.craters.forEach((crater) => drawCrater(context, crater, gameRef.current.travel, groundImageRef.current));
      context.restore();

      if (started && !gameOver) {
        context.save();
        context.strokeStyle = 'rgba(255, 236, 176, 0.32)';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(gameRef.current.sleigh.x - 18, gameRef.current.sleigh.y + 33);
        context.lineTo(gameRef.current.sleigh.x - 19, gameRef.current.sleigh.y + 48);
        context.moveTo(gameRef.current.sleigh.x + 18, gameRef.current.sleigh.y + 33);
        context.lineTo(gameRef.current.sleigh.x + 19, gameRef.current.sleigh.y + 48);
        context.stroke();
        context.restore();
      }

      drawSleigh(context, gameRef.current.sleigh, sleighImageRef.current, aspectCorrection);

      if (!started) {
        context.fillStyle = 'rgba(8, 17, 27, 0.46)';
        context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }

      if (gameOver) {
        context.fillStyle = 'rgba(66, 12, 28, 0.34)';
        context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }
    };

    const tick = (time) => {
      const deltaSeconds = Math.min((time - previousTime) / 1000, 0.033);
      previousTime = time;
      update(deltaSeconds);
      render();
      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', syncCanvasSize);
    };
  }, [gameOver, started]);

  const resetGame = () => {
    gameRef.current = {
      sleigh: { ...INITIAL_SLEIGH },
      craters: [],
      speed: INITIAL_SPEED,
      travel: 0,
      distance: 0,
      elapsed: 0,
      nextCraterTravel: FIRST_CRATER_TRAVEL,
      craterPattern: createCraterPattern(),
    };
    pointerRef.current = { id: null, x: INITIAL_SLEIGH.x };
    setDistance(0);
    if (!messageCompleteRef.current) setMessageProgress(0);
    setGameOver(false);
  };

  const startGame = () => {
    resetGame();
    setStarted(true);
  };

  const updatePointer = (event) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((event.clientX - rect.left) / rect.width) * GAME_WIDTH;
    pointerRef.current.x = clamp(x, 36, GAME_WIDTH - 36);
  };

  const handlePointerDown = (event) => {
    if (pointerRef.current.id !== null || event.button !== 0) return;
    event.preventDefault();

    if (!started) {
      startGame();
    } else if (gameOver) {
      resetGame();
    }

    pointerRef.current.id = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updatePointer(event);
  };

  const handlePointerMove = (event) => {
    if (pointerRef.current.id !== event.pointerId) return;
    updatePointer(event);
  };

  const handlePointerEnd = (event) => {
    if (pointerRef.current.id !== event.pointerId) return;
    pointerRef.current.id = null;
    gameRef.current.sleigh.vx = 0;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <main className="page day08-page">
      <section className="day01-card day08-card">
        <div className="day08-layout">
          <p className="day01-date day08-date">Diciembre 8</p>
          <SleighMessageReveal progress={messageProgress} complete={messageComplete}>
            <h1 className="day01-title day08-title">
              <span>Un paseo en trineo lunar.</span>
            </h1>
            <p className="day01-lead day08-lead">
              Una carrera navidena en silencio, con estrellas arriba y un viaje heladito por delante.
            </p>
          </SleighMessageReveal>

          <div className="day08-scene">
            <div
              ref={sceneRef}
              className={`day08-game${started ? ' is-started' : ''}${gameOver ? ' is-over' : ''}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onLostPointerCapture={handlePointerEnd}
              onContextMenu={(event) => event.preventDefault()}
              role="application"
              aria-label="Juego del trineo lunar"
            >
              <canvas ref={canvasRef} className="day08-canvas" />

              <span className="day08-distance" aria-label={`Recorrido: ${distance} metros`}>{distance} m</span>
              {gameOver ? (
                <div className="day08-restart" role="status" aria-label="Fin del recorrido. Toca para volver a empezar.">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 7v5h-5 M20 12a8 8 0 1 0-2 5" />
                  </svg>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
