// src/pages/UserDashboardPage.jsx

import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Loader,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Activity,
  Flame,
} from "lucide-react";
import MathRenderer from "../components/MathRenderer";
import formatTextForHTML from "../util/formatTextForHTML";
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";

// Logika perhitungan statistik
const calculateAndSetStats = (dataToCalculate, setUserStats) => {
  const totalDistinctAttempted = dataToCalculate.length;
  const solvedData = dataToCalculate.filter((item) => item.is_correct === true);
  const totalSolvedCorrectly = solvedData.length;

  // Logic for breakdown by attempts count
  const solvedOn1stAttempt = solvedData.filter(
    (item) => item.attempts_count === 1
  ).length;
  const solvedOn2ndAttempt = solvedData.filter(
    (item) => item.attempts_count === 2
  ).length;
  const solvedOn3rdAttempt = solvedData.filter(
    (item) => item.attempts_count === 3
  ).length;
  const solvedOn4thPlusAttempt = solvedData.filter(
    (item) => item.attempts_count >= 4
  ).length;

  const totalAllAttempts = dataToCalculate.reduce(
    (sum, item) => sum + item.attempts_count,
    0
  );

  const accuracy =
    totalDistinctAttempted > 0
      ? ((totalSolvedCorrectly / totalDistinctAttempted) * 100).toFixed(2)
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
    // BREAKDOWN FIELDS
    solvedOn1stAttempt,
    solvedOn2ndAttempt,
    solvedOn3rdAttempt,
    solvedOn4thPlusAttempt,
  });
};

