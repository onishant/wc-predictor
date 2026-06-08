import {
  BufferGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  SkinnedMesh,
  Uint16BufferAttribute,
  Vector3,
  type Object3D,
} from 'three';

/**
 * Body-conforming kit: clones the actual avatar mesh, pushes vertices
 * slightly outward along their normals, then splits by bone influence
 * to produce separate shirt/shorts/sock/boot meshes that perfectly
 * follow the body shape.
 */

export type BodyKitRegion = 'shirt' | 'shorts' | 'socks' | 'boots';

type RegionBone = {
  boneName: string;
  region: BodyKitRegion;
};

/**
 * Bones → regions. Vertices influenced primarily by these bones
 * get assigned to the corresponding kit region.
 */
const REGION_BONES: RegionBone[] = [
  // Shirt: spine chain + shoulders + arms
  { boneName: 'Hips', region: 'shirt' },
  { boneName: 'Spine', region: 'shirt' },
  { boneName: 'Spine1', region: 'shirt' },
  { boneName: 'Spine2', region: 'shirt' },
  { boneName: 'Neck', region: 'shirt' },
  { boneName: 'Head', region: 'shirt' },
  { boneName: 'LeftShoulder', region: 'shirt' },
  { boneName: 'LeftArm', region: 'shirt' },
  { boneName: 'LeftForeArm', region: 'shirt' },
  { boneName: 'LeftHand', region: 'shirt' },
  { boneName: 'RightShoulder', region: 'shirt' },
  { boneName: 'RightArm', region: 'shirt' },
  { boneName: 'RightForeArm', region: 'shirt' },
  { boneName: 'RightHand', region: 'shirt' },
  // Shorts: upper legs
  { boneName: 'LeftUpLeg', region: 'shorts' },
  { boneName: 'RightUpLeg', region: 'shorts' },
  // Socks: lower legs
  { boneName: 'LeftLeg', region: 'socks' },
  { boneName: 'RightLeg', region: 'socks' },
  // Boots: feet + toes
  { boneName: 'LeftFoot', region: 'boots' },
  { boneName: 'LeftToeBase', region: 'boots' },
  { boneName: 'LeftToe_End', region: 'boots' },
  { boneName: 'RightFoot', region: 'boots' },
  { boneName: 'RightToeBase', region: 'boots' },
  { boneName: 'RightToe_End', region: 'boots' },
];

export type RegionMesh = {
  region: BodyKitRegion;
  mesh: SkinnedMesh;
};

/**
 * Clones the avatar's SkinnedMesh, pushes vertices outward along normals,
 * and splits into body-conforming kit regions.
 *
 * @param avatar The avatar Object3D (root of the RPM scene)
 * @param offset How far to push vertices outward (world units). 0.006–0.012 is typical.
 * @param materials Record of region → MeshStandardMaterial
 */
