import "server-only";

import sharp from "sharp";
import { z } from "zod";
import type { AppSupabaseClient } from "@/lib/supabase/types";

const uuid=z.uuid();
const imageTypes={"image/png":["png"],"image/jpeg":["jpg","jpeg"],"image/webp":["webp"]}as const;
const policies={
  logo:{bucket:"gym-branding",maxBytes:2*1024*1024,maxDimension:4096,maxPixels:16_000_000,video:false},
  wall:{bucket:"wall-images",maxBytes:10*1024*1024,maxDimension:12_000,maxPixels:48_000_000,video:false},
  route:{bucket:"route-media",maxBytes:10*1024*1024,maxDimension:8_000,maxPixels:32_000_000,video:false},
  event:{bucket:"event-images",maxBytes:10*1024*1024,maxDimension:6_000,maxPixels:24_000_000,video:false},
  post:{bucket:"community-images",maxBytes:10*1024*1024,maxDimension:6_000,maxPixels:24_000_000,video:false},
  ascent:{bucket:"ascent-media",maxBytes:20*1024*1024,maxDimension:8_000,maxPixels:32_000_000,video:true},
}as const;

export type MediaPurpose=keyof typeof policies;
type PreparedMedia={data:Buffer;thumbnail:Buffer|null;mimeType:"image/webp"|"video/mp4";extension:"webp"|"mp4";width:number|null;height:number|null};

function signatureMatches(bytes:Uint8Array,mime:string){if(mime==="image/png")return[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value);if(mime==="image/jpeg")return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;if(mime==="image/webp")return Buffer.from(bytes.subarray(0,4)).toString()==="RIFF"&&Buffer.from(bytes.subarray(8,12)).toString()==="WEBP";if(mime==="video/mp4")return Buffer.from(bytes.subarray(4,8)).toString()==="ftyp";return false;}

export async function prepareMedia(file:File,purpose:MediaPurpose):Promise<PreparedMedia>{
  const policy=policies[purpose];
  if(file.size<1||file.size>policy.maxBytes)throw new Error(`File must be smaller than ${policy.maxBytes/1024/1024} MB.`);
  const extension=file.name.toLowerCase().split(".").pop()??"",allowedImageExtensions=imageTypes[file.type as keyof typeof imageTypes];
  const validVideo=policy.video&&file.type==="video/mp4"&&extension==="mp4";
  if((!allowedImageExtensions||!allowedImageExtensions.includes(extension as never))&&!validVideo)throw new Error("The filename extension and media type do not match an allowed format.");
  const source=Buffer.from(await file.arrayBuffer());if(!signatureMatches(source.subarray(0,12),file.type))throw new Error("The file signature does not match its media type.");
  if(validVideo)return{data:source,thumbnail:null,mimeType:"video/mp4",extension:"mp4",width:null,height:null};
  const metadata=await sharp(source,{failOn:"error",limitInputPixels:policy.maxPixels}).metadata();
  if(!metadata.width||!metadata.height||metadata.width>policy.maxDimension||metadata.height>policy.maxDimension||metadata.width*metadata.height>policy.maxPixels)throw new Error("Image dimensions exceed the allowed limit.");
  if((metadata.pages??1)>1)throw new Error("Animated images are not supported.");
  const processed=await sharp(source,{failOn:"error",limitInputPixels:policy.maxPixels}).rotate().resize({width:policy.maxDimension,height:policy.maxDimension,fit:"inside",withoutEnlargement:true}).webp({quality:86,effort:4}).toBuffer({resolveWithObject:true});
  const thumbnail=await sharp(processed.data).resize({width:480,height:480,fit:"inside",withoutEnlargement:true}).webp({quality:78,effort:4}).toBuffer();
  return{data:processed.data,thumbnail,mimeType:"image/webp",extension:"webp",width:processed.info.width,height:processed.info.height};
}

export async function uploadMedia(input:{client:AppSupabaseClient;file:File;purpose:MediaPurpose;gymId:string;ownerProfileId:string;targetId?:string|null}){
  const gymId=uuid.parse(input.gymId),ownerProfileId=uuid.parse(input.ownerProfileId),targetId=input.targetId?uuid.parse(input.targetId):null,policy=policies[input.purpose],prepared=await prepareMedia(input.file,input.purpose),assetKey=crypto.randomUUID();
  const prefix=input.purpose==="ascent"?`${gymId}/${ownerProfileId}`:gymId,storagePath=`${prefix}/${assetKey}.${prepared.extension}`,thumbnailPath=prepared.thumbnail?`${prefix}/thumbnails/${assetKey}.webp`:null;
  const sourceUpload=await input.client.storage.from(policy.bucket).upload(storagePath,prepared.data,{contentType:prepared.mimeType,upsert:false});if(sourceUpload.error)throw new Error("Media upload failed.");
  if(prepared.thumbnail&&thumbnailPath){const thumbnailUpload=await input.client.storage.from(policy.bucket).upload(thumbnailPath,prepared.thumbnail,{contentType:"image/webp",upsert:false});if(thumbnailUpload.error){await input.client.storage.from(policy.bucket).remove([storagePath]);throw new Error("Media thumbnail creation failed.");}}
  const{data:asset,error}=await input.client.from("media_assets").insert({gym_id:gymId,owner_profile_id:ownerProfileId,bucket_id:policy.bucket,storage_path:storagePath,thumbnail_path:thumbnailPath,purpose:input.purpose,target_id:targetId,mime_type:prepared.mimeType,byte_size:prepared.data.byteLength,width:prepared.width,height:prepared.height}).select("id").single();
  if(error||!asset){await input.client.storage.from(policy.bucket).remove([storagePath,...(thumbnailPath?[thumbnailPath]:[])]);throw new Error("Media inventory registration failed.");}
  return{assetId:asset.id,bucket:policy.bucket,storagePath,thumbnailPath,mimeType:prepared.mimeType,width:prepared.width,height:prepared.height};
}

export async function discardMedia(client:AppSupabaseClient,asset:{assetId:string;bucket:string;storagePath:string;thumbnailPath:string|null}){await client.storage.from(asset.bucket).remove([asset.storagePath,...(asset.thumbnailPath?[asset.thumbnailPath]:[])]);await client.from("media_assets").update({status:"deleted",deleted_at:new Date().toISOString(),retention_until:new Date().toISOString()}).eq("id",asset.assetId);}
