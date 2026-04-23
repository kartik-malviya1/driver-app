import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "../constants/config";

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  [key: string]: any;
}

/**
 * Uploads a file to Cloudinary.
 * @param uri The local URI of the file to upload.
 * @returns A promise that resolves to the Cloudinary upload response.
 */
export async function uploadToCloudinary(uri: string): Promise<CloudinaryUploadResponse> {
  const apiUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  const formData = new FormData();
  
  // Create file object from URI
  const filename = uri.split("/").pop();
  const match = /\.(\w+)$/.exec(filename || "");
  const type = match ? `image/${match[1]}` : `image`;

  formData.append("file", {
    uri,
    name: filename,
    type,
  } as any);

  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Cloudinary Upload Error Details:", data);
      throw new Error(data.error?.message || "Cloudinary upload failed");
    }

    // Console log the URL and ID as requested
    console.log("-----------------------------------------");
    console.log("✅ Cloudinary Upload Successful!");
    console.log("URL:", data.secure_url);
    console.log("Public ID:", data.public_id);
    console.log("-----------------------------------------");

    return data as CloudinaryUploadResponse;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    throw error;
  }
}
