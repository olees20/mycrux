import type { Point } from "@/features/floorplan/core";

export type Vec3 = { x: number; y: number; z: number };
export type SurfaceVertex = { u: number; v: number; depth: number };
export type SurfaceKind = "rectangle" | "triangle_left" | "triangle_right" | "quadrilateral" | "custom";
export type WallProfile = "vertical" | "slab" | "overhang" | "steep" | "roof" | "left_facet" | "right_facet" | "custom";

export type TwinStructureGeometry = {
  start: Point;
  end: Point;
  baseElevationMetres?: number;
};

export type TwinFaceGeometry = {
  widthMetres: number;
  heightMetres: number;
  angleDegrees: number;
  surfaceKind?: SurfaceKind;
  facingDirection?: -1 | 1;
  localOffset?: Vec3;
  vertices?: SurfaceVertex[];
};

export type WorldSurface = {
  vertices: Vec3[];
  triangleIndices: number[];
  centre: Vec3;
  normal: Vec3;
  tangent: Vec3;
  outward: Vec3;
};

export type Bounds3 = { min: Vec3; max: Vec3 };

const epsilon = 1e-7;
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale = (value: Vec3, factor: number): Vec3 => ({ x: value.x * factor, y: value.y * factor, z: value.z * factor });
const subtract = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const length = (value: Vec3) => Math.hypot(value.x, value.y, value.z);
const normalize = (value: Vec3): Vec3 => {
  const magnitude = length(value);
  return magnitude < epsilon ? { x: 0, y: 0, z: 1 } : scale(value, 1 / magnitude);
};

export function presetSurfaceVertices(face: TwinFaceGeometry): SurfaceVertex[] {
  const width = Math.max(0.1, face.widthMetres);
  const height = Math.max(0.1, face.heightMetres);
  switch (face.surfaceKind ?? "rectangle") {
    case "triangle_left": return [{ u: 0, v: 0, depth: 0 }, { u: width, v: 0, depth: 0 }, { u: 0, v: height, depth: 0 }];
    case "triangle_right": return [{ u: 0, v: 0, depth: 0 }, { u: width, v: 0, depth: 0 }, { u: width, v: height, depth: 0 }];
    case "quadrilateral": return [{ u: 0, v: 0, depth: 0 }, { u: width, v: 0, depth: 0 }, { u: width * 0.85, v: height, depth: 0 }, { u: width * 0.15, v: height, depth: 0 }];
    case "custom": return face.vertices && face.vertices.length >= 3 ? face.vertices : [{ u: 0, v: 0, depth: 0 }, { u: width, v: 0, depth: 0 }, { u: width, v: height, depth: 0 }, { u: 0, v: height, depth: 0 }];
    default: return [{ u: 0, v: 0, depth: 0 }, { u: width, v: 0, depth: 0 }, { u: width, v: height, depth: 0 }, { u: 0, v: height, depth: 0 }];
  }
}

function signedArea(vertices: SurfaceVertex[]) {
  return vertices.reduce((area, vertex, index) => {
    const next = vertices[(index + 1) % vertices.length];
    return area + vertex.u * next.v - next.u * vertex.v;
  }, 0) / 2;
}

function orientation(a: SurfaceVertex, b: SurfaceVertex, c: SurfaceVertex) {
  return (b.v - a.v) * (c.u - b.u) - (b.u - a.u) * (c.v - b.v);
}

function onSegment(a: SurfaceVertex, b: SurfaceVertex, c: SurfaceVertex) {
  return b.u <= Math.max(a.u, c.u) + epsilon && b.u + epsilon >= Math.min(a.u, c.u) && b.v <= Math.max(a.v, c.v) + epsilon && b.v + epsilon >= Math.min(a.v, c.v);
}

