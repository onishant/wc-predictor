import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readFileSync } from 'fs';
import path from 'path';

const file = path.resolve('public/assets/characters/readyplayerme/RPM_Masculine_TPose.glb');
const buf = readFileSync(file);
const loader = new GLTFLoader();

// Stub self for Node
if (typeof globalThis.self === 'undefined') globalThis.self = globalThis;

loader.parse(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  '',
  (gltf) => {
    const bones = [];
    gltf.scene.traverse((o) => {
      if (o.isBone) bones.push(o.name);
    });
    console.log('=== BONES (', bones.length, ') ===');
    bones.forEach((b) => console.log(' -', b));
    console.log('SkinnedMeshes:', []);
  },
  (e) => {
    if (e && e.message && e.message.includes('Texture')) {
      // bones may have been parsed; retry without textures
      const loader2 = new GLTFLoader();
      loader2.parse(
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        '',
        (gltf) => {
          const bones = [];
          gltf.scene.traverse((o) => { if (o.isBone) bones.push(o.name); });
          console.log('=== BONES (', bones.length, ') ===');
          bones.forEach((b) => console.log(' -', b));
        },
        () => {},
      );
    } else {
      console.error('err', e?.message ?? e);
    }
  },
);
