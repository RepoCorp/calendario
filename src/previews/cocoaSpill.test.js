import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createCocoaSpill } from './cocoaSpill.js';

function fixture() {
  const scene = new THREE.Scene();
  const mug = new THREE.Group();
  const material = new THREE.MeshPhysicalMaterial();
  scene.add(mug);
  const spill = createCocoaSpill(scene, mug, material);
  return { mug, material, spill, mesh: scene.getObjectByName('cocoa-overflow-stream') };
}

function pour(spill, rate, angle, frames = 120) {
  for (let frame = 0; frame < frames; frame++) {
    spill.addVolume(0, rate / 120, angle);
    spill.step(1 / 120);
    spill.render();
  }
}

function ringCenter(position, ring) {
  const center = new THREE.Vector3();
  for (let side = 0; side < 12; side++) {
    center.add(new THREE.Vector3().fromBufferAttribute(position, ring * 12 + side));
  }
  return center.divideScalar(12);
}

test('spill stays anchored and has finite, outward-facing geometry through tilted pours', () => {
  const { mug, spill, mesh } = fixture();
  for (const pitch of [-28, 0, 28]) {
    for (const roll of [-28, 0, 28]) {
      for (const angle of [0, 0.4, Math.PI / 2, Math.PI, 4.7]) {
        for (const rate of [0.0001, 0.01, 0.15, 0.6]) {
          spill.reset();
          mug.rotation.set(THREE.MathUtils.degToRad(pitch), 0, THREE.MathUtils.degToRad(roll));
          mug.position.set(0.2, 0.12, -0.3);
          pour(spill, rate, angle);
          assert.equal(mesh.visible, true);
          const { position, normal } = mesh.geometry.attributes;
          assert.ok(position.array.every(Number.isFinite));
          assert.ok(normal.array.every(Number.isFinite));
          const rim = new THREE.Vector3(Math.cos(angle) * 0.958, 2.075, Math.sin(angle) * 0.958)
            .applyMatrix4(mug.matrixWorld);
          assert.ok(ringCenter(position, 0).distanceTo(rim) < 1e-6);
          const index = mesh.geometry.index;
          const centers = Array.from({ length: 65 }, (_, ring) => ringCenter(position, ring));
          for (let face = 0; face < mesh.geometry.drawRange.count; face += 3) {
            const ai = index.getX(face);
            const a = new THREE.Vector3().fromBufferAttribute(position, ai);
            const b = new THREE.Vector3().fromBufferAttribute(position, index.getX(face + 1));
            const c = new THREE.Vector3().fromBufferAttribute(position, index.getX(face + 2));
            const outward = a.clone().sub(centers[Math.floor(ai / 12)]);
            const faceNormal = b.sub(a).cross(c.sub(a));
            assert.ok(faceNormal.dot(outward) >= -1e-9,
              `folded face at pitch=${pitch}, roll=${roll}, angle=${angle}, rate=${rate}, ring=${Math.floor(ai / 12)}`);
          }
        }
      }
    }
  }
});

test('greater flow thickens the stream and stopped input drains then disappears', () => {
  const { spill, mesh } = fixture();
  function width(rate) {
    spill.reset();
    pour(spill, rate, Math.PI / 2);
    const p = mesh.geometry.attributes.position;
    return new THREE.Vector3().fromBufferAttribute(p, 0)
      .distanceTo(new THREE.Vector3().fromBufferAttribute(p, 6));
  }
  assert.ok(width(0.004) > width(0.001) * 1.8);
  spill.reset();
  spill.addVolume(0, 0.06, Math.PI / 2);
  spill.step(1 / 120);
  spill.render();
  assert.equal(mesh.visible, true);
  for (let i = 0; i < 240; i++) {
    spill.step(1 / 120);
    spill.render();
  }
  assert.equal(mesh.visible, false);
});

test('debug uses opaque depth-tested magenta and reset removes pending flow', () => {
  const { spill, mesh, material } = fixture();
  spill.setDebug(true);
  assert.equal(mesh.material.isMeshBasicMaterial, true);
  assert.equal(mesh.material.color.getHexString(), 'ff00ff');
  assert.equal(mesh.material.transparent, false);
  assert.equal(mesh.material.depthTest, true);
  spill.setDebug(false);
  assert.equal(mesh.material, material);
  pour(spill, 0.6, Math.PI / 2, 10);
  spill.reset();
  spill.step(1 / 120);
  spill.render();
  assert.equal(mesh.visible, false);
});

test('moving cup and changing liquid crest update the live spill origin immediately', () => {
  const { mug, spill, mesh } = fixture();
  pour(spill, .2, 0, 50);
  mug.rotation.set(.4, 0, -.7);
  mug.position.set(.2, .6, 0);
  spill.addVolume(4, .2 / 120, Math.PI / 2);
  spill.step(1 / 120); spill.render();
  const expected = new THREE.Vector3(0, 2.075, .958).applyMatrix4(mug.matrixWorld);
  assert.ok(ringCenter(mesh.geometry.attributes.position, 0).distanceTo(expected) < 1e-6);
});

test('stopped flow detaches immediately and cannot resume from a stored reservoir', () => {
  const { mug, spill, mesh } = fixture();
  pour(spill, .6, Math.PI / 2, 120);
  mug.position.x = 3;
  spill.step(1 / 120); spill.render();
  const head = ringCenter(mesh.geometry.attributes.position, 0);
  assert.ok(head.x < 1, 'detached chocolate followed the newly moved mug');
  for (let i = 0; i < 120; i++) { spill.step(1 / 120); spill.render(); }
  assert.equal(mesh.visible, false);
});

test('falling tail retains its emitted world position while fresh flow follows the cup', () => {
  const { mug, spill, mesh } = fixture();
  pour(spill, .015, Math.PI / 2, 80);
  mug.position.x = .3;
  spill.addVolume(4, .015 / 120, Math.PI / 2);
  spill.step(1 / 120); spill.render();
  const p = mesh.geometry.attributes.position;
  nearCenter(p, 0, .3);
  const lastRing = mesh.geometry.drawRange.count / (12 * 6);
  assert.ok(Math.abs(ringCenter(p, lastRing).x) < .02, 'emitted tail moved rigidly with cup');
  function nearCenter(position, ring, x) { assert.ok(Math.abs(ringCenter(position, ring).x - x) < 1e-5); }
});

test('steep pours within the new tilt limit keep finite geometry connected to the rim', () => {
  const { mug, spill, mesh } = fixture();
  mug.rotation.set(0, 0, -Math.PI / 3);
  pour(spill, .32, 0, 80);
  const p = mesh.geometry.attributes.position;
  assert.ok(p.array.every(Number.isFinite));
  const rim = new THREE.Vector3(.958, 2.075, 0).applyMatrix4(mug.matrixWorld);
  assert.ok(ringCenter(p, 0).distanceTo(rim) < 1e-6);
  assert.ok(ringCenter(p, mesh.geometry.drawRange.count / 72).y < rim.y);
});
