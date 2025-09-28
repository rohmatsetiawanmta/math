// src/pages/SubtopicListPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { ChevronRight } from "lucide-react";

const SubtopicListPage = () => {
  const [subtopics, setSubtopics] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { categoryId, topicId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubtopics = async () => {
      try {
        const { data, error } = await supabase
          .from("topics")
          .select(
            `
            *,
            category:category_id(
              *
            ),
            subtopics (
              *
            )
          `
          )
          .eq("topic_id", topicId)
          .order("sort_order", { foreignTable: "subtopics", ascending: true }) // <--- Baris ini telah ditambahkan
          .single();

        if (error) throw error;
        if (!data) throw new Error("Topik tidak ditemukan!");

        setData(data);
        setSubtopics(data.subtopics);
      } catch (error) {
        console.error("Error fetching subtopics:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubtopics();
  }, [topicId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-lg">
        Memuat subtopik...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">Gagal memuat subtopik: {error}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center gap-2 text-gray-500 mb-4 text-sm">
        <Link to="/latsol" className="hover:text-gray-700">
          Latihan Soal
        </Link>
        <ChevronRight size={14} />
        <Link
          to={`/latsol/${data.category.category_id}`}
          className="hover:text-gray-700"
        >
          {data.category.category_name}
        </Link>
        <ChevronRight size={14} />
        <span className="text-gray-900 font-medium">{data.topic_name}</span>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">
          Subtopik {data.topic_name}
        </h2>
      </div>

      <div className="mt-6 space-y-4">
        {subtopics.map((subtopic) => (
          <div key={subtopic.id}>
            {subtopic.is_published ? (
              <Link
                to={`/latsol/${categoryId}/${topicId}/${subtopic.subtopic_id}`}
                className="flex items-center justify-between rounded-lg bg-white p-6 shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
              >
                <h3 className="text-xl font-semibold text-gray-700">
                  {subtopic.subtopic_name}
                </h3>
              </Link>
            ) : (
              <></>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubtopicListPage;
