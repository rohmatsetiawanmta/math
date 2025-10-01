// src/pages/TanyaSoalPage.jsx

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Eye,
  Loader,
} from "lucide-react";

// Adaptasi dari generateRandomId di ProblemDetailPage
const generateId = (prefix) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `${prefix}-${result}`;
};

// Helper function to generate the correct problem link (berdasarkan map)
const generateProblemLinkPath = (problemId, hierarchyMap) => {
  const hier = hierarchyMap[problemId];
  // Pastikan semua bagian hierarki ada
  if (!hier || !hier.category_id || !hier.topic_id || !hier.subtopic_id)
    return null;
  return `/latsol/${hier.category_id}/${hier.topic_id}/${hier.subtopic_id}/${problemId}`;
};

const TanyaSoalPage = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [problemHierarchyMap, setProblemHierarchyMap] = useState({}); // <-- STATE BARU

  // Fetch Questions for the current user
  const fetchQuestions = useCallback(async (userId) => {
    if (!userId) return;
    const { data: qData, error: qError } = await supabase
      .from("user_questions")
      .select(
        "id, user_question_id, image_url, status, problem_id, admin_reason, created_at, simple_answer"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (qError) {
      console.error("Error fetching questions:", qError);
      toast.error("Gagal memuat daftar pertanyaan.");
      return;
    }

    setQuestions(qData);

    // --- LOGIC FOR HIERARCHY MAPPING ---
    // 1. Kumpulkan semua problem_id dari pertanyaan yang sudah diselesaikan
    const resolvedProblemIds = qData
      .filter((q) => q.status === "resolved" && q.problem_id)
      .map((q) => q.problem_id);

    if (resolvedProblemIds.length > 0) {
      // 2. Fetch data hierarki dari tabel 'problems' menggunakan JOIN/Deep Select
      const { data: pData, error: pError } = await supabase
        .from("problems")
        .select(
          `
              problem_id,
              subtopic:subtopic_id(
                  subtopic_id,
                  topic:topic_id(
                      topic_id,
                      category:category_id(
                          category_id
                      )
                  )
              )
          `
        )
        .in("problem_id", resolvedProblemIds);

      if (pError) {
        console.error("Error fetching hierarchy:", pError);
        setProblemHierarchyMap({});
      } else {
        // 3. Buat map Problem ID -> Hierarchy IDs
        const map = {};
        pData.forEach((p) => {
          if (p.subtopic && p.subtopic.topic && p.subtopic.topic.category) {
            map[p.problem_id] = {
              category_id: p.subtopic.topic.category.category_id,
              topic_id: p.subtopic.topic.topic_id,
              subtopic_id: p.subtopic.subtopic_id,
            };
          }
        });
        setProblemHierarchyMap(map);
      }
    } else {
      setProblemHierarchyMap({});
    }
    // -----------------------------------
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (!initialSession) {
        toast("Silakan login untuk bertanya soal.", { icon: "🔒" });
        navigate("/login", { replace: true });
        return;
      }
      fetchQuestions(initialSession.user.id);
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        if (!newSession) {
          navigate("/login", { replace: true });
        } else {
          fetchQuestions(newSession.user.id);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchQuestions, navigate]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !session) return;

    setIsUploading(true);

    const userQuestionId = generateId("UQ");
    const fileExt = file.name.split(".").pop();
    const filePath = `questions/${userQuestionId}.${fileExt}`;

    try {
      // 1. Upload Gambar ke Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("problem_images")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const publicURL = supabase.storage
        .from("problem_images")
        .getPublicUrl(filePath).data.publicUrl;

      // 2. Insert ke tabel user_questions
      const { error: dbError } = await supabase.from("user_questions").insert({
        user_id: session.user.id,
        user_question_id: userQuestionId,
        image_url: publicURL,
        status: "pending",
      });

      if (dbError) {
        throw dbError;
      }

      toast.success("Soal berhasil diunggah! Menunggu moderasi admin.");
      setFile(null); // Reset input file
      fetchQuestions(session.user.id); // Reload daftar
    } catch (error) {
      console.error("Error saat mengunggah soal:", error);
      toast.error(`Gagal mengunggah soal: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case "pending":
        return {
          text: "Menunggu Moderasi",
          color: "text-yellow-600",
          icon: <Clock size={20} />,
          bg: "bg-yellow-100",
        };
      case "answerable":
        return {
          text: "Siap Dijawab Admin",
          color: "text-blue-600",
          icon: <CheckCircle size={20} />,
          bg: "bg-blue-100",
        };
      case "not_answerable":
        return {
          text: "Tidak Bisa Dijawab",
          color: "text-red-600",
          icon: <XCircle size={20} />,
          bg: "bg-red-100",
        };
      case "resolved":
        return {
          text: "Selesai (Lihat Jawaban)",
          color: "text-green-600",
          icon: <CheckCircle size={20} />,
          bg: "bg-green-100",
        };
      default:
        return {
          text: "Tidak Diketahui",
          color: "text-gray-600",
          icon: <Loader size={20} />,
          bg: "bg-gray-100",
        };
    }
  };

  if (isLoading || !session) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-lg flex justify-center items-center h-64">
        <Loader className="animate-spin mr-2" size={24} /> Memuat halaman...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="mb-6 text-3xl font-bold text-gray-800 flex items-center gap-2">
        Tanya Soal Matematika
      </h2>

      {/* Form Upload Soal */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">
          Upload Gambar Soal Anda
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100 disabled:file:opacity-50"
            required
          />
          <button
            type="submit"
            disabled={!file || isUploading}
            className="flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-400 w-full"
          >
            {isUploading ? (
              <>
                <Loader size={20} className="animate-spin" /> Mengunggah...
              </>
            ) : (
              "Kirim Soal"
            )}
          </button>
        </form>
      </div>

      {/* Daftar Pertanyaan User */}
      <h3 className="text-2xl font-bold text-gray-800 mb-4">
        Daftar Pertanyaan Anda ({questions.length})
      </h3>
      <div className="space-y-4">
        {questions.length === 0 ? (
          <div className="p-6 text-center bg-gray-100 rounded-lg text-gray-500">
            Anda belum pernah bertanya soal.
          </div>
        ) : (
          questions.map((q) => {
            const statusDisplay = getStatusDisplay(q.status);
            const createdAt = new Date(q.created_at).toLocaleDateString(
              "id-ID",
              {
                year: "numeric",
                month: "short",
                day: "numeric",
              }
            );

            // Logika Link Pembahasan yang Benar
            const problemLink =
              q.status === "resolved" && q.problem_id
                ? generateProblemLinkPath(q.problem_id, problemHierarchyMap)
                : null;

            return (
              <div
                key={q.id}
                className="bg-white p-5 rounded-lg shadow-md border-l-4 border-gray-200"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">
                      {q.user_question_id}
                    </span>
                    <span className="text-xs text-gray-400">
                      Tanggal Upload: {createdAt}
                    </span>
                    <span
                      className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${statusDisplay.color} ${statusDisplay.bg}`}
                    >
                      {statusDisplay.icon} {statusDisplay.text}
                    </span>
                  </div>
                  <a
                    href={q.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                  >
                    Lihat Gambar Soal <Eye size={16} />
                  </a>
                </div>

                {/* Status-specific content */}
                {q.status === "not_answerable" && (
                  <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-400 rounded-md">
                    <p className="font-semibold text-red-700">Alasan Admin:</p>
                    <p className="text-sm text-red-900">{q.admin_reason}</p>
                    <p className="text-xs text-red-600 mt-2">
                      Silakan perbaiki atau upload ulang dengan gambar yang
                      lebih jelas.
                    </p>
                  </div>
                )}

                {q.status === "resolved" && (
                  <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-400 rounded-md">
                    <p className="font-bold text-green-700 mb-2">
                      Jawaban Tersedia:
                    </p>
                    <p className="text-md text-gray-800 font-medium">
                      {q.simple_answer}
                    </p>
                    <div className="mt-3 flex justify-start space-x-3">
                      {problemLink ? (
                        <a
                          // Gunakan problemLink yang sudah di-mapping dengan hierarki
                          href={`/math${problemLink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-md bg-green-600 px-4 py-2 text-white text-sm hover:bg-green-700"
                        >
                          Lihat Pembahasan <ArrowRight size={16} />
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500">
                          Link pembahasan tidak lengkap/tersedia.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TanyaSoalPage;
