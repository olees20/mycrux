import type { Point } from "./core";

export type WallCanvasConfiguration = { gridSizeMetres: number; showGrid: boolean; snapToGrid: boolean };

const round = (value: number) => Math.round(value * 1000) / 1000;

export function clampCanvasPoint(point: Point, widthMetres: number, heightMetres: number): Point {
  return { x: round(Math.min(widthMetres, Math.max(0, point.x))), y: round(Math.min(heightMetres, Math.max(0, point.y))) };
}

export function snapCanvasPoint(point: Point, widthMetres: number, heightMetres: number, gridSizeMetres: number, enabled: boolean): Point {
  const clamped = clampCanvasPoint(point, widthMetres, heightMetres);
  if (!enabled) return clamped;
  return clampCanvasPoint({ x: Math.round(clamped.x / gridSizeMetres) * gridSizeMetres, y: Math.round(clamped.y / gridSizeMetres) * gridSizeMetres }, widthMetres, heightMetres);
}

export function metreRulerTicks(limit: number) {
  return Array.from({ length: Math.floor(limit) + 1 }, (_, value) => value);
}
