import type { HoldCategory } from "./holds";
import type { Point } from "./core";
import type { SurfaceKind, SurfaceVertex, Vec3, WallProfile } from "@/features/digital-twin/geometry";

export type MemberMapFace = { id:string;name:string;widthMetres:number;heightMetres:number;angleDegrees:number;routeCount:number;surfaceKind?:SurfaceKind;profile?:WallProfile;facingDirection?:-1|1;localOffset?:Vec3;materialColour?:string;vertices?:SurfaceVertex[] };
export type MemberMapStructure = { id:string;name:string;start:Point;end:Point;thicknessMetres:number;baseElevationMetres?:number;faces:MemberMapFace[] };
export type MemberMapConfiguration = { widthMetres:number;heightMetres:number;showGrid:boolean;gridSizeMetres:number };
export type MemberMapHold = { id:string;category:HoldCategory;iconKey:HoldCategory;position:Point;rotationDegrees:number;scaleFactor:number;colour:string;label:string };
export type MemberMapRoute = { id:string;name:string;colour:string;grade:string;gradeSystem:string;discipline:string;setterName:string;setOn:string;retireOn:string;description:string;tags:string[];holdIds:string[];favourite:boolean;submittedFeedback:string[] };
export type MemberFaceDetail = { status:"success";face:MemberMapFace;holds:MemberMapHold[];routes:MemberMapRoute[];sessions:{id:string;session_date:string}[] } | { status:"error";message:string };
