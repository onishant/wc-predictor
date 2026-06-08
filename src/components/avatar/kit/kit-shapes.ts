import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  LatheGeometry,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  type BufferGeometry,
} from 'three';

/**
 * Procedural football kit shapes for the Ready Player Me skeleton.
 *
 * The goal is a "kit that obviously reads as a kit" — not a flat tube.
 * Each part is a real shape (lathe / extruded profile / box-with-rounding)
 * that we then skin to the RPM bones in kit-skinner.ts.
 *
 * All shapes are returned in the part's local frame with +Y up, and the
 * geometry is *not* yet skinned or weight-painted — that's the skinners
 * job. Origin conventions:
 *
 *   - Shirt:    y=0 = waist (Hips bone), y=H = shoulder/neck base
 *   - Shorts:   y=0 = waist,         y=H = mid-thigh
 *   - Sock:     y=0 = knee,          y=-H = ankle
 *   - Boot:     y=0 = heel cup top,  y=-H = soleplate
 *
 * We intentionally do not rotate the geometries here; the skinners align
 * them to bones and the bones define the rest pose.
 */

export type ShirtProfile = {
  // Vertical extent
  waistRadius: number;
  chestRadius: number;
  shoulderRadius: number;
  neckRadius: number;
  // Verts
  heightSegments: number;
  radialSegments: number;
};

const DEFAULT_SHIRT: ShirtProfile = {
  waistRadius: 0.205,
  chestRadius: 0.255,
  shoulderRadius: 0.275,
  neckRadius: 0.075,
  heightSegments: 64,
  radialSegments: 40,
};

/**
 * Shirt body: torso-shaped lathe profile from waist to neck, then a separate
 * ring to act as the crew-neck collar opening.
 */
export function buildShirtBody(profile: ShirtProfile = DEFAULT_SHIRT): BufferGeometry {
  const { waistRadius, chestRadius, shoulderRadius, neckRadius, radialSegments } = profile;

  // Lathe profile points. y goes from 0 (waist) to 1 (shoulder). Add neck taper at the very top.
  const points: Array<{ x: number; y: number }> = [
    { x: waistRadius, y: 0 },
    { x: waistRadius * 1.04, y: 0.08 },
    { x: chestRadius * 0.96, y: 0.32 },
    { x: chestRadius, y: 0.48 },
    { x: chestRadius * 1.02, y: 0.62 },
    { x: shoulderRadius, y: 0.86 },
    { x: shoulderRadius * 0.94, y: 0.96 },
    { x: neckRadius * 2.2, y: 1.0 },
  ];
  const lathePoints = points.map((p) => new Vector2(p.x, p.y));

  const body = new LatheGeometry(lathePoints, radialSegments, 0, Math.PI * 2).toNonIndexed();
  // Lathe gives us a y in [0, 1]. Stretch to 0.95 (shirt height) along Y.
  body.scale(1, 0.95, 1);
  body.computeVertexNormals();
  return body;
}

/**
 * Crew-neck collar: small ring sitting on top of the shirt body.
 */
export function buildShirtCollar(profile: ShirtProfile = DEFAULT_SHIRT): BufferGeometry {
  const ring = new TorusGeometry(profile.neckRadius * 2.4, 0.018, 12, 36);
  ring.rotateX(Math.PI / 2);
  // Sit it just above the neck opening
  ring.translate(0, 0.965, 0);
  return ring;
}

/**
 * Short sleeve: tapered cylinder from shoulder to mid-bicep.
 * Origin: y=0 = shoulder seam, y=1 = sleeve hem.
 * Local X aligned along the bone's sideways axis — caller rotates into bone.
 */
export function buildSleeve(): BufferGeometry {
  const sleeve = new CylinderGeometry(0.115, 0.135, 0.34, 24, 8, true);
  sleeve.translate(0, 0.17, 0);
  sleeve.scale(1, 1, 1);
  return sleeve;
}

/**
 * Sleeve cuff: thin ring at the bottom of the sleeve.
 */
export function buildSleeveCuff(): BufferGeometry {
  const cuff = new TorusGeometry(0.122, 0.012, 8, 28);
  cuff.rotateX(Math.PI / 2);
  cuff.translate(0, 0.32, 0);
  return cuff;
}

/**
 * Shorts body: torso-thigh lathe profile, looser than the shirt, ending at mid-thigh.
 * y=0 = waist, y=1 = hem.
 */
export function buildShortsBody(): BufferGeometry {
  const points = [
    { x: 0.215, y: 0 },
    { x: 0.235, y: 0.12 },
    { x: 0.245, y: 0.32 },
    { x: 0.235, y: 0.55 },
    { x: 0.205, y: 0.8 },
    { x: 0.18, y: 1.0 },
  ];
  const shortsLathe = points.map((p) => new Vector2(p.x, p.y));
  const shorts = new LatheGeometry(shortsLathe, 40, 0, Math.PI * 2).toNonIndexed();
  shorts.scale(1, 0.55, 1);
  shorts.computeVertexNormals();
  return shorts;
}