function segmentsIntersect(a: SurfaceVertex, b: SurfaceVertex, c: SurfaceVertex, d: SurfaceVertex) {
  const first = orientation(a, b, c);
  const second = orientation(a, b, d);
  const third = orientation(c, d, a);
  const fourth = orientation(c, d, b);
  if ((first > epsilon && second < -epsilon || first < -epsilon && second > epsilon) && (third > epsilon && fourth < -epsilon || third < -epsilon && fourth > epsilon)) return true;
  return Math.abs(first) <= epsilon && onSegment(a, c, b) || Math.abs(second) <= epsilon && onSegment(a, d, b) || Math.abs(third) <= epsilon && onSegment(c, a, d) || Math.abs(fourth) <= epsilon && onSegment(c, b, d);
}

export function validateSurfacePolygon(vertices: SurfaceVertex[]) {
  if (vertices.length < 3 || vertices.length > 32) return { valid: false, reason: "A surface needs between 3 and 32 vertices." } as const;
  if (vertices.some(({ u, v, depth }) => !Number.isFinite(u) || !Number.isFinite(v) || !Number.isFinite(depth))) return { valid: false, reason: "Every surface coordinate must be finite." } as const;
  if (Math.abs(signedArea(vertices)) < epsilon) return { valid: false, reason: "The surface vertices must enclose an area." } as const;
  for (let first = 0; first < vertices.length; first += 1) {
    const firstNext = (first + 1) % vertices.length;
    for (let second = first + 1; second < vertices.length; second += 1) {
      const secondNext = (second + 1) % vertices.length;
      if (first === second || firstNext === second || secondNext === first) continue;
      if (segmentsIntersect(vertices[first], vertices[firstNext], vertices[second], vertices[secondNext])) return { valid: false, reason: "Surface edges cannot cross." } as const;
    }
  }
  return { valid: true } as const;
}

function pointInTriangle(point: SurfaceVertex, a: SurfaceVertex, b: SurfaceVertex, c: SurfaceVertex) {
  const area = (first: SurfaceVertex, second: SurfaceVertex, third: SurfaceVertex) => (first.u * (second.v - third.v) + second.u * (third.v - first.v) + third.u * (first.v - second.v)) / 2;
  const total = Math.abs(area(a, b, c));
  return Math.abs(total - Math.abs(area(point, b, c)) - Math.abs(area(a, point, c)) - Math.abs(area(a, b, point))) < 1e-5;
}

export function triangulateSurface(vertices: SurfaceVertex[]) {
  if (!validateSurfacePolygon(vertices).valid) return [];
  const clockwise = signedArea(vertices) < 0;
  const remaining = vertices.map((_, index) => index);
  const triangles: number[] = [];
  let guard = vertices.length * vertices.length;
  while (remaining.length > 3 && guard-- > 0) {
    let clipped = false;
    for (let cursor = 0; cursor < remaining.length; cursor += 1) {
      const previous = remaining[(cursor - 1 + remaining.length) % remaining.length];
      const current = remaining[cursor];
      const next = remaining[(cursor + 1) % remaining.length];
      const turn = orientation(vertices[previous], vertices[current], vertices[next]);
      const convex = clockwise ? turn > epsilon : turn < -epsilon;
      if (!convex || remaining.some((candidate) => candidate !== previous && candidate !== current && candidate !== next && pointInTriangle(vertices[candidate], vertices[previous], vertices[current], vertices[next]))) continue;
      triangles.push(previous, current, next);
      remaining.splice(cursor, 1);
      clipped = true;
      break;
    }
    if (!clipped) return [];
  }
  if (remaining.length === 3) triangles.push(...remaining);
  return triangles;
}

export function surfaceDepthAt(face: TwinFaceGeometry, u: number, v: number) {
  const vertices=presetSurfaceVertices(face);
  const triangles=triangulateSurface(vertices);
  const point={u,v,depth:0};
  for(let index=0;index<triangles.length;index+=3){
    const a=vertices[triangles[index]],b=vertices[triangles[index+1]],c=vertices[triangles[index+2]];
    if(!pointInTriangle(point,a,b,c))continue;
    const denominator=(b.v-c.v)*(a.u-c.u)+(c.u-b.u)*(a.v-c.v);
    if(Math.abs(denominator)<epsilon)return a.depth;
    const first=((b.v-c.v)*(u-c.u)+(c.u-b.u)*(v-c.v))/denominator;
    const second=((c.v-a.v)*(u-c.u)+(a.u-c.u)*(v-c.v))/denominator;
    return first*a.depth+second*b.depth+(1-first-second)*c.depth;
  }
  return 0;
}

