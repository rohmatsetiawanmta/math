// src/components/ImageUploaderModal.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import toast from "react-hot-toast";

const ImageUploaderModal = ({ onUpload, onClose }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageHtml, setImageHtml] = useState("");

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
      setImageHtml(`<img src="${publicURL}" alt="Gambar Soal" width="200" />`);
      toast.success("Gambar berhasil diunggah!");
    } catch (error) {
      console.error("Error saat mengunggah:", error);
      toast.error("Gagal mengunggah gambar.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(imageHtml);
    toast.success("Kode HTML berhasil disalin!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold">Unggah Gambar</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4">
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
          {loading && <p className="text-blue-500 mt-2">Mengunggah...</p>}
          {imageUrl && (
            <div className="border rounded-md p-4 bg-gray-50">
              <p className="text-gray-600 font-bold mb-2">Pratinjau:</p>
              <img
                src={imageUrl}
                alt="Pratinjau"
                className="mt-2 rounded-md max-h-48"
              />
              <p className="text-gray-600 font-bold mt-4 mb-2">Kode HTML:</p>
              <code className="bg-gray-200 p-2 rounded text-xs break-all block">
                {imageHtml}
              </code>
              <button
                onClick={handleCopy}
                className="mt-2 rounded-md bg-green-500 px-4 py-2 text-white text-sm hover:bg-green-600"
              >
                Salin Kode
              </button>
              <button
                onClick={onClose}
                className="mt-2 ml-2 rounded-md bg-gray-300 px-4 py-2 text-gray-800 text-sm hover:bg-gray-400"
              >
                Selesai
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUploaderModal;
