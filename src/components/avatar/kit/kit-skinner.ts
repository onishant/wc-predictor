import {
  BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
  type Bone,
  type Object3D,
} from 'three';
import { collectBones } from './kit-bones';

export type BoneSegment = {
  /** Resolved bone name (e.g. "Hips", "Spine1"). */
  bone: string;
  /** Lower y bound in part-local space, in the part's unit-length range. */
  from: number;
  /** Upper y bound in part-local space, inclusive. */
  to: number;
  /** Maximum weight this bone can have at the peak of its band. */
  weight?: number;
};

export type SkinSpec = {
  /** Y coordinate range this part spans in the part's local frame. */
  yMin: number;
  yMax: number;
  /** Ordered bands per bone. Bands can overlap to produce smooth blends. */
  segments: BoneSegment[];
};

type PartBone = {
  bone: Bone;
  index: number; // index in the skinned mesh's bone list
  from: number;
  to: number;
  weight: number;
};

/**
 * Builds a SkinnedMesh whose vertices are weighted to the specified bones
 * with *linear* falloff between bands (not just dominant-bone snap).
 *
 * The mesh returned is NOT added to the scene — the caller parents it
 * into the avatar group and is responsible for cleanup.
 */
export function makeSkinnedPart(
  geometry: BufferGeometry,
  spec: SkinSpec,
  avatar: Object3D,
  material: MeshStandardMaterial,
  debugLabel = 'kit-part',
): SkinnedMesh {
  const bones = collectBones(avatar);

  // Resolve bones once. We only include bones that actually exist in the rig.
  const partBones: PartBone[] = [];
  spec.segments.forEach((segment) => {
    const bone = bones.get(segment.bone);
    if (!bone) return;
    partBones.push({
      bone,
      index: partBones.length,
      from: segment.from,
      to: segment.to,
      weight: segment.weight ?? 1,
    });
  });

  if (partBones.length === 0) {
    console.warn(`[kit] ${debugLabel}: no matching bones found, returning empty skinned mesh`);
  }

  // Ensure non-indexed for stable per-vertex skinning weights.
  if (geometry.index) {
    const nonIndexed = geometry.toNonIndexed();
    geometry.dispose();
    geometry = nonIndexed;
  }

  const positions = geometry.attributes.position as Float32BufferAttribute;
  const vertexCount = positions.count;
  const skinIndices = new Uint16Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);

  const yRange = spec.yMax - spec.yMin;
  const boneCount = partBones.length;

  for (let i = 0; i < vertexCount; i++) {
    const y = positions.getY(i);
    const t = (y - spec.yMin) / yRange; // 0..1 along part

    // Compute raw weights as the overlap of the vertex's t with each segment.
    const raw = new Array<number>(boneCount).fill(0);
    let total = 0;
    for (let b = 0; b < boneCount; b++) {
      const entry = partBones[b];
      const band = Math.max(0, Math.min(entry.to, t) - Math.max(entry.from, t));
      const w = entry.weight * band;
      raw[b] = w;
      total += w;
    }

    if (total > 0) {
      for (let b = 0; b < boneCount; b++) raw[b] /= total;
    } else if (boneCount > 0) {
      // Fall back to nearest segment center.
      let bestIndex = 0;
      let bestDist = Infinity;
      for (let b = 0; b < boneCount; b++) {
        const center = (partBones[b].from + partBones[b].to) / 2;
        const dist = Math.abs(t - center);
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = b;
        }
      }
      raw[bestIndex] = 1;
    }

    // Write top-4 bones by weight into the skin attributes.
    type WeightEntry = { index: number; weight: number };
    const order: WeightEntry[] = partBones.map((b, index) => ({ index, weight: raw[index] }));
    order.sort((a, b) => b.weight - a.weight);
    const top4 = order.slice(0, 4);

    for (let k = 0; k < 4; k++) {
      const entry = top4[k];
      if (entry) {
        skinIndices[i * 4 + k] = entry.index;
        skinWeights[i * 4 + k] = entry.weight;
      } else {
        skinIndices[i * 4 + k] = 0;
        skinWeights[i * 4 + k] = 0;
      }
    }
  }

  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(skinWeights, 4));

  // Compute inverse bind matrices against the avatar's current world state.
  avatar.updateMatrixWorld(true);
  const boneList = partBones.map((b) => b.bone);
  const bindMatrices = boneList.map((bone) => new Matrix4().copy(bone.matrixWorld).invert());

  const skeleton = new Skeleton(boneList, bindMatrices);
  const mesh = new SkinnedMesh(geometry, material);
  mesh.bind(skeleton);
  mesh.name = debugLabel;
  // We do NOT add skeleton.bones to mesh; mesh.bind handles that.
  return mesh;
}
