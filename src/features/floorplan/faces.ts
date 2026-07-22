import type { SurfaceKind, SurfaceVertex, WallProfile } from "@/features/digital-twin/geometry";

export type ClimbingFace = {
  id: string;
  structureId: string;
  name: string;
  widthMetres: number;
  heightMetres: number;
  climbingAngleDegrees: number;
  notes: string;
  sortOrder: number;
  createdAt: string;
  routeCount: number;
  surfaceKind: SurfaceKind;
  profile: WallProfile;
  facingDirection: -1 | 1;
  localOffset: { x: number; y: number; z: number };
  materialColour: string;
  vertices: SurfaceVertex[];
};

export function normalizeFaceOrder(faces: ClimbingFace[]) {
  return faces.map((face, index) => ({ ...face, sortOrder: index }));
}

export function moveFace(faces: ClimbingFace[], faceId: string, direction: -1 | 1) {
  const current = faces.findIndex(({ id }) => id === faceId);
  const destination = current + direction;
  if (current < 0 || destination < 0 || destination >= faces.length) return faces;
  const next = [...faces];
  [next[current], next[destination]] = [next[destination], next[current]];
  return normalizeFaceOrder(next);
}

export function faceInclineLabel(angle: number) {
  if (angle < -2) return "Slab";
  if (angle <= 2) return "Vertical";
  if (angle < 80) return "Overhang";
  if (angle <= 100) return "Roof";
  return "Beyond roof";
}

export function serializeFace(face: ClimbingFace) {
  return {
    id: face.id,
    name: face.name,
    widthMetres: face.widthMetres,
    heightMetres: face.heightMetres,
    climbingAngleDegrees: face.climbingAngleDegrees,
    notes: face.notes,
    sortOrder: face.sortOrder,
    surfaceKind: face.surfaceKind,
    profile: face.profile,
    facingDirection: face.facingDirection,
    localOffsetU: face.localOffset.x,
    localOffsetV: face.localOffset.y,
    localOffsetDepth: face.localOffset.z,
    materialColour: face.materialColour,
    vertices: face.vertices.map((vertex, order) => ({ ...vertex, order, connectionKey: null })),
  };
}
