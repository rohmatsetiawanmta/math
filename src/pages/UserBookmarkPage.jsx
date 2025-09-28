// src/pages/UserBookmarksPage.jsx

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import { BookmarkCheck, ChevronRight, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import MathRenderer from "../components/MathRenderer";
import formatTextForHTML from "../util/formatTextForHTML";

const UserBookmarksPage = () => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  const fetchBookmarks = useCallback(async (currentSession) => {
    if (!currentSession) {
      setLoading(false);
      return;
    }

    try {
      // Fetch bookmark links
      const { data: bookmarkData, error: bookmarkError } = await supabase
        .from("user_bookmarks")
        .select(`problem_id`)
        .eq("user_id", currentSession.user.id);

      if (bookmarkError) throw bookmarkError;

      const problemIds = bookmarkData.map((b) => b.problem_id);

      if (problemIds.length === 0) {
        setBookmarks([]);
        setLoading(false);
        return;
      }

      // Fetch problem details and hierarchy for bookmarked problems
      const { data: problemsData, error: problemsError } = await supabase
        .from("problems")
        .select(
          `
          problem_id, 
          question_text,
          tag,
          subtopic:subtopic_id(
            subtopic_id,
            subtopic_name,
            topic:topic_id(
              topic_id,
              topic_name,
              category:category_id(
                category_id,
                category_name
              )
            )
          )
        `
        )
        .in("problem_id", problemIds);

      if (problemsError) throw problemsError;

      setBookmarks(problemsData);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Cek sesi awal
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (!initialSession) {
        toast("Silakan login untuk melihat bookmark Anda.", { icon: "🔒" });
        navigate("/login", { replace: true });
        return;
      }
      fetchBookmarks(initialSession);
    });

    // Listener untuk perubahan state auth
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        if (!newSession) {
          navigate("/login", { replace: true });
        } else {
          fetchBookmarks(newSession);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchBookmarks, navigate]);

  const handleRemoveBookmark = async (problemId, event) => {
    event.stopPropagation();
    event.preventDefault();

    if (!session) return;

    const { error } = await supabase
      .from("user_bookmarks")
      .delete()
      .match({ user_id: session.user.id, problem_id: problemId });

    if (error) {
      console.error("Error removing bookmark:", error);
      toast.error("Gagal menghapus bookmark.");
    } else {
      toast.success("Bookmark dihapus!");
      // Update state lokal
      setBookmarks((prev) => prev.filter((b) => b.problem_id !== problemId));
    }
  };

  if (loading || !session) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-lg">
        Memuat bookmark...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">Gagal memuat bookmark: {error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="mb-6 flex items-center gap-3 text-3xl font-bold text-gray-800">
        <BookmarkCheck size={30} className="text-yellow-600" /> Soal Favorit
        Anda ({bookmarks.length})
      </h2>

      <div className="mt-6 space-y-4">
        {bookmarks.length > 0 ? (
          bookmarks.map((problem) => {
            const hierarchy = problem.subtopic.topic.category;
            const linkPath = `/latsol/${hierarchy.category_id}/${problem.subtopic.topic.topic_id}/${problem.subtopic.subtopic_id}/${problem.problem_id}`;

            return (
              <Link
                key={problem.problem_id}
                to={linkPath}
                className="block rounded-lg bg-white p-6 shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2 text-sm text-gray-500">
                      <span>{hierarchy.category_name}</span>
                      <ChevronRight size={12} />
                      <span>{problem.subtopic.topic.topic_name}</span>
                      <ChevronRight size={12} />
                      <span className="font-medium text-gray-700 mr-2">
                        {problem.subtopic.subtopic_name}
                      </span>
                      {problem.tag && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          {problem.tag}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-sm text-gray-800 prose max-w-none p-preview">
                      <MathRenderer
                        text={formatTextForHTML(
                          problem.question_text.substring(0, 200) +
                            (problem.question_text.length > 200 ? "..." : "")
                        )}
                      />
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleRemoveBookmark(problem.problem_id, e)}
                    className="ml-4 p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors"
                    title="Hapus Bookmark"
                  >
                    <XCircle size={24} />
                  </button>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-lg bg-gray-100 p-6 text-center text-gray-500">
            Anda belum membookmark soal apa pun.
          </div>
        )}
      </div>
    </div>
  );
};

export default UserBookmarksPage;
