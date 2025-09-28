// src/pages/UserDashboardPage.jsx

import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate, Link } from "react-router-dom"; // ADDED Link
import toast from "react-hot-toast";
import { GaugeCircle, Loader, ChevronRight, RefreshCw } from "lucide-react"; // ADDED ChevronRight, RefreshCw
import MathRenderer from "../components/MathRenderer"; // ADDED MathRenderer
import formatTextForHTML from "../util/formatTextForHTML"; // ADDED formatTextForHTML

// Logika perhitungan statistik dipisahkan agar mudah dipanggil ulang (klien-side filtering)
const calculateAndSetStats = (dataToCalculate, setUserStats) => {
  const totalDistinctAttempted = dataToCalculate.length;
  const totalSolvedCorrectly = dataToCalculate.filter(
    (item) => item.is_correct === true
  ).length;
  const totalAllAttempts = dataToCalculate.reduce(
    (sum, item) => sum + item.attempts_count,
    0
  );

  const accuracy =
    totalDistinctAttempted > 0
      ? ((totalSolvedCorrectly / totalDistinctAttempted) * 100).toFixed(2) // Menggunakan toFixed(1)
      : 0;

  const avgAttemptsPerSolved =
    totalSolvedCorrectly > 0
      ? (totalAllAttempts / totalSolvedCorrectly).toFixed(2)
      : 0;

  setUserStats({
    totalDistinctAttempted,
    totalSolvedCorrectly,
    totalAllAttempts,
    accuracy,
    avgAttemptsPerSolved,
  });
};

