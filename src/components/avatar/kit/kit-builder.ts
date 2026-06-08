import { Group, Mesh, Object3D, type SkinnedMesh } from 'three';
import { armBones, collectBones, disposeSkinned, legBones } from './kit-bones';
import {
  STUDDED_BOOT_STUD_POSITIONS,
  buildBootTongue,
  buildBootUpper,
  buildShirtCollar,
  buildShortsWaistband,
  buildSockCuff,
  buildSoleplate,
  buildStuds,
  buildSleeveCuff,
  makeKitMaterial,
} from './kit-shapes';
import { buildBodyKit, disposeBodyKit, type RegionMesh } from './kit-body-wrap';
import { makeSkinnedPart, type SkinSpec } from './kit-skinner';

export type CountryKit = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  shorts: string;
  socks: string;
  boot: string;
  sole: string;
};

export type KitPart =
  | { kind: 'body-wrap'; regionMeshes: RegionMesh[] }
  | { kind: 'skinned'; mesh: SkinnedMesh; debugLabel: string }
  | { kind: 'static'; mesh: Mesh; parentName: string; debugLabel: string };

/**
 * Builds the full body-conforming kit for one country.
 *
 * Shirt, shorts, and socks are derived from the avatar's actual body mesh
 * (cloned + pushed outward along normals + region-split by bone influence).
 * Boots are procedural (they need actual 3D volume, not a skin-thin layer).
 */