export function structureBasis(structure: TwinStructureGeometry, facingDirection: -1 | 1 = 1) {
  const deltaX = structure.end.x - structure.start.x;
  const deltaZ = structure.end.y - structure.start.y;
  const magnitude = Math.max(epsilon, Math.hypot(deltaX, deltaZ));
  const tangent = { x: deltaX / magnitude, y: 0, z: deltaZ / magnitude };
  const outward = { x: -tangent.z * facingDirection, y: 0, z: tangent.x * facingDirection };
  return { tangent, outward, up: { x: 0, y: 1, z: 0 } };
}

export function surfacePoint(structure: TwinStructureGeometry, face: TwinFaceGeometry, vertex: SurfaceVertex): Vec3 {
  const facing = face.facingDirection ?? 1;
  const { tangent, outward, up } = structureBasis(structure, facing);
  const angle = face.angleDegrees * Math.PI / 180;
  const offset = face.localOffset ?? { x: 0, y: 0, z: 0 };
  const origin = { x: structure.start.x, y: structure.baseElevationMetres ?? 0, z: structure.start.y };
  return add(origin, add(scale(tangent, offset.x + vertex.u), add(scale(up, offset.y + Math.cos(angle) * vertex.v), scale(outward, offset.z + Math.sin(angle) * vertex.v + vertex.depth))));
}

export function buildWorldSurface(structure: TwinStructureGeometry, face: TwinFaceGeometry): WorldSurface {
  const localVertices = presetSurfaceVertices(face);
  const triangleIndices = triangulateSurface(localVertices);
  const vertices = localVertices.map((vertex) => surfacePoint(structure, face, vertex));
  const centre = scale(vertices.reduce(add, { x: 0, y: 0, z: 0 }), 1 / vertices.length);
  const normal = triangleIndices.length >= 3 ? normalize(cross(subtract(vertices[triangleIndices[1]], vertices[triangleIndices[0]]), subtract(vertices[triangleIndices[2]], vertices[triangleIndices[0]]))) : structureBasis(structure, face.facingDirection).outward;
  const { tangent, outward } = structureBasis(structure, face.facingDirection);
  return { vertices, triangleIndices, centre, normal, tangent, outward };
}

export function boundsFromPoints(points: Vec3[]): Bounds3 {
  if (!points.length) return { min: { x: -5, y: 0, z: -5 }, max: { x: 5, y: 5, z: 5 } };
  return points.reduce<Bounds3>((bounds, point) => ({
    min: { x: Math.min(bounds.min.x, point.x), y: Math.min(bounds.min.y, point.y), z: Math.min(bounds.min.z, point.z) },
    max: { x: Math.max(bounds.max.x, point.x), y: Math.max(bounds.max.y, point.y), z: Math.max(bounds.max.z, point.z) },
  }), { min: { ...points[0] }, max: { ...points[0] } });
}

export function frameBounds(bounds: Bounds3, aspect = 1, fieldOfViewDegrees = 45) {
  const target = scale(add(bounds.min, bounds.max), 0.5);
  const size = subtract(bounds.max, bounds.min);
  const radius = Math.max(1, Math.hypot(size.x, size.y, size.z) / 2);
  const verticalDistance = radius / Math.tan(fieldOfViewDegrees * Math.PI / 360);
  const distance = verticalDistance * Math.max(1, 1 / Math.max(0.25, aspect)) * 1.25;
  return { target, distance, near: Math.max(0.01, distance / 1000), far: Math.max(100, distance * 20) };
}
