import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSnowBoundary, collideWithSnowBoundary, rollFromSnowContact, trackSnowRest, touchesSnowBoundary } from './snowRevealBoundary.js';

const cells = Array.from({ length: 36 * 36 }, (_, i) => ({
  covered: Math.hypot(i % 36 - 18, Math.floor(i / 36) - 18) < 4,
}));

test('revealed patch persists and excludes particles while hidden areas remain open', () => {
  const field = buildSnowBoundary(cells, 36, 360, 360);
  assert.equal(field.escape(20, 20), null);
  for (let frame = 0; frame < 100; frame += 1) {
    const escaped = field.escape(185, 185);
    assert.ok(escaped);
    assert.equal(field.escape(escaped.x, escaped.y), null);
  }
});

test('swept collisions block a fast crossing even with both endpoints outside', () => {
  const field = buildSnowBoundary(cells, 36, 360, 360);
  const hit = collideWithSnowBoundary(field, 185, 20, 185, 340);
  assert.ok(hit);
  assert.ok(hit.y < 150);
  assert.ok(hit.ny < 0);
});

test('resized field follows normalized cleared patches', () => {
  const field = buildSnowBoundary(cells, 36, 720, 180);
  assert.ok(field.escape(370, 92.5));
  assert.equal(field.escape(185, 185), null);
});

test('completed note blocks its whole width while permitting flow outside it', () => {
  for (const width of [292, 358, 620]) {
    const field = buildSnowBoundary(cells, 36, width, 360, true);
    assert.ok(field.escape(width / 2, 180));
    for (const x of [-60, width + 60]) {
      assert.equal(collideWithSnowBoundary(field, x, -60, x, 420), null);
    }
    for (const x of [18, width - 18]) {
      assert.ok(collideWithSnowBoundary(field, x, -60, x, 420));
    }
  }
});

test('collision stays on the incoming path rather than jumping to an escape cell', () => {
  const field = buildSnowBoundary(cells, 36, 360, 360);
  const hit = collideWithSnowBoundary(field, 185, 20, 185, 340);
  assert.equal(hit.x, 185);
  assert.equal(hit.inside, false);
  assert.equal(field.escape(hit.x, hit.y), null);
});

test('new reveal surrounding a flake requests gradual escape without changing position', () => {
  const field = buildSnowBoundary(cells, 36, 360, 360);
  const hit = collideWithSnowBoundary(field, 185, 185, 185, 186);
  assert.equal(hit.inside, true);
  assert.equal(hit.x, 185);
  assert.equal(hit.y, 185);
});


test('flakes pass curved reveal edges without settling into stationary clusters', () => {
  const field = buildSnowBoundary(cells, 36, 360, 360);
  for (let startX = 115; startX <= 245; startX += 5) {
    let x = startX, y = 75, vx = 0, vy = 0;
    const viewport = { left: -16, top: -275, width: 392, height: 844 };
    for (let frame = 0; frame < 900; frame += 1) {
      vx *= 0.94; vy *= 0.94;
      const hit = collideWithSnowBoundary(field, x, y, x + vx, y + 1 + vy);
      if (hit) {
        const next = rollFromSnowContact(field, hit, viewport);
        assert.ok(Math.hypot(next.x - x, next.y - y) < 10, 'no position jump');
        x = next.x; y = next.y; vx = next.vx; vy = next.vy - 1;
      } else { x += vx; y += 1 + vy; }
    }
    assert.ok(y > 360, `flake from ${startX} stuck at ${x}, ${y}`);
  }
});

test('curved peak starts three pixels above the message border', () => {
  const field = buildSnowBoundary(cells, 36, 360, 360, true);
  assert.equal(field.escape(180, -3.1), null);
  assert.ok(field.escape(180, -3));
  const hit = collideWithSnowBoundary(field, 180, -40, 180, 10);
  assert.ok(hit.y >= -6 && hit.y <= -3);
});

test('even a subpixel strip outside each message edge stays open', () => {
  const field = buildSnowBoundary(cells, 36, 358, 360, true);
  for (const x of [-0.1, 358.1]) {
    assert.equal(collideWithSnowBoundary(field, x, -40, x, 410), null);
  }
  assert.ok(field.escape(0.1, 180));
  assert.ok(field.escape(357.9, 180));
});

test('contact rolls downhill with no rebound impulse', () => {
  const viewport = { left: 0, top: 0, width: 390, height: 844 };
  for (const nx of [-0.5, 0, 0.5]) {
    const ny = -Math.sqrt(1 - nx * nx);
    const result = rollFromSnowContact(null, { x: 150, y: 200, nx, ny, inside: false }, viewport);
    assert.ok(result.vy >= -0.05, 'no upward launch');
    assert.ok(Math.abs(result.vx * nx + result.vy * ny) <= 0.041);
    if (nx) assert.equal(Math.sign(result.vx), Math.sign(nx));
  }
});

test('top collision follows a shallow symmetric curve with rounded shoulders', () => {
  const field = buildSnowBoundary(cells, 36, 360, 360, true);
  assert.ok(field.escape(180, 0));
  assert.equal(field.escape(18, 5), null);
  assert.equal(field.escape(342, 5), null);
  const left = field.escape(18, 25);
  const right = field.escape(342, 25);
  assert.ok(left && right);
  assert.ok(left.nx < 0 && right.nx > 0);
  assert.ok(Math.abs(left.nx + right.nx) < 1e-9);
  assert.equal(field.escape(0, 32), null);
  assert.ok(field.escape(0, 33));
});

test('blocked rolling reports contact without immediately freezing', () => {
  const field = { escape: (x) => x < 0 ? { x: 0, y: 0, nx: 1, ny: 0 } : null };
  const contact = { x: 0, y: 0, nx: 0, ny: -1, inside: false };
  const viewport = { left: -10, top: -100, width: 390, height: 844 };
  for (let frame = 0; frame < 50; frame += 1) {
    const result = rollFromSnowContact(field, contact, viewport);
    assert.deepEqual(result, { x: 0, y: 0, vx: 0, vy: 0, blocked: true });
  }
});


test('rest requires sustained stationary blockage and current boundary contact', () => {
  const first = trackSnowRest(null, true, true, 10, 10, 100);
  assert.equal(first.resting, false);
  assert.equal(trackSnowRest(first, true, true, 10, 10, 499).resting, false);
  assert.equal(trackSnowRest(first, true, true, 10, 10, 500).resting, true);
  assert.equal(trackSnowRest(first, true, false, 10, 10, 600), null);
  assert.equal(trackSnowRest(first, false, true, 10, 10, 600), null);
  assert.equal(trackSnowRest(first, true, true, 12, 10, 600).resting, false);
  assert.equal(touchesSnowBoundary(null, 10, 10), false);
});
