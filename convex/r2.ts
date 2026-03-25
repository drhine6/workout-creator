"use node";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { action } from "./_generated/server";
import { v } from "convex/values";

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

// Generate a presigned URL so the client can upload directly to R2
export const getUploadUrl = action({
  args: {
    filename: v.string(),
    contentType: v.string(),
  },
  handler: async (_ctx, { filename, contentType }) => {
    const client = getR2Client();
    const key = `sessions/${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    const domain = process.env.R2_PUBLIC_DOMAIN!.replace(/^https?:\/\//, "");
    const videoUrl = `https://${domain}/${key}`;

    return { uploadUrl, videoUrl, key };
  },
});
