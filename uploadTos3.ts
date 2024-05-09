import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import 'dotenv/config'

export const s3Client = new S3Client({
  region: "ap-southeast-2",
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID as string,
    secretAccessKey: process.env.ACCESS_TOKEN_SECRET as string,
  },
});

export default async function uploadToS3(
  name: string,
  w400: Buffer,
  wFull: Buffer
) {
  const cleanText = name.replace(/[^\w\s]/g, "");
  name = cleanText.split(/\s+/).slice(0, 10).join("-");

  const w400Name = name + "-400-" + new Date().getTime() + ".webp";
  const wFullName = name + "-" + new Date().getTime() + ".webp";
  const up400 = new PutObjectCommand({
    Bucket: "ai-photos-storage",
    Key: w400Name,
    Body: w400,
    ContentType: "image/webp",
    ContentLength: w400.length,
  });

  const upFull = new PutObjectCommand({
    Bucket: "ai-photos-storage",
    Key: wFullName,
    Body: wFull,
    ContentType: "image/webp",
    ContentLength: wFull.length,
  });

  try {
    await s3Client.send(up400);
    await s3Client.send(upFull);

    return {
      w400: `https://ai-photos-storage.s3-ap-southeast-2.amazonaws.com/${w400Name}`,
      wFull: `https://ai-photos-storage.s3-ap-southeast-2.amazonaws.com/${wFullName}`,
    };
  } catch (error) {
    console.log(error);
    throw new Error("Error uploading to S3");
  }
}
