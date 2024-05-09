import sharp from "sharp";
import * as axios from "axios";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import uploadToS3 from "./uploadTos3";

async function downloadImage(url: string): Promise<Buffer> {
  const response = await axios.default({
    method: "GET",
    url: url,
    responseType: "arraybuffer",
  });

  return Buffer.from(response.data, "binary");
}

async function convertToWebP(
  imageBuffer: Buffer,
  width?: number
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize({
      width: width,
      withoutEnlargement: true,
      fit: sharp.fit.inside,
    })
    .toFormat("webp")
    .toBuffer();
}

async function main() {
  const images = await prisma.photos.findMany({
    take: 50,
    where:{displayImage:{not:{startsWith:"https://ai-photos-storage.s3-ap-southeast-2.amazonaws.com"}}},
    select: { id: true, prompt: true, displayImage: true },
  });
  if(images.length === 0) {
    console.log("No images left to convert.");
    return;
  }

  for (const image of images) {

    try {
        console.log("Downloading image...");
        const imageBuffer = await downloadImage(image.displayImage);
        console.log("Downloading complete");
        const webP400 = await convertToWebP(imageBuffer, 400);
        const webPFull = await convertToWebP(imageBuffer);
        console.log(
          "Conversion complete. Now you can save or use the WebP image buffer."
        );
        const urls = await uploadToS3(image.prompt, webP400, webPFull);
        await prisma.photos.update({
          where: { id: image.id },
          data: {
            thumbnailImage: urls.w400,
            displayImage: urls.wFull,
          },
        });
        console.log("Uploaded to S3");
      } catch (error) {
        console.error("An error occurred:", error);
      }
  }
  const count = await prisma.photos.count({where:{displayImage:{not:{startsWith:"https://ai-photos-storage.s3-ap-southeast-2.amazonaws.com"}}}});
  console.log(`There are ${count} images left to convert.`);
  main();
}

main();