import sharp from "sharp";
import{describe,expect,it}from"vitest";
import{prepareMedia}from"./media";

describe("media processing",()=>{
  it("re-encodes images, bounds dimensions and creates a thumbnail",async()=>{const source=await sharp({create:{width:1200,height:800,channels:3,background:"#123456"}}).jpeg().withMetadata({orientation:6}).toBuffer(),result=await prepareMedia(new File([Uint8Array.from(source)],"wall.JPG",{type:"image/jpeg"}),"wall");expect(result.mimeType).toBe("image/webp");expect(result.width).toBe(800);expect(result.height).toBe(1200);expect(result.thumbnail).not.toBeNull();expect((await sharp(result.data).metadata()).orientation).toBeUndefined();});
  it("rejects mismatched extensions and signatures",async()=>{const png=await sharp({create:{width:10,height:10,channels:3,background:"white"}}).png().toBuffer();await expect(prepareMedia(new File([Uint8Array.from(png)],"image.svg",{type:"image/png"}),"post")).rejects.toThrow(/extension/);await expect(prepareMedia(new File([new Uint8Array(20)],"image.png",{type:"image/png"}),"post")).rejects.toThrow(/signature/);});
  it("rejects dimensions above the purpose limit",async()=>{const header=await sharp({create:{width:5000,height:1,channels:3,background:"white"}}).png().toBuffer();await expect(prepareMedia(new File([Uint8Array.from(header)],"logo.png",{type:"image/png"}),"logo")).rejects.toThrow(/dimensions/);});
});
