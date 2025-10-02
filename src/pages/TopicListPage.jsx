// src/pages/TopicListPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { ChevronRight } from "lucide-react";

const TopicListPage = () => {
  const [topics, setTopics] = useState([]);
  const [categoryName, setCategoryName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { categoryId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select(
            `
            *,
            topics (
              *
            )
          `
          )
          .eq("category_id", categoryId)
          .order("sort_order", { foreignTable: "topics", ascending: true }) // <--- Modified query here
          .single();

        if (error) throw error;
        if (!data) throw new Error("Kategori tidak ditemukan!");

        setCategoryName(data.category_name);
        setTopics(data.topics);
      } catch (error) {
        console.error("Error fetching topics:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, [categoryId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-lg">
        Memuat topik...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">Gagal memuat topik: {error}</p>
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
        <span className="text-gray-900 font-medium">{categoryName}</span>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">
          Topik {categoryName}
        </h2>
      </div>

      <div className="mt-6 space-y-4">
        {topics.map((topic) => (
          <div>
            {topic.is_published ? (
              <Link
                to={`/latsol/${categoryId}/${topic.topic_id}`}
                className="flex items-center justify-between rounded-lg bg-white p-6 shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
              >
                <h3 className="text-xl font-semibold text-gray-700">
                  {topic.topic_name}
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

export default TopicListPage;
