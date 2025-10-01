// src/pages/admin/UserQuestionManagementPage.jsx

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Clock, Eye, Edit, Loader } from "lucide-react";

// Helper function to get status colors
const getStatusDisplay = (status) => {
  switch (status) {
    case "pending":
      return {
        text: "Menunggu",
        color: "text-yellow-600",
        bg: "bg-yellow-100",
      };
    case "answerable":
      return {
        text: "Siap Dijawab",
        color: "text-blue-600",
        bg: "bg-blue-100",
      };
    case "not_answerable":
      return { text: "Ditolak", color: "text-red-600", bg: "bg-red-100" };
    case "resolved":
      return { text: "Selesai", color: "text-green-600", bg: "bg-green-100" };
    default:
      return { text: "Unknown", color: "text-gray-600", bg: "bg-gray-100" };
  }
};

const UserQuestionManagementPage = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // <-- Diubah default ke "all"

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [formStatus, setFormStatus] = useState("");
  const [formAdminReason, setFormAdminReason] = useState("");
  const [formProblemId, setFormProblemId] = useState("");
  const [formSimpleAnswer, setFormSimpleAnswer] = useState("");

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase // Menggunakan variabel query
        .from("user_questions")
        .select(
          `
            id, user_id, user_question_id, image_url, status, admin_reason, problem_id, simple_answer, created_at,
            users(email)
        `
        );

      // Filter bersyarat: hanya terapkan filter jika bukan "all"
      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query.order("created_at", {
        ascending: true,
      });

      if (error) throw error;
      setQuestions(data);
    } catch (e) {
      console.error("Error fetching questions:", e);
      setError(e.message);
      toast.error("Gagal memuat pertanyaan!");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleOpenModal = (question) => {
    setCurrentQuestion(question);
    setFormStatus(question.status);
    setFormAdminReason(question.admin_reason || "");
    setFormProblemId(question.problem_id || "");
    setFormSimpleAnswer(question.simple_answer || "");
    setIsModalOpen(true);
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    if (!currentQuestion) return;

    const payload = {
      status: formStatus,
      admin_reason: formStatus === "not_answerable" ? formAdminReason : null,
      problem_id: formStatus === "resolved" ? formProblemId : null,
      simple_answer: formStatus === "resolved" ? formSimpleAnswer : null,
      // Reset fields if status is changed away from where they are relevant
      ...(formStatus !== "resolved" && {
        problem_id: null,
        simple_answer: null,
      }),
      ...(formStatus !== "not_answerable" && { admin_reason: null }),
    };

    if (formStatus === "resolved" && (!formProblemId || !formSimpleAnswer)) {
      toast.error(
        "Problem ID dan Jawaban Sederhana harus diisi untuk status 'Resolved'."
      );
      return;
    }

    if (formStatus === "not_answerable" && !formAdminReason) {
      toast.error("Alasan harus diisi untuk status 'Ditolak'.");
      return;
    }

    const { error } = await supabase
      .from("user_questions")
      .update(payload)
      .eq("id", currentQuestion.id);

    if (error) {
      console.error("Error updating question:", error);
      toast.error("Gagal memperbarui pertanyaan!");
    } else {
      toast.success("Pertanyaan berhasil diperbarui!");
      setIsModalOpen(false);
      fetchQuestions(); // Reload list
    }
  };

  const handleStatusChange = (newStatus) => {
    setFormStatus(newStatus);
  };

  const getProblemLink = (problemId) => {
    if (!problemId || problemId.length !== 11 || !problemId.startsWith("PR-"))
      return null;
    // Note: Link ini bersifat parsial dan hanya memuat problemId.
    // Full link memerlukan fetch hierarki (Category, Topic, Subtopic ID)
    // Untuk saat ini, kita gunakan placeholder link yang unik.
    return `/math/latsol/PR-${problemId.substring(3, 11)}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-lg flex justify-center items-center h-64">
        <Loader className="animate-spin mr-2" size={24} /> Memuat daftar
        pertanyaan...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-red-500">
        Gagal memuat pertanyaan: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="mb-6 text-3xl font-bold text-gray-800 flex items-center gap-3">
        Manajemen Pertanyaan User ({questions.length})
      </h2>

      {/* Filter Buttons */}
      <div className="mb-4 flex space-x-3">
        {/* Tambahkan "all" di awal array filter */}
        {["all", "pending", "answerable", "not_answerable", "resolved"].map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-md font-semibold text-sm capitalize transition-colors ${
                filter === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          )
        )}
      </div>

      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Waktu
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Pelapor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Gambar
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {questions.map((q) => {
              const statusDisplay = getStatusDisplay(q.status);
              return (
                <tr
                  key={q.id}
                  className={`${q.status === "pending" ? "bg-yellow-50" : ""}`}
                >
                  <td className="px-6 py-4 text-sm font-mono">
                    {q.user_question_id}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(q.created_at).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {q.users?.email || "User Dihapus"}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.bg} ${statusDisplay.color}`}
                    >
                      {statusDisplay.text}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <a
                      href={q.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye size={20} className="mx-auto" />
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenModal(q)}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      <Edit size={20} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL EDIT STATUS */}
      {isModalOpen && currentQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold">
                Moderasi Soal: {currentQuestion.user_question_id}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <a
              href={currentQuestion.image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 mb-4 hover:underline text-sm"
            >
              Lihat Gambar Soal (Klik)
            </a>
            <form onSubmit={handleUpdateQuestion} className="space-y-4">
              {/* Status Pilihan */}
              <div className="flex flex-col">
                <label className="mb-1 text-sm font-bold text-gray-700">
                  Status Moderasi
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="rounded-md border p-2"
                >
                  <option value="pending">
                    0 - Pending (Menunggu Tinjauan)
                  </option>
                  <option value="answerable">
                    1 - Answerable (Bisa Dijawab)
                  </option>
                  <option value="not_answerable">
                    2 - Not Answerable (Ditolak)
                  </option>
                  <option value="resolved">
                    3 - Resolved (Selesai Dibuat Soal)
                  </option>
                </select>
              </div>

              {/* Input Alasan (Jika Ditolak) */}
              {formStatus === "not_answerable" && (
                <div className="space-y-3 p-3 bg-red-50 border-l-4 border-red-400 rounded-md">
                  <label className="mb-1 text-sm font-bold text-red-700">
                    Alasan Penolakan
                  </label>
                  <textarea
                    value={formAdminReason}
                    onChange={(e) => setFormAdminReason(e.target.value)}
                    className="w-full rounded-md border border-red-500 p-2"
                    rows="3"
                    placeholder="Contoh: Gambar buram, soal tidak lengkap, atau bukan soal matematika."
                    required
                  />
                </div>
              )}

              {/* Input Problem ID dan Jawaban Sederhana (Jika Resolved) */}
              {formStatus === "resolved" && (
                <div className="space-y-3 p-3 bg-green-50 border-l-4 border-green-400 rounded-md">
                  <div className="flex flex-col">
                    <label className="mb-1 text-sm font-bold text-gray-700">
                      Problem ID
                    </label>
                    <input
                      type="text"
                      value={formProblemId}
                      onChange={(e) => setFormProblemId(e.target.value)}
                      className="w-full rounded-md border p-2 font-mono"
                      placeholder="Contoh: PR-A1B2C3D4"
                      required
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="mb-1 text-sm font-bold text-gray-700">
                      Jawaban Singkat
                    </label>
                    <input
                      type="text"
                      value={formSimpleAnswer}
                      onChange={(e) => setFormSimpleAnswer(e.target.value)}
                      className="w-full rounded-md border p-2"
                      placeholder="Jawaban akhir, ex: 15. Gunakan format MathJax: $E=mc^2$"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md bg-gray-300 px-4 py-2 hover:bg-gray-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserQuestionManagementPage;