/**
 * Shorts waistband: ring at the very top.
 */
export function buildShortsWaistband(): BufferGeometry {
  const wb = new TorusGeometry(0.225, 0.018, 10, 36);
  wb.rotateX(Math.PI / 2);
  wb.translate(0, 0.005, 0);
  return wb;
}

/**
 * Sock body: tapered cylinder from knee (y=0) to ankle (y=-1).
 * Aligned so y=0 attaches to the upper end of the bone.
 */
export function buildSockBody(): BufferGeometry {
  // Slightly bulged at the calf, tapered at the ankle.
  const sock = new CylinderGeometry(0.078, 0.092, 0.5, 20, 12, true);
  sock.translate(0, -0.25, 0);
  return sock;
}

/**
 * Sock cuff ring: thicker torus at the top of the sock (ribbed look).
 */
export function buildSockCuff(): BufferGeometry {
  const cuff = new TorusGeometry(0.094, 0.012, 10, 28);
  cuff.rotateX(Math.PI / 2);
  cuff.translate(0, -0.02, 0);
  return cuff;
}

/**
 * Football boot upper: a rounded box (foot-shaped) attached to the foot bone.
 * The foot bone in the RPM rig points along +X in its rest pose, so the boot
 * is built extending along +X. y=0 = heel cup top, y=-1 = sole plate.
 *
 * Local axes after buildBoot():
 *   +X = toe direction
 *   -X = heel direction
 *   +Y = top of boot (where the foot enters)
 *   -Y = sole (against the ground)
 */
export function buildBootUpper(): BufferGeometry {
  // A combination of a sphere (heel cup) and a stretched ellipsoid (toe box).
  // Use a lathe profile in the XY plane, rotated 360 around X.
  const profile: Array<{ x: number; y: number }> = [
    { x: 0.0, y: 0.0 }, // top-center (where the ankle enters)
    { x: 0.06, y: -0.02 },
    { x: 0.1, y: -0.06 },
    { x: 0.12, y: -0.1 },
    { x: 0.13, y: -0.16 },
    { x: 0.14, y: -0.22 },
    { x: 0.14, y: -0.28 },
    { x: 0.13, y: -0.32 },
    { x: 0.0, y: -0.34 }, // bottom-centerline (along sole)
    { x: -0.12, y: -0.32 },
    { x: -0.13, y: -0.22 },
    { x: -0.12, y: -0.1 },
    { x: -0.08, y: -0.02 },
    { x: 0.0, y: 0.0 },
  ];
  const bootLathe = profile.map((p) => new Vector2(p.x, p.y));
  const boot = new LatheGeometry(bootLathe, 32).toNonIndexed();
  boot.rotateZ(Math.PI / 2); // align long axis with +X
  boot.translate(0, 0, 0);
  boot.computeVertexNormals();
  return boot;
}

/**
 * Soleplate: thin flat box under the boot.
 */
export function buildSoleplate(): BufferGeometry {
  const sole = new BoxGeometry(0.32, 0.025, 0.18);
  sole.translate(0, -0.345, 0);
  return sole;
}

/**
 * Studs: small cylinders poking out of the soleplate.
 * Six per boot: 2x at toe area, 2x midfoot, 2x heel.
 */
export function buildStuds(): BufferGeometry {
  const stud = new CylinderGeometry(0.018, 0.014, 0.04, 10, 1, false);
  stud.translate(0, -0.022, 0);
  // We return a *single* stud geometry; the caller instances the meshes
  // and positions them in the local frame.
  return stud;
}

/**
 * Boot tongue: small angled plane covering the laces area.
 */
export function buildBootTongue(): BufferGeometry {
  // Build a tongue as a small slanted box.
  const tongue = new BoxGeometry(0.16, 0.005, 0.13);
  // Slight forward tilt
  tongue.rotateX(-0.18);
  tongue.translate(0.02, -0.06, 0);
  return tongue;
}

/**
 * Helper: returns a fresh MeshStandardMaterial pre-configured for kit use.
 * The default material is opaque, double-sided, with realistic roughness.
 */
export function makeKitMaterial(
  color: string,
  options: { roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number } = {},
): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.55,
    metalness: options.metalness ?? 0.04,
    emissive: options.emissive ?? '#000000',
    emissiveIntensity: options.emissiveIntensity ?? 0,
    side: DoubleSide,
  });
}

export const STUDDED_BOOT_STUD_POSITIONS: Array<[number, number, number]> = [
  // [x, y, z]  (local boot frame)
  [0.11, -0.36, 0.06],
  [0.11, -0.36, -0.06],
  [0.0, -0.36, 0.075],
  [0.0, -0.36, -0.075],
  [-0.1, -0.36, 0.06],
  [-0.1, -0.36, -0.06],
];

// Re-export SphereGeometry so unused-imports don't trip the bundler.
export { SphereGeometry };
