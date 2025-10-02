// src/pages/MateriDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import { ChevronRight, Loader, Youtube } from "lucide-react";
import MathRenderer from "../components/MathRenderer.jsx";
import TeoriBox from "../components/TeoriBox.jsx"; // Reuses existing TeoriBox component
import { toast } from "react-hot-toast";
import formatTextForHTML from "../util/formatTextForHTML.js";

// Utility from ProblemDetailPage to generate YouTube Embed URL
const getYouTubeEmbedUrl = (url) => {
  if (!url) {
    return null;
  }
  const regex =
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([^&?/\s]+)/;
  const match = url.match(regex);
  if (match && match[1]) {
    const videoId = match[1];
    const urlParams = new URLSearchParams(url.split("?")[1]);
    const startTime = urlParams.get("t");
    let embedUrl = `https://www.youtube.com/embed/${videoId}`;
    if (startTime) {
      embedUrl += `?start=${parseInt(startTime, 10)}`;
    }
    return embedUrl;
  }
  return null;
};

// Utility to render text with Theory markers (adapted from ProblemDetailPage)
const renderContentWithTheories = (contentText, theories) => {
  if (!contentText) {
    return <p>Konten Materi kosong.</p>;
  }

  const formattedContentText = formatTextForHTML(contentText);

  const regex = /\[teori_\d+\]/g;
  const parts = formattedContentText.split(regex);
  const markers = formattedContentText.match(regex) || [];

  return parts.map((part, index) => {
    const textElement = <MathRenderer key={`text-${index}`} text={part} />;

    if (index < parts.length - 1) {
      const marker = markers[index];
      const theoryIndexMatch = marker.match(/\d+/);
      if (theoryIndexMatch) {
        const theoryIndex = parseInt(theoryIndexMatch[0], 10);
        // Cari teori berdasarkan sort_order
        const theory = theories.find((t) => t.sort_order === theoryIndex);

        if (theory) {
          return (
            <div key={`section-${index}`}>
              {textElement}
              <TeoriBox content={theory.content} />
            </div>
          );
        }
      }
    }
    return textElement;
  });
};

const MateriDetailPage = () => {
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theoriesWithOrder, setTheoriesWithOrder] = useState([]);

  const { categoryId, topicId, subtopicId, materialId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        // Fetch material data, hierarchy, and linked theories (from materials dan material_theories)
        const { data, error } = await supabase
          .from("materials")
          .select(
            `
            *,
            subtopic:subtopic_id(
              subtopic_name,
              subtopic_id,
              topic:topic_id(
                topic_name,
                topic_id,
                category:category_id(
                  category_name,
                  category_id
                )
              )
            ),
            material_theories(  
              sort_order,
              theories(content)
            )
          `
          )
          .eq("material_id", materialId)
          .single();

        if (error) throw error;
        if (!data) throw new Error("Materi tidak ditemukan!");

        // Memproses data teori dan mengurutkannya
        const theories = data.material_theories
          .map((link) => ({
            content: link.theories.content,
            sort_order: link.sort_order,
          }))
          .sort((a, b) => a.sort_order - b.sort_order);

        setTheoriesWithOrder(theories);
        setMaterial(data);
      } catch (error) {
        console.error("Error fetching material:", error);
        setError(error.message);
        toast.error("Gagal memuat halaman materi.");
      } finally {
        setLoading(false);
      }
    };

    fetchMaterial();
  }, [materialId]);

  const handleBackToMaterialList = () => {
    navigate(`/materi/${categoryId}/${topicId}/${subtopicId}`);
  };

  const breadcrumb = material ? (
    <div className="flex flex-wrap items-center gap-2 text-gray-500 text-sm mb-4">
      <Link to="/materi" className="hover:text-gray-700">
        Materi Pelajaran
      </Link>
      <ChevronRight size={14} />
      <Link
        to={`/materi/${material.subtopic.topic.category.category_id}`}
        className="hover:text-gray-700"
      >
        {material.subtopic.topic.category.category_name}
      </Link>
      <ChevronRight size={14} />
      <Link
        to={`/materi/${material.subtopic.topic.category.category_id}/${material.subtopic.topic.topic_id}`}
        className="hover:text-gray-700"
      >
        {material.subtopic.topic.topic_name}
      </Link>
      <ChevronRight size={14} />
      <Link
        to={`/materi/${material.subtopic.topic.category.category_id}/${material.subtopic.topic.topic_id}/${material.subtopic.subtopic_id}`}
        className="hover:text-gray-700"
      >
        {material.subtopic.subtopic_name}
      </Link>
      <ChevronRight size={14} />
      <span className="text-gray-900 font-medium">{material.material_id}</span>
    </div>
  ) : null;

  useEffect(() => {
    // Memastikan MathJax me-render konten setelah data dimuat
    if (window.MathJax && window.MathJax.Hub) {
      window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
    }
  }, [material]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-lg flex justify-center items-center h-64">
        <Loader className="animate-spin mr-2" size={24} /> Memuat Materi...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">Gagal memuat materi: {error}</p>
        <button
          onClick={handleBackToMaterialList}
          className="mt-4 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Kembali ke Daftar Materi
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {breadcrumb}

      {/* Bagian Utama Materi */}
      <div className="mt-6 rounded-lg bg-white p-6 shadow-xl border-t-4 border-blue-500">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          {material.title || `Materi: ${material.material_id}`}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Subtopik: {material.subtopic.subtopic_name}
        </p>

        <div className="prose max-w-none overflow-x-auto text-gray-800">
          {/* Menampilkan konten materi dengan Teori Penting inline */}
          {renderContentWithTheories(material.content_text, theoriesWithOrder)}
        </div>

        {material.video_link && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-xl font-semibold text-blue-700 mb-4 flex items-center gap-2">
              <Youtube size={24} /> Video Penjelasan
            </h4>
            <div className="flex justify-center">
              <iframe
                width="640"
                height="360"
                src={getYouTubeEmbedUrl(material.video_link)}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg shadow-lg"
              ></iframe>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MateriDetailPage;
