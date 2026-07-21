export type Point = { x: number; y: number };

export type FloorplanWall = {
  id: string;
  name: string;
  start: Point;
  end: Point;
  thicknessMetres: number;
  createdAt: string;
};

export type FloorplanConfiguration = {
  widthMetres: number;
  heightMetres: number;
  gridSizeMetres: number;
  showGrid: boolean;
  snapToGrid: boolean;
};

const coordinatePrecision = 1000;

export function roundMetres(value: number) {
  return Math.round(value * coordinatePrecision) / coordinatePrecision;
}

export function wallLength(wall: Pick<FloorplanWall, "start" | "end">) {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
}

export function wallAngleDegrees(wall: Pick<FloorplanWall, "start" | "end">) {
  const degrees = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x) * 180 / Math.PI;
  return roundMetres((degrees + 360) % 360);
}

export function clampPoint(point: Point, configuration: Pick<FloorplanConfiguration, "widthMetres" | "heightMetres">): Point {
  return {
    x: roundMetres(Math.min(configuration.widthMetres, Math.max(0, point.x))),
    y: roundMetres(Math.min(configuration.heightMetres, Math.max(0, point.y))),
  };
}

export function snapPoint(
  point: Point,
  walls: FloorplanWall[],
  configuration: FloorplanConfiguration,
  endpointThresholdMetres: number,
  excludedWallId?: string,
): Point {
  let candidate = clampPoint(point, configuration);
  let nearest: Point | null = null;
  let nearestDistance = endpointThresholdMetres;
  for (const wall of walls) {
    if (wall.id === excludedWallId) continue;
    for (const endpoint of [wall.start, wall.end]) {
      const distance = Math.hypot(candidate.x - endpoint.x, candidate.y - endpoint.y);
      if (distance <= nearestDistance) {
        nearest = endpoint;
        nearestDistance = distance;
      }
    }
  }
  if (nearest) return { ...nearest };
  if (configuration.snapToGrid) {
    candidate = {
      x: roundMetres(Math.round(candidate.x / configuration.gridSizeMetres) * configuration.gridSizeMetres),
      y: roundMetres(Math.round(candidate.y / configuration.gridSizeMetres) * configuration.gridSizeMetres),
    };
  }
  return clampPoint(candidate, configuration);
}

export function wallRectanglePoints(wall: Pick<FloorplanWall, "start" | "end" | "thicknessMetres">): Point[] {
  const length = wallLength(wall);
  if (!length) return [wall.start, wall.start, wall.end, wall.end];
  const perpendicularX = -(wall.end.y - wall.start.y) / length * wall.thicknessMetres / 2;
  const perpendicularY = (wall.end.x - wall.start.x) / length * wall.thicknessMetres / 2;
  return [
    { x: wall.start.x + perpendicularX, y: wall.start.y + perpendicularY },
    { x: wall.end.x + perpendicularX, y: wall.end.y + perpendicularY },
    { x: wall.end.x - perpendicularX, y: wall.end.y - perpendicularY },
    { x: wall.start.x - perpendicularX, y: wall.start.y - perpendicularY },
  ];
}

export function rotateWall(wall: FloorplanWall, degrees: number): FloorplanWall {
  const midpoint = { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 };
  const radians = degrees * Math.PI / 180;
  const halfLength = wallLength(wall) / 2;
  const offset = { x: Math.cos(radians) * halfLength, y: Math.sin(radians) * halfLength };
  return {
    ...wall,
    start: { x: roundMetres(midpoint.x - offset.x), y: roundMetres(midpoint.y - offset.y) },
    end: { x: roundMetres(midpoint.x + offset.x), y: roundMetres(midpoint.y + offset.y) },
  };
}

export function resizeWall(wall: FloorplanWall, lengthMetres: number): FloorplanWall {
  const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
  return {
    ...wall,
    end: {
      x: roundMetres(wall.start.x + Math.cos(angle) * lengthMetres),
      y: roundMetres(wall.start.y + Math.sin(angle) * lengthMetres),
    },
  };
}

export function serializeWall(wall: FloorplanWall) {
  return {
    id: wall.id,
    name: wall.name,
    startXMetres: roundMetres(wall.start.x),
    startYMetres: roundMetres(wall.start.y),
    endXMetres: roundMetres(wall.end.x),
    endYMetres: roundMetres(wall.end.y),
    thicknessMetres: roundMetres(wall.thicknessMetres),
    createdAt: wall.createdAt,
  };
}
