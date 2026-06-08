import { Object3D, type Bone, type SkinnedMesh } from 'three';

/**
 * Bone-name utilities for the Ready Player Me skeleton.
 * The RPM GLB exports bones with plain names (Hips, Spine, Spine1, ...) but
 * we still want a single source of truth in case a future RPM asset uses the
 * mixamorig prefix.
 */

export type RpmBoneName =
  | 'Hips'
  | 'Spine'
  | 'Spine1'
  | 'Spine2'
  | 'Neck'
  | 'Head'
  | 'LeftShoulder'
  | 'LeftArm'
  | 'LeftForeArm'
  | 'LeftHand'
  | 'RightShoulder'
  | 'RightArm'
  | 'RightForeArm'
  | 'RightHand'
  | 'LeftUpLeg'
  | 'LeftLeg'
  | 'LeftFoot'
  | 'LeftToeBase'
  | 'RightUpLeg'
  | 'RightLeg'
  | 'RightFoot'
  | 'RightToeBase';

const RPM_PREFIX_CANDIDATES = ['', 'mixamorig', 'mixamorig1', 'Armature|'] as const;

/**
 * Walks the object tree collecting bones keyed by *resolved* name.
 * If multiple candidates exist, the first match wins (plain name first).
 */
export function collectBones(root: Object3D): Map<string, Bone> {
  const found = new Map<string, Bone>();
  root.traverse((object) => {
    if (!object || !(object as Bone).isBone) return;
    const raw = object.name as string;
    if (!raw) return;
    for (const prefix of RPM_PREFIX_CANDIDATES) {
      const stripped = prefix ? stripPrefix(raw, prefix) : raw;
      if (stripped !== raw) {
        if (!found.has(stripped)) found.set(stripped, object as Bone);
        return;
      }
    }
    if (!found.has(raw)) found.set(raw, object as Bone);
  });
  return found;
}

function stripPrefix(name: string, prefix: string): string {
  if (name.startsWith(prefix)) return name.slice(prefix.length);
  return name;
}

export type KitSide = 'Left' | 'Right';

export function armBones(side: KitSide) {
  return {
    shoulder: `${side}Shoulder` as RpmBoneName,
    arm: `${side}Arm` as RpmBoneName,
    foreArm: `${side}ForeArm` as RpmBoneName,
  };
}

export function legBones(side: KitSide) {
  return {
    upLeg: `${side}UpLeg` as RpmBoneName,
    leg: `${side}Leg` as RpmBoneName,
    foot: `${side}Foot` as RpmBoneName,
    toe: `${side}ToeBase` as RpmBoneName,
  };
}

export function warnMissingBones(
  found: Map<string, Bone>,
  required: string[],
  context: string,
): void {
  if (typeof window === 'undefined') return;
  const missing = required.filter((name) => !found.has(name));
  if (missing.length > 0) {
    console.warn(`[kit] ${context} is missing bones:`, missing);
  }
}

/**
 * Disposes of the skinned mesh's geometry + material(s) so we don't leak
 * GPU resources when the kit prop changes.
 */
export function disposeSkinned(mesh: SkinnedMesh): void {
  mesh.geometry.dispose();
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => m.dispose());
  } else {
    mesh.material.dispose();
  }
}
