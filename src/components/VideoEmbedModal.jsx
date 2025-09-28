// src/components/VideoEmbedModal.jsx
import { useState } from "react";

const VideoEmbedModal = ({ onEmbed, onClose }) => {
  const [videoUrl, setVideoUrl] = useState("");

  const extractVideoId = (url) => {
    const regex =
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([^&?/\s]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleEmbed = () => {
    const videoId = extractVideoId(videoUrl);
    if (videoId) {
      const embedCode = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
      onEmbed(embedCode);
    }
    onClose(); // Tambahkan ini agar modal tertutup setelah embed
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-xl font-bold">Embed Video YouTube</h3>
        <input
          type="text"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Tempel URL YouTube di sini..."
          className="w-full rounded-md border p-2 mb-4"
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-300 px-4 py-2 hover:bg-gray-400"
          >
            Batal
          </button>
          <button
            onClick={handleEmbed}
            className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Embed
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoEmbedModal;