export function buildKit(avatar: Object3D, kit: CountryKit): { group: Group; parts: KitPart[] } {
  const group = new Group();
  group.name = `kit-${kit.id}`;
  const parts: KitPart[] = [];
  const bones = collectBones(avatar);

  // ---- Body-conforming wrap: shirt, shorts, socks ----
  const bodyMaterials = {
    shirt: makeKitMaterial(kit.primary, { roughness: 0.6 }),
    shorts: makeKitMaterial(kit.shorts, { roughness: 0.62 }),
    socks: makeKitMaterial(kit.socks, { roughness: 0.55 }),
    boots: makeKitMaterial(kit.boot, { roughness: 0.42, metalness: 0.08 }),
  };
  const regionMeshes = buildBodyKit(avatar, 0.008, bodyMaterials);
  for (const { mesh } of regionMeshes) {
    group.add(mesh);
  }
  parts.push({ kind: 'body-wrap', regionMeshes });

  // ---- Collar: thin torus around the neck opening ----
  const collarMat = makeKitMaterial(kit.secondary, { roughness: 0.5 });
  const collarSpec: SkinSpec = {
    yMin: 0,
    yMax: 1,
    segments: [{ bone: 'Neck', from: 0, to: 1, weight: 1 }],
  };
  const collar = makeSkinnedPart(buildShirtCollar(), collarSpec, avatar, collarMat, `${kit.id}-collar`);
  group.add(collar);
  parts.push({ kind: 'skinned', mesh: collar, debugLabel: collar.name });

  // ---- Waistband ----
  const wbMat = makeKitMaterial(kit.secondary, { roughness: 0.5 });
  const wbSpec: SkinSpec = {
    yMin: 0,
    yMax: 1,
    segments: [{ bone: 'Hips', from: 0, to: 1, weight: 1 }],
  };
  const wb = makeSkinnedPart(buildShortsWaistband(), wbSpec, avatar, wbMat, `${kit.id}-waistband`);
  group.add(wb);
  parts.push({ kind: 'skinned', mesh: wb, debugLabel: wb.name });

  // ---- Sleeve cuffs (per arm) ----
  for (const side of ['Left', 'Right'] as const) {
    const arm = armBones(side);
    const cuffMat = makeKitMaterial(kit.secondary, { roughness: 0.5 });
    const cuffSpec: SkinSpec = {
      yMin: 0,
      yMax: 1,
      segments: [{ bone: arm.arm, from: 0.7, to: 1, weight: 1 }],
    };
    const cuff = makeSkinnedPart(buildSleeveCuff(), cuffSpec, avatar, cuffMat, `${kit.id}-cuff-${side}`);
    const shoulderBone = bones.get(arm.shoulder);
    if (shoulderBone) {
      shoulderBone.add(cuff);
      cuff.position.set(side === 'Left' ? 0.04 : -0.04, 0, 0);
    } else {
      group.add(cuff);
    }
    parts.push({ kind: 'skinned', mesh: cuff, debugLabel: cuff.name });
  }

  // ---- Sock cuffs (per leg) ----
  for (const side of ['Left', 'Right'] as const) {
    const leg = legBones(side);
    const cuffMat = makeKitMaterial(kit.secondary, { roughness: 0.5 });
    const cuffSpec: SkinSpec = {
      yMin: 0,
      yMax: 1,
      segments: [{ bone: leg.leg, from: 0, to: 0.15, weight: 1 }],
    };
    const cuff = makeSkinnedPart(buildSockCuff(), cuffSpec, avatar, cuffMat, `${kit.id}-sock-cuff-${side}`);
    const legBone = bones.get(leg.leg);
    if (legBone) {
      legBone.add(cuff);
    } else {
      group.add(cuff);
    }
    parts.push({ kind: 'skinned', mesh: cuff, debugLabel: cuff.name });
  }

  // ---- Procedural boots (per foot) ----
  for (const side of ['Left', 'Right'] as const) {
    const leg = legBones(side);
    const footBone = bones.get(leg.foot);

    const upperMat = makeKitMaterial(kit.boot, { roughness: 0.42, metalness: 0.08 });
    const upperGeo = buildBootUpper();
    const upperSpec: SkinSpec = {
      yMin: -0.34,
      yMax: 0,
      segments: [{ bone: leg.foot, from: 0, to: 1, weight: 1 }],
    };
    const upper = makeSkinnedPart(upperGeo, upperSpec, avatar, upperMat, `${kit.id}-boot-upper-${side}`);
    if (footBone) {
      footBone.add(upper);
    } else {
      group.add(upper);
    }
    parts.push({ kind: 'skinned', mesh: upper, debugLabel: upper.name });

    // Soleplate
    const soleMat = makeKitMaterial(kit.sole, { roughness: 0.78, metalness: 0.02 });
    const soleGeo = buildSoleplate();
    const soleSpec: SkinSpec = {
      yMin: -0.36,
      yMax: -0.33,
      segments: [{ bone: leg.foot, from: 0, to: 1, weight: 1 }],
    };
    const sole = makeSkinnedPart(soleGeo, soleSpec, avatar, soleMat, `${kit.id}-sole-${side}`);
    if (footBone) {
      footBone.add(sole);
    } else {
      group.add(sole);
    }
    parts.push({ kind: 'skinned', mesh: sole, debugLabel: sole.name });

    // Studs
    const studGeo = buildStuds();
    const studMat = makeKitMaterial(kit.sole, { roughness: 0.6, metalness: 0.2 });
    for (const [x, y, z] of STUDDED_BOOT_STUD_POSITIONS) {
      const stud = new Mesh(studGeo, studMat);
      stud.position.set(side === 'Left' ? x : -x, y, z);
      if (footBone) {
        footBone.add(stud);
      } else {
        group.add(stud);
      }
      parts.push({ kind: 'static', mesh: stud, parentName: footBone?.name ?? 'group', debugLabel: `${kit.id}-stud-${side}` });
    }

    // Tongue
    const tongueMat = makeKitMaterial(kit.boot, { roughness: 0.45, metalness: 0.06 });
    const tongueGeo = buildBootTongue();
    const tongueSpec: SkinSpec = {
      yMin: 0,
      yMax: 1,
      segments: [{ bone: leg.foot, from: 0, to: 1, weight: 1 }],
    };
    const tongue = makeSkinnedPart(tongueGeo, tongueSpec, avatar, tongueMat, `${kit.id}-tongue-${side}`);
    if (footBone) {
      footBone.add(tongue);
    } else {
      group.add(tongue);
    }
    parts.push({ kind: 'skinned', mesh: tongue, debugLabel: tongue.name });
  }

  return { group, parts };
}

/**
 * Disposes all kit parts.
 */
export function disposeKit(parts: KitPart[]): void {
  for (const part of parts) {
    if (part.kind === 'body-wrap') {
      disposeBodyKit(part.regionMeshes);
    } else if (part.kind === 'skinned') {
      disposeSkinned(part.mesh);
    } else {
      part.mesh.geometry.dispose();
      if (Array.isArray(part.mesh.material)) {
        part.mesh.material.forEach((m) => m.dispose());
      } else {
        part.mesh.material.dispose();
      }
    }
  }
}
