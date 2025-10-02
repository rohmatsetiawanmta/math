// src/pages/MateriListPage.jsx

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { ChevronRight, FileText } from "lucide-react";
import toast from "react-hot-toast";

const MateriListPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { categoryId, topicId, subtopicId } = useParams();
  const navigate = useNavigate();

  // Memuat data Subtopik dan Daftar Materi (dari tabel 'materials' yang diasumsikan)
  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const { data: subtopicData, error: materialError } = await supabase
        .from("subtopics")
        .select(
          `
          subtopic_name,
          subtopic_id,
          topic:topic_id(
            topic_name,
            topic_id,
            category:category_id(
              category_name,
              category_id
            )
          ),
          materials:materials(
            material_id, 
            id,
            title, 
            content_text,
            sort_order
          )
        `
        )
        .eq("subtopic_id", subtopicId)
        .order("sort_order", { foreignTable: "materials", ascending: true }) // Urutkan materi
        .single();

      if (materialError) throw materialError;
      if (!subtopicData) throw new Error("Subtopik tidak ditemukan!");

      setData(subtopicData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [subtopicId]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleBackToSubtopic = () => {
    navigate(`/materi/${categoryId}/${topicId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-lg">
        Memuat daftar materi...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">Gagal memuat materi: {error}</p>
        <button
          onClick={handleBackToSubtopic}
          className="mt-4 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      {data && data.topic && data.topic.category && (
        <div className="flex flex-wrap items-center gap-2 text-gray-500 text-sm mb-4">
          <Link to="/materi" className="hover:text-gray-700">
            Materi Pelajaran
          </Link>
          <ChevronRight size={14} />
          <Link
            to={`/materi/${data.topic.category.category_id}`}
            className="hover:text-gray-700"
          >
            {data.topic.category.category_name}
          </Link>
          <ChevronRight size={14} />
          <Link
            to={`/materi/${data.topic.category.category_id}/${data.topic.topic_id}`}
            className="hover:text-gray-700"
          >
            {data.topic.topic_name}
          </Link>
          <ChevronRight size={14} />
          <span className="text-gray-900 font-medium">
            {data.subtopic_name}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">
          Materi Subtopik {data.subtopic_name}
        </h2>
      </div>

      <div className="mt-6 space-y-4">
        {data.materials && data.materials.length > 0 ? (
          data.materials.map((material, index) => {
            return (
              <Link
                key={material.id}
                // Link ke MateriDetailPage
                to={`/materi/${categoryId}/${topicId}/${subtopicId}/${material.material_id}`}
                className="relative flex items-center justify-between rounded-lg bg-white p-6 shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <FileText size={24} className="text-blue-500" />
                  <span className="text-lg font-semibold text-gray-700">
                    Materi #{index + 1}:{" "}
                    {material.title || material.material_id}
                  </span>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </Link>
            );
          })
        ) : (
          <div className="rounded-lg bg-gray-100 p-6 text-center text-gray-500">
            Belum ada materi untuk subtopik ini.
          </div>
        )}
      </div>
    </div>
  );
};

export default MateriListPage;
