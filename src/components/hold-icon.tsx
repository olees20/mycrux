import type { HoldCategory } from "@/features/floorplan/holds";

export function HoldGlyph({ category }: { category: HoldCategory }) {
  const common = { fill: "currentColor", stroke: "currentColor", strokeWidth: 0.06, strokeLinejoin: "round" as const, vectorEffect: "non-scaling-stroke" as const };
  switch (category) {
    case "jug": return <path {...common} d="M-.48-.12 Q-.4-.46 0-.48 Q.4-.46.48-.12 L.34.42 L.12.22 Q0 .12-.12.22 L-.34.42Z"/>;
    case "crimp": return <path {...common} d="M-.48-.2 L.44-.32 L.5.12 L.28.3 L-.4.26Z"/>;
    case "sloper": return <path {...common} d="M-.5.18 Q-.46-.4-.02-.48 Q.42-.42.5.06 Q.42.44-.08.48 Q-.44.42-.5.18Z"/>;
    case "pinch": return <path {...common} d="M-.34-.5 L.34-.5 L.2-.12 L.38.5 L-.38.5 L-.2-.12Z"/>;
    case "pocket": return <path {...common} d="M-.48 0 Q-.44-.45 0-.5 Q.44-.45.48 0 Q.44.45 0 .5 Q-.44.45-.48 0ZM-.2 0 Q-.18.2 0 .22 Q.18.2.2 0 Q.18-.2 0-.22 Q-.18-.2-.2 0Z" fillRule="evenodd"/>;
    case "edge": return <path {...common} d="M-.5-.28 L.5-.4 L.38.3 L-.44.42Z"/>;
    case "volume": return <path {...common} d="M0-.52 L.52.44 L-.52.44Z"/>;
    case "macro": return <path {...common} d="M-.46-.24 L-.12-.52 L.42-.34 L.52.2 L.08.5 L-.5.3Z"/>;
    case "dual_texture": return <g><path {...common} d="M-.48-.34 L0-.5 L0 .46 L-.4.28Z"/><path {...common} d="M0-.5 L.48-.2 L.38.38 L0 .46Z" fill="none" strokeWidth={0.09}/></g>;
    case "foothold": return <path {...common} d="M-.42.12 L.34-.34 L.48.22 L-.28.4Z"/>;
  }
}

export function HoldIcon({ category, className }: { category: HoldCategory; className?: string }) {
  return <svg aria-hidden="true" className={className} viewBox="-.65 -.65 1.3 1.3"><HoldGlyph category={category}/></svg>;
}
