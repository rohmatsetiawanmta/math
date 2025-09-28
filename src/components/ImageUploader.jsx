// src/components/ImageUploader.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import toast from "react-hot-toast";

const ImageUploader = ({ onUpload }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (file) {
      uploadImage();
    }
  }, [file]);

  const uploadImage = async () => {
    setLoading(true);
    const imageId =
      "IM-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const fileExt = file.name.split(".").pop();
    const filePath = `${imageId}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("problem_images")
        .upload(filePath, file);

      console.log("Uploading to path:", uploadError);

      if (uploadError) {
        throw uploadError;
      }

      const publicURL = supabase.storage
        .from("problem_images")
        .getPublicUrl(filePath).data.publicUrl;

      // Masukkan URL dan ID ke database problem_images
      const { error: dbError } = await supabase
        .from("problem_images")
        .insert({ image_url: publicURL, image_id: imageId });

      if (dbError) {
        throw dbError;
      }

      setImageUrl(publicURL);
      onUpload(publicURL);
      toast.success("Gambar berhasil diunggah!");
    } catch (error) {
      console.error("Error saat mengunggah:", error);
      console.error("Error details:", error.message);
      toast.error("Gagal mengunggah gambar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
      />
      {loading && <p className="text-blue-500">Mengunggah...</p>}
      {imageUrl && (
        <div className="border rounded-md p-2">
          <p className="text-gray-600 text-sm">URL Gambar:</p>
          <code className="bg-gray-100 p-1 rounded text-xs break-all">
            {imageUrl}
          </code>
          <img
            src={imageUrl}
            alt="Pratinjau"
            className="mt-2 rounded-md max-h-48"
          />
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
