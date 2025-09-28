// src/pages/ProblemListPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { ChevronRight } from "lucide-react";
import MathRenderer from "../components/MathRenderer";
import formatTextForHTML from "../util/formatTextForHTML";

const ProblemListPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { categoryId, topicId, subtopicId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const { data, error } = await supabase
          .from("subtopics")
          .select(
            `
            *,
            topic:topic_id(
              *,
              category:category_id(
                *
              )
            ),
            problems:problems(
              *
            )
          `
          )
          .eq("subtopic_id", subtopicId)
          .single();

        if (error) throw error;
        if (!data) throw new Error("Subtopik tidak ditemukan!");

        setData(data);
      } catch (error) {
        console.error("Error fetching problems:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, [subtopicId]);

  const handleBackToSubtopic = () => {
    navigate(`/latsol/${categoryId}/${topicId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-lg">
        Memuat soal...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">Gagal memuat soal: {error}</p>
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
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
          <Link to="/latsol" className="hover:text-gray-700">
            Latihan Soal
          </Link>
          <ChevronRight size={14} />
          <Link
            to={`/latsol/${data.topic.category.category_id}`}
            className="hover:text-gray-700"
          >
            {data.topic.category.category_name}
          </Link>
          <ChevronRight size={14} />
          <Link
            to={`/latsol/${data.topic.category.category_id}/${data.topic.topic_id}`}
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
          Soal Subtopik {data.subtopic_name}
        </h2>
      </div>

      <div className="mt-6 space-y-4">
        {data.problems.length > 0 ? (
          data.problems.map((problem, index) => (
            <Link
              key={problem.id}
              to={`/latsol/${categoryId}/${topicId}/${subtopicId}/${problem.problem_id}`}
              className="block rounded-lg bg-white p-6 shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
            >
              <div className="flex items-center gap-2">
                {problem.tag && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {problem.tag}
                  </span>
                )}
              </div>
              <div className="mt-2 text-sm text-gray-500 prose max-w-none">
                {problem.question_text.length <= 200 ? (
                  <MathRenderer
                    text={formatTextForHTML(
                      problem.question_text.substring(0, 200)
                    )}
                  />
                ) : (
                  <MathRenderer
                    text={formatTextForHTML(
                      problem.question_text.substring(0, 200) + "..."
                    )}
                  />
                )}
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-lg bg-gray-100 p-6 text-center text-gray-500">
            Belum ada soal untuk subtopik ini.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemListPage;