const UserDashboardPage = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);

  // STATES BARU UNTUK REVIEW PROBLEMS
  const [problemsToReview, setProblemsToReview] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  // STATES UNTUK FILTER KATEGORI
  const [categoriesList, setCategoriesList] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [rawProgressData, setRawProgressData] = useState([]);

  // REF untuk pemetaan cepat problem_id ke category_id
  const problemToCategoryMapRef = useRef({});

  const navigate = useNavigate();

  // FUNGSI UTAMA: MENGAMBIL DATA AWAL (List Kategori dan Progres Mentah)
  const fetchInitialData = useCallback(async (currentSession) => {
    setLoading(true);
    if (!currentSession) {
      setLoading(false);
      return;
    }
    const userId = currentSession.user.id;

    try {
      // 1. Ambil List Kategori (hanya yang published) untuk Dropdown & Map Problem-Category
      const { data: hierarchyData, error: hierarchyError } = await supabase
        .from("categories")
        .select(
          `
                    category_id, category_name, id, is_published,
                    topics (
                        topic_id, 
                        subtopics (
                            subtopic_id,
                            problems (
                                problem_id
                            )
                        )
                    )
                `
        )
        .eq("is_published", true)
        .order("sort_order", { ascending: true }); // Filter: HANYA KATEGORI YANG PUBLISHED

      if (hierarchyError) throw hierarchyError;

      const flatCategories = [
        { id: "all", category_id: "all", category_name: "Semua Kategori" },
      ];
      const problemToCategoryMap = {};

      hierarchyData.forEach((category) => {
        flatCategories.push({
          id: category.category_id, // Menggunakan category_id sebagai nilai
          category_name: category.category_name,
        });

        // Membuat map problem_id -> category_id untuk pemfilteran
        category.topics.forEach((topic) => {
          topic.subtopics.forEach((subtopic) => {
            subtopic.problems.forEach((problem) => {
              problemToCategoryMap[problem.problem_id] = category.category_id;
            });
          });
        });
      });

      setCategoriesList(flatCategories);
      problemToCategoryMapRef.current = problemToCategoryMap;

      // 2. Fetch Raw User Progress Data
      const { data: progressData, error: progressError } = await supabase
        .from("user_progress")
        .select("problem_id, is_correct, attempts_count")
        .eq("user_id", userId);

      if (progressError) throw progressError;

      setRawProgressData(progressData); // Simpan data mentah

      // 3. Hitung Statistik Awal (untuk 'all' categories)
      calculateAndSetStats(progressData, setUserStats);
    } catch (error) {
      console.error("Error fetching initial dashboard data:", error);
      toast.error("Gagal memuat data dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Efek Sesi (Mengambil data awal setelah sesi dikonfirmasi)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (!initialSession) {
        toast("Silakan login untuk melihat Dashboard Anda.", { icon: "🔒" });
        navigate("/login", { replace: true });
        return;
      }
      fetchInitialData(initialSession);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        if (!newSession) {
          navigate("/login", { replace: true });
        } else {
          fetchInitialData(newSession);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchInitialData, navigate]);

  // Efek Pemfilteran Statistik dan Fetch Soal Perlu Ditinjau
  useEffect(() => {
    if (rawProgressData.length > 0) {
      let filteredProgress = rawProgressData;

      if (selectedCategoryId !== "all") {
        filteredProgress = rawProgressData.filter(
          (progress) =>
            problemToCategoryMapRef.current[progress.problem_id] ===
            selectedCategoryId
        );
      }

      // A. Hitung Ulang Statistik
      calculateAndSetStats(filteredProgress, setUserStats);

      // B. Identifikasi dan Muat Soal Perlu Ditinjau
      const reviewProblemIds = filteredProgress
        .filter((progress) => progress.is_correct === false)
        .map((progress) => progress.problem_id);

      setProblemsToReview([]); // Reset list sebelum fetch baru
      if (reviewProblemIds.length > 0) {
        setReviewLoading(true);

        const fetchReviewProblemDetails = async () => {
          try {
            const { data: problemDetails, error: detailsError } = await supabase
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
              .in("problem_id", reviewProblemIds);

            if (detailsError) throw detailsError;

            setProblemsToReview(problemDetails || []);
          } catch (e) {
            console.error("Error fetching review problem details:", e);
            toast.error("Gagal memuat detail soal untuk ditinjau.");
            setProblemsToReview([]);
          } finally {
            setReviewLoading(false);
          }
        };

        fetchReviewProblemDetails();
      } else {
        setReviewLoading(false);
      }
    }
  }, [selectedCategoryId, rawProgressData]);

  if (loading || !session) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-lg flex justify-center items-center h-64">
        <Loader className="animate-spin mr-2" size={24} /> Memuat Dashboard...
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="mb-4 flex items-center gap-3 text-3xl font-bold text-gray-800">
        Dashboard
      </h2>

      {/* START: FILTER KATEGORI */}
      <div className="mb-4">
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="rounded-md border p-2 text-gray-800"
        >
          {categoriesList.map((category) => (
            <option key={category.id} value={category.id}>
              {category.category_name}
            </option>
          ))}
        </select>
      </div>
      {/* END: FILTER KATEGORI */}

      {/* Widget A: Statistik Kunci (diperbarui berdasarkan filter) */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
            <p className="text-sm font-medium text-gray-500">
              Soal Dijawab Benar
            </p>
            <p className="text-4xl font-bold text-gray-900 mt-1">
              {userStats.totalSolvedCorrectly}
            </p>
            <p className="text-sm text-gray-500">
              dari {userStats.totalDistinctAttempted} soal unik dicoba
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
            <p className="text-sm font-medium text-gray-500">
              Akurasi Penguasaan
            </p>
            <p className="text-4xl font-bold text-blue-600 mt-1">
              {userStats.accuracy}%
            </p>
            <p className="text-sm text-gray-500">Rasio Benar/Total Soal Unik</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-500">
            <p className="text-sm font-medium text-gray-500">Rata-rata Upaya</p>
            <p className="text-4xl font-bold text-gray-900 mt-1">
              {userStats.avgAttemptsPerSolved}
            </p>
            <p className="text-sm text-gray-500">
              Percobaan per Soal Benar (Total: {userStats.totalAllAttempts}{" "}
              upaya)
            </p>
          </div>
        </div>
      )}

      {/* START: Widget C - Aksi Cepat & Soal Perlu Ditinjau */}
      <div className="mt-12 p-6 bg-white rounded-xl shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <RefreshCw size={24} className="text-red-500" /> Soal Perlu Ditinjau (
          {problemsToReview.length})
        </h3>
        <p className="mb-4 text-gray-600">
          Berikut adalah soal-soal yang sudah Anda coba namun status terakhirnya{" "}
          <b>masih salah</b> dalam kategori yang dipilih.
        </p>

        {reviewLoading ? (
          <div className="text-center text-gray-500 flex justify-center items-center py-4">
            <Loader className="animate-spin mr-2" size={20} /> Memuat soal...
          </div>
        ) : problemsToReview.length > 0 ? (
          <div className="space-y-3">
            {problemsToReview.map((problem, index) => {
              const hier = problem.subtopic.topic.category;
              // Path link ke halaman ProblemDetailPage
              const linkPath = `/latsol/${hier.category_id}/${problem.subtopic.topic.topic_id}/${problem.subtopic.subtopic_id}/${problem.problem_id}`;

              return (
                <Link
                  key={problem.problem_id}
                  to={linkPath}
                  className="block p-4 border border-red-200 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1 text-xs text-red-700 font-semibold">
                    <span className="text-gray-500 font-medium">
                      #{index + 1}
                    </span>
                    <span>{hier.category_name}</span>
                    <ChevronRight size={10} />
                    <span>{problem.subtopic.topic.topic_name}</span>
                    <ChevronRight size={10} />
                    <span className="font-bold">
                      {problem.subtopic.subtopic_name}
                    </span>
                    {problem.tag && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 ml-auto">
                        {problem.tag}
                      </span>
                    )}
                  </div>
                  {/* Pratinjau Singkat Soal */}
                  <div className="text-sm text-gray-800 prose max-w-none line-clamp-2">
                    <MathRenderer
                      text={formatTextForHTML(
                        problem.question_text.substring(0, 200) +
                          (problem.question_text.length > 200 ? "..." : "")
                      )}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">
            Tidak ada soal yang perlu ditinjau dalam kategori ini atau Anda
            belum mencoba soal apa pun.
          </p>
        )}
      </div>
      {/* END: Widget C */}
    </div>
  );
};

export default UserDashboardPage;