// Utility function untuk menghitung Daily Streak
const calculateDailyStreak = (rawProgressData) => {
  if (!rawProgressData || rawProgressData.length === 0) return 0;

  // 1. Ambil tanggal sukses yang unik (dinormalisasi ke 00:00:00)
  const successDates = rawProgressData
    .filter((p) => p.is_correct && p.updated_at)
    .map((p) => new Date(p.updated_at));

  if (successDates.length === 0) return 0;

  const uniqueDayTimestamps = Array.from(
    new Set(
      successDates.map((date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    )
  ).sort((a, b) => b - a); // Urutkan menurun

  let currentStreak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  for (const timestamp of uniqueDayTimestamps) {
    if (timestamp === checkDate.getTime()) {
      currentStreak++;
      // Pindahkan checkDate mundur satu hari
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (timestamp < checkDate.getTime()) {
      // Tanggal aktivitas lebih lama dari yang diharapkan, streak terputus
      break;
    }
  }

  return currentStreak;
};

// Konstan untuk singkatan hari Indonesia (M=Minggu, S=Senin, S=Selasa, R=Rabu, K=Kamis, J=Jumat, S=Sabtu)
const INDO_DAY_ABBREVS = ["M", "S", "S", "R", "K", "J", "S"]; // Index 0 (Sun) to Index 6 (Sat)

// FUNGSI BARU: Mendapatkan status pengerjaan soal (solved/not) untuk N hari terakhir
const getRecentDailyStatus = (rawProgressData, N = 7) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Get unique successful dates (normalized to 00:00:00)
  const solvedDates = new Set(
    rawProgressData
      .filter((p) => p.is_correct && p.updated_at)
      .map((p) => {
        const d = new Date(p.updated_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
  );

  const statusList = [];

  // 2. Iterate backward for N days (from N-1 days ago up to today (i=0))
  for (let i = N - 1; i >= 0; i--) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const timestamp = checkDate.getTime();
    const dayIndex = checkDate.getDay(); // 0 (Sun) to 6 (Sat)

    const solved = solvedDates.has(timestamp);

    statusList.push({
      date: checkDate.toISOString().split("T")[0],
      dayLabel: i === 0 ? "Hari Ini" : i === 1 ? "Kemarin" : `${i} Hari Lalu`,
      dayAbbrev: INDO_DAY_ABBREVS[dayIndex], // BARU
      solved: solved,
    });
  }

  return statusList;
};

const UserDashboardPage = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);

  const [dailyStreak, setDailyStreak] = useState(0);
  const [recentDailyStatus, setRecentDailyStatus] = useState([]);

  // STATES UNTUK FILTER KATEGORI
  const [categoriesList, setCategoriesList] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [rawProgressData, setRawProgressData] = useState([]);

  // STATE BARU: Ringkasan Status Pertanyaan User
  const [questionStatusSummary, setQuestionStatusSummary] = useState(null);
  // STATE BARU: Daftar Aktivitas Terakhir
  const [recentActivity, setRecentActivity] = useState([]);

  // REF untuk pemetaan cepat problem_id ke category_id
  const problemToCategoryMapRef = useRef({});

  const navigate = useNavigate();

  // FUNGSI BARU: Ambil Status Pertanyaan User
  const fetchQuestionStatusSummary = useCallback(async (userId) => {
    if (!userId) return setQuestionStatusSummary(null);

    try {
      const { data, error } = await supabase
        .from("user_questions")
        .select("status")
        .eq("user_id", userId);

      if (error) throw error;

      const summary = data.reduce(
        (acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          acc.total = (acc.total || 0) + 1;
          return acc;
        },
        {
          pending: 0,
          answerable: 0,
          not_answerable: 0,
          resolved: 0,
          total: 0,
        }
      );

      setQuestionStatusSummary(summary);
    } catch (e) {
      console.error("Error fetching question summary:", e);
      // Tetap tampilkan 0 jika terjadi error
      setQuestionStatusSummary({
        pending: 0,
        answerable: 0,
        not_answerable: 0,
        resolved: 0,
        total: 0,
      });
    }
  }, []);

  // FUNGSI BARU: Ambil 5 Aktivitas Terakhir
  const fetchRecentActivity = useCallback(async (userId) => {
    if (!userId) return setRecentActivity([]);

    try {
      // Ambil 5 progres terakhir, dengan join ke problems dan hierarki subtopic
      const { data, error } = await supabase
        .from("user_progress")
        .select(
          `
                    is_correct, updated_at, attempts_count,
                    problems (
                        problem_id, 
                        question_text,
                        subtopic:subtopic_id (
                            subtopic_id,
                            topic:topic_id(
                                topic_id,
                                category:category_id(category_id)
                            )
                        )
                    )
                `
        )
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }) // Urutkan berdasarkan waktu update terbaru
        .limit(5);

      if (error) throw error;

      setRecentActivity(data || []);
    } catch (e) {
      console.error("Error fetching recent activity:", e);
      setRecentActivity([]);
    }
  }, []);

  // FUNGSI UTAMA: MENGAMBIL DATA AWAL
  const fetchInitialData = useCallback(
    async (currentSession) => {
      setLoading(true);
      if (!currentSession) {
        setLoading(false);
        return;
      }
      const userId = currentSession.user.id;

      try {
        // 1. Ambil List Kategori (hanya yang diperlukan untuk dropdown & filter)
        const { data: hierarchyData, error: hierarchyError } = await supabase
          .from("categories")
          .select(
            "category_id, category_name, id, is_published, topics(subtopics(problems(problem_id)))"
          )
          .eq("is_published", true)
          .order("sort_order", { ascending: true });

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
          .select("problem_id, is_correct, attempts_count, updated_at") // Pastikan updated_at diambil
          .eq("user_id", userId);

        if (progressError) throw progressError;

        setRawProgressData(progressData); // Simpan data mentah

        // Hitung Streak (BARU)
        const streak = calculateDailyStreak(progressData);
        setDailyStreak(streak);

        // Hitung Status Harian Terakhir (BARU untuk visualisasi)
        const recentStatus = getRecentDailyStatus(progressData, 7);
        setRecentDailyStatus(recentStatus);

        // 3. Hitung Statistik Awal (untuk 'all' categories)
        calculateAndSetStats(progressData, setUserStats);

        // 4. Panggil fetch status pertanyaan
        fetchQuestionStatusSummary(userId);

        // 5. Panggil fetch aktivitas terakhir (BARU)
        fetchRecentActivity(userId);
      } catch (error) {
        console.error("Error fetching initial dashboard data:", error);
        toast.error("Gagal memuat data dashboard.");
      } finally {
        setLoading(false);
      }
    },
    [fetchQuestionStatusSummary, fetchRecentActivity]
  );

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

  // Efek Pemfilteran Statistik
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

      // B. Hitung Ulang Status Harian Terakhir (Karena rawProgressData juga di-trigger update)
      const recentStatus = getRecentDailyStatus(rawProgressData, 7);
      setRecentDailyStatus(recentStatus);

      // C. Logika Identifikasi Soal Perlu Ditinjau Dihapus
    }
  }, [selectedCategoryId, rawProgressData]);

  if (loading || !session) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-lg flex justify-center items-center h-64">
        <Loader className="animate-spin mr-2" size={24} /> Memuat Dashboard...
      </div>
    );
  }

  // Data untuk Bar Chart
  const efficiencyData = userStats
    ? [
        {
          name: "1x Upaya",
          solved: userStats.solvedOn1stAttempt,
          color: "#10B981",
          label: "Efisiensi Tinggi",
        }, // Green
        {
          name: "2x Upaya",
          solved: userStats.solvedOn2ndAttempt,
          color: "#4F46E5",
          label: "Efisiensi Sedang",
        }, // Indigo/Blue
        {
          name: "3x Upaya",
          solved: userStats.solvedOn3rdAttempt,
          color: "#F59E0B",
          label: "Efisiensi Rendah",
        }, // Amber
        {
          name: "4+ Upaya",
          solved: userStats.solvedOn4thPlusAttempt,
          color: "#EF4444",
          label: "Perlu Perhatian",
        }, // Red
      ]
    : [];

  // Helper untuk format tanggal
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMinutes = Math.floor((now - past) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} menit lalu`;
    }
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} jam lalu`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} hari lalu`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="mb-4 flex items-center gap-3 text-3xl font-bold text-gray-800">
        Dashboard
      </h2>

      {/* START: FILTER KATEGORI (CHIPS BARU) */}
      <div className="mb-4 flex flex-wrap gap-2">
        {categoriesList.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategoryId(category.id)}
            className={`
              rounded-full px-4 py-1 text-sm font-semibold transition-colors duration-200
              ${
                selectedCategoryId === category.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-200 text-gray-700 hover:bg-blue-100 hover:text-blue-600"
              }
            `}
          >
            {category.category_name}
          </button>
        ))}
      </div>
      {/* END: FILTER KATEGORI (CHIPS BARU) */}

      {/* START: Daily Streak Widget (DIPERBARUI) */}
      {(dailyStreak > 0 || recentDailyStatus.length > 0) && (
        <div className="mb-6 p-6 bg-yellow-50 rounded-xl shadow-lg border-l-4 border-yellow-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Flame size={32} className="text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                Streak Harian Anda
              </p>
              <p className="text-3xl font-bold text-yellow-800">
                {dailyStreak} Hari Berturut-turut
              </p>

              {/* VISUALISASI MINI CALENDAR BARU */}
              {recentDailyStatus.length > 0 && (
                <div className="flex gap-2 mt-3 pt-2 border-t border-yellow-200">
                  {recentDailyStatus.map((day, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center text-xs"
                      title={`${day.dayAbbrev} (${day.dayLabel}): ${
                        day.solved ? "Selesai" : "Terlewat"
                      }`}
                    >
                      <span className="mb-1 font-semibold text-gray-600">
                        {day.dayAbbrev}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full shadow transition-all ${
                          day.solved ? "bg-yellow-500" : "bg-gray-300"
                        }`}
                      ></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <Link
            to="/latsol"
            className="rounded-md bg-yellow-600 px-4 py-2 text-white text-sm font-semibold hover:bg-yellow-700"
          >
            Lanjut Latihan
          </Link>
        </div>
      )}
      {/* END: Daily Streak Widget */}

      {/* Widget A: Statistik Kunci (4 Kolom) */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Column 1: Soal Dijawab Benar (Total Solved) */}
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

          {/* Column 2: Benar dalam 1 Upaya (METRIK BARU) */}
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-500">
            <p className="text-sm font-medium text-gray-500">
              Benar dalam 1 Upaya
            </p>
            <p className="text-4xl font-bold text-gray-900 mt-1">
              {userStats.solvedOn1stAttempt}
            </p>
            {userStats.totalSolvedCorrectly > 0 && (
              <p className="text-sm text-gray-500">
                (
                {(
                  (userStats.solvedOn1stAttempt /
                    userStats.totalSolvedCorrectly) *
                  100
                ).toFixed(1)}
                % dari Total Benar)
              </p>
            )}
          </div>

          {/* Column 3: Akurasi Penguasaan (Overall Accuracy) */}
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
            <p className="text-sm font-medium text-gray-500">
              Akurasi Penguasaan
            </p>
            <p className="text-4xl font-bold text-blue-600 mt-1">
              {userStats.accuracy}%
            </p>
            <p className="text-sm text-gray-500">Rasio Benar/Total Soal Unik</p>
          </div>

          {/* Column 4: Rata-rata Upaya (Average Attempts) */}
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

      {/* START: Statistik Efisiensi Penguasaan (Bar Chart) */}
      {userStats && userStats.totalSolvedCorrectly > 0 && (
        <div className="mt-6 p-6 bg-white rounded-xl shadow-lg border-l-4 border-indigo-500">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Efisiensi Penguasaan Soal Berdasarkan Upaya
          </h3>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-full md:w-1/3 p-4">
              <p className="text-sm font-semibold text-gray-700">
                Total Soal Dijawab Benar:
              </p>
              <p className="text-3xl font-bold text-green-600">
                {userStats.totalSolvedCorrectly}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Metrik ini mengukur seberapa efisien Anda menyelesaikan soal.
                Semakin tinggi bar "1x Upaya", semakin baik penguasaan Anda.
              </p>
            </div>

            <div className="w-full md:w-2/3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={efficiencyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#6B7280" />
                  <YAxis unit=" soal" stroke="#6B7280" domain={[0, "auto"]} />
                  <Tooltip
                    cursor={{ fill: "#E5E7EB" }}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #ccc",
                    }}
                    formatter={(value, name, props) => [
                      `${value} soal (${(
                        (value / userStats.totalSolvedCorrectly) *
                        100
                      ).toFixed(1)}%)`,
                      props.payload.label,
                    ]}
                  />
                  <Bar dataKey="solved" radius={[4, 4, 0, 0]}>
                    {efficiencyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
      {/* END: Statistik Efisiensi Penguasaan */}

      {/* START: Dual Column Widgets (Status & Activity) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Column 1: Status Pertanyaan User (DIUBAH KE VERTICAL STACK) */}
        {questionStatusSummary && (
          <div className="p-6 bg-white rounded-xl shadow-lg border-l-4 border-purple-500">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                Status Tanya Soal Anda ({questionStatusSummary.total})
              </h3>
              <Link
                to="/tanya-soal"
                className="text-sm font-semibold text-blue-600 hover:text-blue-800"
              >
                Lihat Detail
              </Link>
            </div>

            <div className="space-y-3">
              {" "}
              {/* <--- PERUBAHAN UTAMA DI SINI (space-y-3 menggantikan grid) */}
              {/* Pending */}
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                <p className="text-md font-semibold text-gray-700 flex items-center gap-2">
                  <Clock size={18} className="text-yellow-600" /> Menunggu
                </p>
                <p className="text-2xl font-bold text-yellow-700">
                  {questionStatusSummary.pending}
                </p>
              </div>
              {/* Answerable */}
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <p className="text-md font-semibold text-gray-700 flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" /> Siap Dijawab
                  Admin
                </p>
                <p className="text-2xl font-bold text-blue-700">
                  {questionStatusSummary.answerable}
                </p>
              </div>
              {/* Resolved */}
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                <p className="text-md font-semibold text-gray-700 flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-600" /> Selesai
                  Dibuat Soal
                </p>
                <p className="text-2xl font-bold text-green-700">
                  {questionStatusSummary.resolved}
                </p>
              </div>
              {/* Not Answerable */}
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                <p className="text-md font-semibold text-gray-700 flex items-center gap-2">
                  <XCircle size={18} className="text-red-600" /> Ditolak
                </p>
                <p className="text-2xl font-bold text-red-700">
                  {questionStatusSummary.not_answerable}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Column 2: Daftar Aktivitas Terakhir */}
        <div className="p-6 bg-white rounded-xl shadow-lg border-l-4 border-gray-400">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            Aktivitas Terakhir
          </h3>

          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => {
                const problem = activity.problems;
                const hier = problem?.subtopic?.topic?.category;

                // Pastikan semua ID hierarki tersedia
                const linkPath =
                  hier &&
                  problem?.subtopic?.topic?.topic_id &&
                  problem?.subtopic?.subtopic_id
                    ? `/latsol/${hier.category_id}/${problem.subtopic.topic.topic_id}/${problem.subtopic.subtopic_id}/${problem.problem_id}`
                    : "#";

                const statusColor = activity.is_correct
                  ? "text-green-600"
                  : "text-red-600";
                const statusText = activity.is_correct ? "Benar" : "Salah";
                const statusIcon = activity.is_correct ? (
                  <CheckCircle size={16} />
                ) : (
                  <XCircle size={16} />
                );

                return (
                  <Link
                    key={index}
                    to={linkPath}
                    className="flex items-center justify-between p-3 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        Soal: {problem.problem_id}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span className={statusColor}>
                          {statusText} (Upaya ke-{activity.attempts_count})
                        </span>
                        <span>&middot;</span>
                        <span>{formatTimeAgo(activity.updated_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={statusColor}>{statusIcon}</span>
                      <ChevronRight size={16} className="text-gray-400" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              Belum ada aktivitas soal yang tercatat.
            </p>
          )}
        </div>
      </div>
      {/* END: Dual Column Widgets (Status & Activity) */}
    </div>
  );
};

export default UserDashboardPage;
