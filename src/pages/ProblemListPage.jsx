// src/pages/ProblemListPage.jsx

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  ChevronRight,
  CheckCircle,
  XCircle,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import MathRenderer from "../components/MathRenderer";
import formatTextForHTML from "../util/formatTextForHTML";
import toast from "react-hot-toast";

const ProblemListPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [progressMap, setProgressMap] = useState({});
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

  const { categoryId, topicId, subtopicId } = useParams();
  const navigate = useNavigate();

  // FUNGSI BARU: Untuk toggle bookmark dari daftar
  const handleToggleBookmark = async (problemId, isBookmarked, e) => {
    e.preventDefault(); // Mencegah navigasi Link
    e.stopPropagation(); // Mencegah bubble up

    if (!session) {
      toast.error("Anda harus login untuk membookmark soal.");
      return;
    }

    const userId = session.user.id;
    let error;

    if (isBookmarked) {
      // Hapus bookmark
      ({ error } = await supabase
        .from("user_bookmarks")
        .delete()
        .match({ user_id: userId, problem_id: problemId }));

      if (!error) {
        setBookmarkedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(problemId);
          return newSet;
        });
        toast.success("Bookmark dihapus!");
      } else {
        console.error("Error removing bookmark:", error);
        toast.error("Gagal menghapus bookmark.");
      }
    } else {
      // Tambah bookmark
      ({ error } = await supabase.from("user_bookmarks").insert({
        user_id: userId,
        problem_id: problemId,
      }));

      if (!error) {
        setBookmarkedIds((prev) => new Set(prev).add(problemId));
        toast.success("Soal berhasil dibookmark!");
      } else {
        console.error("Error adding bookmark:", error);
        toast.error("Gagal menambahkan bookmark.");
      }
    }
  };

  // Fungsi fetch data utama (dimemoize dengan useCallback)
  const fetchProblemsAndProgress = useCallback(
    async (currentSession) => {
      setLoading(true);
      try {
        const { data: subtopicData, error: problemError } = await supabase
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
            problem_id, 
            id,
            question_text,
            tag
          )
        `
          )
          .eq("subtopic_id", subtopicId)
          .single();

        if (problemError) throw problemError;
        if (!subtopicData) throw new Error("Subtopik tidak ditemukan!");

        setData(subtopicData);

        // --- LOGIC: Fetch Progress & Bookmarks ---
        if (currentSession && subtopicData.problems.length > 0) {
          const problemIds = subtopicData.problems.map((p) => p.problem_id);
          const userId = currentSession.user.id;

          // 1. Fetch Progress
          const { data: progressData, error: progressError } = await supabase
            .from("user_progress")
            .select("problem_id, is_correct")
            .eq("user_id", userId)
            .in("problem_id", problemIds);

          if (!progressError && progressData) {
            const map = progressData.reduce((acc, curr) => {
              acc[curr.problem_id] = curr.is_correct;
              return acc;
            }, {});
            setProgressMap(map);
          } else if (progressError) {
            console.error("Error fetching progress:", progressError);
          }

          // 2. Fetch Bookmarks
          const { data: bookmarkData, error: bookmarkError } = await supabase
            .from("user_bookmarks")
            .select("problem_id")
            .eq("user_id", userId)
            .in("problem_id", problemIds);

          if (!bookmarkError && bookmarkData) {
            const ids = new Set(bookmarkData.map((item) => item.problem_id));
            setBookmarkedIds(ids);
          } else if (bookmarkError) {
            console.error("Error fetching bookmarks:", bookmarkError);
            setBookmarkedIds(new Set());
          }
        } else {
          setProgressMap({});
          setBookmarkedIds(new Set());
        }
        // --- END LOGIC ---
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    },
    [subtopicId]
  );

  // Effect untuk mengelola sesi dan memanggil fetch data
  useEffect(() => {
    let mounted = true;

    // 1. Ambil sesi awal
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (mounted) {
        setSession(initialSession);
        fetchProblemsAndProgress(initialSession);
      }
    });

    // 2. Listener untuk perubahan state auth (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (mounted) {
          setSession(newSession);
          fetchProblemsAndProgress(newSession);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProblemsAndProgress]);

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
        <div className="flex flex-wrap items-center gap-2 text-gray-500 text-sm mb-4">
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
          data.problems.map((problem, index) => {
            // Logika menentukan status progress
            const problemProgress = progressMap[problem.problem_id];
            const isCorrect = problemProgress === true;
            const isAttempted = problemProgress !== undefined;
            // Status bookmark
            const isBookmarked = bookmarkedIds.has(problem.problem_id);

            return (
              <div
                key={problem.id}
                className="relative rounded-lg bg-white shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
              >
                {/* Link untuk navigasi */}
                <Link
                  to={`/latsol/${categoryId}/${topicId}/${subtopicId}/${problem.problem_id}`}
                  className="block p-6 pr-16" // Tambahkan padding kanan untuk menghindari tumpang tindih
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {/* Penomoran Soal */}
                      <span className="text-lg font-semibold text-gray-700">
                        Soal #{index + 1}
                      </span>

                      {problem.tag && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          {problem.tag}
                        </span>
                      )}
                    </div>
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

                {/* CONTAINER STATUS & BOOKMARK (Absolute Positioned) */}
                {session && (
                  <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
                    {/* Status Jawaban */}
                    {isAttempted ? (
                      isCorrect ? (
                        <CheckCircle
                          size={24}
                          className="text-green-500"
                          title="Benar"
                        />
                      ) : (
                        <XCircle
                          size={24}
                          className="text-red-500"
                          title="Salah"
                        />
                      )
                    ) : (
                      <div
                        className="w-6 h-6 bg-gray-100 rounded-full border border-gray-300"
                        title="Belum Dicoba"
                      ></div>
                    )}

                    {/* Tombol Bookmark */}
                    <button
                      onClick={(e) =>
                        handleToggleBookmark(
                          problem.problem_id,
                          isBookmarked,
                          e
                        )
                      }
                      className={`p-1 rounded-full transition-colors 
                          ${
                            isBookmarked
                              ? "text-yellow-500 hover:text-yellow-600"
                              : "text-gray-400 hover:text-gray-500"
                          }
                        `}
                      title={isBookmarked ? "Hapus Bookmark" : "Bookmark Soal"}
                    >
                      {isBookmarked ? (
                        <BookmarkCheck size={24} />
                      ) : (
                        <Bookmark size={24} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
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
