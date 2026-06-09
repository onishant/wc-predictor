import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { readFileSync } from 'fs';
import path from 'path';

const file = path.resolve('public/assets/characters/readyplayerme/RPM_Masculine_TPose.glb');
const buf = readFileSync(file);
const loader = new GLTFLoader();
if (typeof globalThis.self === 'undefined') globalThis.self = globalThis;

loader.parse(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  '',
  (gltf) => {
    gltf.scene.traverse((o) => {
      if (o.isMesh || o.isSkinnedMesh) {
        console.log(`[${o.isSkinnedMesh ? 'SkinnedMesh' : 'Mesh'}] name="${o.name}" parent="${o.parent?.name}" bones=${o.isSkinnedMesh ? o.skeleton.bones.length : 'N/A'} geo=(${o.geometry.attributes.position.count} verts)`);
        // List material names
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => console.log(`  material: ${m.name || '(unnamed)'} color=${m.color?.getHexString()}`));
      }
    });
  },
  (e) => console.error('err', e?.message),
);