export function buildBodyKit(
  avatar: Object3D,
  offset: number,
  materials: Record<BodyKitRegion, MeshStandardMaterial>,
): RegionMesh[] {
  // Find the main body mesh.
  let sourceMesh: SkinnedMesh | null = null;
  avatar.traverse((child) => {
    if ((child as SkinnedMesh).isSkinnedMesh && !sourceMesh) {
      sourceMesh = child as SkinnedMesh;
    }
  });

  if (!sourceMesh || !(sourceMesh as SkinnedMesh).geometry.attributes.position) {
    console.warn('[body-kit] No SkinnedMesh found in avatar');
    return [];
  }

  const srcGeo = (sourceMesh as SkinnedMesh).geometry;
  const srcPositions = srcGeo.attributes.position as Float32BufferAttribute;
  const srcNormals = srcGeo.attributes.normal as Float32BufferAttribute;
  const srcSkinIndex = srcGeo.attributes.skinIndex as Float32BufferAttribute;
  const srcSkinWeight = srcGeo.attributes.skinWeight as Float32BufferAttribute;
  const vertexCount = srcPositions.count;

  // Build bone-name lookup for the avatar's skeleton.
  const skeletonBones = (sourceMesh as SkinnedMesh).skeleton.bones;
  const boneNameToIndex = new Map<string, number>();
  skeletonBones.forEach((bone, index) => {
    boneNameToIndex.set(bone.name, index);
  });

  // For each vertex, determine which region it belongs to based on
  // the bone with the highest skin weight.
  const vertexRegions: BodyKitRegion[] = new Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    let bestRegion: BodyKitRegion = 'shirt'; // fallback
    let bestWeight = -1;
    for (let k = 0; k < 4; k++) {
      const boneIndex = srcSkinIndex.getX(i * 4 + k) ?? srcSkinIndex.array[i * 4 + k];
      const weight = srcSkinWeight.getX(i * 4 + k) ?? srcSkinWeight.array[i * 4 + k];
      if (weight <= bestWeight) continue;
      const boneName = skeletonBones[boneIndex]?.name;
      if (!boneName) continue;
      const regionEntry = REGION_BONES.find((r) => r.boneName === boneName);
      if (regionEntry) {
        bestRegion = regionEntry.region;
        bestWeight = weight;
      }
    }
    vertexRegions[i] = bestRegion;
  }

  // Split vertices by region.
  const regionVertices: Record<BodyKitRegion, number[]> = {
    shirt: [],
    shorts: [],
    socks: [],
    boots: [],
  };
  // Map old vertex index → new vertex index per region.
  const regionNewIndex: Record<BodyKitRegion, Map<number, number>> = {
    shirt: new Map(),
    shorts: new Map(),
    socks: new Map(),
    boots: new Map(),
  };

  // Walk the source index buffer (or non-indexed positions) to build
  // per-region triangle lists.
  const srcIndex = srcGeo.index;
  const triangleCount = srcIndex ? srcIndex.count / 3 : vertexCount / 3;

  // Collect unique vertices per region and build index maps.
  const addVertex = (region: BodyKitRegion, oldIndex: number) => {
    if (!regionNewIndex[region].has(oldIndex)) {
      regionNewIndex[region].set(oldIndex, regionVertices[region].length / 1); // just track order
      regionVertices[region].push(oldIndex);
    }
  };

  // Collect triangles per region.
  const regionTriangles: Record<BodyKitRegion, number[]> = {
    shirt: [],
    shorts: [],
    socks: [],
    boots: [],
  };

  for (let t = 0; t < triangleCount; t++) {
    const i0 = srcIndex ? srcIndex.getX(t * 3) : t * 3;
    const i1 = srcIndex ? srcIndex.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = srcIndex ? srcIndex.getX(t * 3 + 2) : t * 3 + 2;

    // Majority vote: which region do most of this triangle's verts belong to?
    const votes = [vertexRegions[i0], vertexRegions[i1], vertexRegions[i2]];
    const region = majorityVote(votes);

    addVertex(region, i0);
    addVertex(region, i1);
    addVertex(region, i2);

    const n0 = regionNewIndex[region].get(i0)!;
    const n1 = regionNewIndex[region].get(i1)!;
    const n2 = regionNewIndex[region].get(i2)!;
    regionTriangles[region].push(n0, n1, n2);
  }

  // Build the output meshes.
  const results: RegionMesh[] = [];

  for (const region of ['shirt', 'shorts', 'socks', 'boots'] as BodyKitRegion[]) {
    const oldIndices = regionVertices[region];
    if (oldIndices.length === 0) continue;

    const newVertCount = oldIndices.length;
    const newPos = new Float32Array(newVertCount * 3);
    const newNormal = new Float32Array(newVertCount * 3);
    const newSkinIndex = new Uint16Array(newVertCount * 4);
    const newSkinWeight = new Float32Array(newVertCount * 4);

    const normal = new Vector3();

    for (let n = 0; n < newVertCount; n++) {
      const old = oldIndices[n];
      // Position: push outward along normal by `offset`
      const px = srcPositions.getX(old);
      const py = srcPositions.getY(old);
      const pz = srcPositions.getZ(old);
      const nx = srcNormals.getX(old);
      const ny = srcNormals.getY(old);
      const nz = srcNormals.getZ(old);
      normal.set(nx, ny, nz).normalize();

      newPos[n * 3] = px + normal.x * offset;
      newPos[n * 3 + 1] = py + normal.y * offset;
      newPos[n * 3 + 2] = pz + normal.z * offset;

      // Copy normals
      newNormal[n * 3] = nx;
      newNormal[n * 3 + 1] = ny;
      newNormal[n * 3 + 2] = nz;

      // Copy skin indices & weights
      for (let k = 0; k < 4; k++) {
        newSkinIndex[n * 4 + k] = srcSkinIndex.array[old * 4 + k];
        newSkinWeight[n * 4 + k] = srcSkinWeight.array[old * 4 + k];
      }
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(newPos, 3));
    geo.setAttribute('normal', new Float32BufferAttribute(newNormal, 3));
    geo.setAttribute('skinIndex', new Uint16BufferAttribute(newSkinIndex, 4));
    geo.setAttribute('skinWeight', new Float32BufferAttribute(newSkinWeight, 4));

    // Build index buffer.
    const triIndices = regionTriangles[region];
    geo.setIndex(triIndices);

    // Build skeleton from the same bones (shared skeleton reference).
    const mesh = new SkinnedMesh(geo, materials[region]);
    mesh.name = `body-kit-${region}`;
    mesh.bind((sourceMesh as SkinnedMesh).skeleton);
    // Sync bind matrix
    mesh.bindMatrix.copy((sourceMesh as SkinnedMesh).bindMatrix);
    mesh.bindMatrixInverse.copy((sourceMesh as SkinnedMesh).bindMatrixInverse);

    results.push({ region, mesh });
  }

  return results;
}

function majorityVote(votes: BodyKitRegion[]): BodyKitRegion {
  const counts = new Map<BodyKitRegion, number>();
  for (const v of votes) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: BodyKitRegion = votes[0];
  let bestCount = 0;
  for (const [region, count] of counts) {
    if (count > bestCount) {
      best = region;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Disposes all body kit region meshes.
 */
export function disposeBodyKit(regions: RegionMesh[]): void {
  for (const { mesh } of regions) {
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => m.dispose());
    } else {
      mesh.material.dispose();
    }
  }
}
