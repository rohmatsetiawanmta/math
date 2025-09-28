import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import { ChevronRight } from "lucide-react";
import MathRenderer from "../components/MathRenderer.jsx";
import TeoriBox from "../components/TeoriBox.jsx";
import { toast } from "react-hot-toast";
import formatTextForHTML from "../util/formatTextForHTML.js";

const getYouTubeEmbedUrl = (url) => {
  if (!url) {
    return null;
  }
  const regex =
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/))([^&?/\s]+)/;
  const match = url.match(regex);
  if (match && match[1]) {
    const videoId = match[1];
    const urlParams = new URLSearchParams(url.split("?")[1]);
    const startTime = urlParams.get("t");
    let embedUrl = `https://www.youtube.com/embed/${videoId}`;
    if (startTime) {
      embedUrl += `?start=${parseInt(startTime, 10)}`;
    }
    return embedUrl;
  }
  return null;
};

const formatMckAnswer = (objAnswer) => {
  if (!objAnswer) return "";
  try {
    return Object.values(objAnswer).join(", ");
  } catch (e) {
    return "";
  }
};

const renderSolutionWithTheories = (solutionText, theories) => {
  if (!solutionText) {
    return null;
  }

  const formattedSolutionText = formatTextForHTML(solutionText);

  const regex = /\[teori_\d+\]/g;
  const parts = formattedSolutionText.split(regex);
  const markers = formattedSolutionText.match(regex) || [];

  return parts.map((part, index) => {
    const textElement = <MathRenderer key={`text-${index}`} text={part} />;

    if (index < parts.length - 1) {
      const marker = markers[index];
      const theoryIndex = parseInt(marker.match(/\d+/)[0], 10);
      const theory = theories[theoryIndex];

      if (theory) {
        return (
          <div key={`section-${index}`}>
            {textElement}
            <TeoriBox content={theory.content} />
          </div>
        );
      }
    }
    return textElement;
  });
};

// Helper function untuk membandingkan jawaban
const compareAnswers = (current, last) => {
  if (current === null || last === null) return current === last;
  if (typeof current === "string" && typeof last === "string") {
    return current === last;
  }
  // Untuk tipe non-primitif (array/object), gunakan JSON.stringify
  try {
    return JSON.stringify(current) === JSON.stringify(last);
  } catch (e) {
    return false;
  }
};

const ProblemDetailPage = () => {
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSolution, setShowSolution] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [session, setSession] = useState(null);
  const [theoriesWithOrder, setTheoriesWithOrder] = useState([]);

  // STATE untuk melacak progress
  const [userProgress, setUserProgress] = useState(null);
  // STATE untuk melacak jawaban yang terakhir diperiksa
  const [lastCheckedAnswer, setLastCheckedAnswer] = useState(null);

  const { categoryId, topicId, subtopicId, problemId } = useParams();
  const navigate = useNavigate();

  // Fungsi untuk memuat progres pengguna
  const fetchUserProgress = async (currentSession, currentProblemId) => {
    if (!currentSession || !currentProblemId) return;

    const { data, error } = await supabase
      .from("user_progress")
      .select("is_correct, attempts_count")
      .eq("user_id", currentSession.user.id)
      .eq("problem_id", currentProblemId)
      .single();

    if (data) {
      setUserProgress(data);
    } else {
      // Default state jika belum pernah dicoba
      setUserProgress({ is_correct: false, attempts_count: 0 });
    }
  };

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const { data, error } = await supabase
          .from("problems")
          .select(
            `
            *,
            answer_categories,
            subtopic:subtopic_id(
              subtopic_name,
              subtopic_id,
              topic:topic_id(
                topic_name,
                topic_id,
                category:category_id(
                  category_name,
                  category_id
                )
              )
            ),
            problem_theories(  
              sort_order,
              theories(content)
            )
          `
          )
          .eq("problem_id", problemId)
          .single();

        if (error) throw error;
        if (!data) throw new Error("Soal tidak ditemukan!");

        if (data.type === "mcma" && typeof data.answer === "string") {
          try {
            data.answer = JSON.parse(data.answer);
          } catch (e) {
            console.error("Failed to parse MCMA answer as JSON:", e);
            data.answer = [];
          }
        }
        if (data.type === "mck" && typeof data.answer === "string") {
          try {
            data.answer = JSON.parse(data.answer);
          } catch (e) {
            console.error("Failed to parse MCK answer as JSON:", e);
            data.answer = {};
          }
        }

        // Memproses data teori dan mengurutkannya
        const theories = data.problem_theories
          .map((link) => ({
            content: link.theories.content,
            sort_order: link.sort_order,
          }))
          .sort((a, b) => a.sort_order - b.sort_order);

        setTheoriesWithOrder(theories);
        setProblem(data);
        setFeedback(null);
      } catch (error) {
        console.error("Error fetching problem:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProblem();
  }, [problemId]);

  // Efek untuk mengisi userAnswers dengan jawaban yang benar jika sudah solved (Req 2)
  useEffect(() => {
    if (problem) {
      if (problem.type === "input" || problem.type === "mcq") {
        setUserAnswers("");
      } else if (problem.type === "mck") {
        setUserAnswers({});
      } else if (problem.type === "mcma") {
        setUserAnswers([]);
      }
    }

    // Override default state jika sudah benar
    if (problem && userProgress && userProgress.is_correct) {
      if (problem.type === "mcq" || problem.type === "input") {
        setUserAnswers(problem.answer);
      } else {
        // Untuk MCMA dan MCK (object/array), lakukan deep copy
        setUserAnswers(JSON.parse(JSON.stringify(problem.answer)));
      }
      // Set feedback agar section Jawaban Anda Benar muncul
      setFeedback("correct");
    }
  }, [problem, userProgress]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // Panggil fetch progress setelah session dan problem tersedia
      if (session && problem) {
        fetchUserProgress(session, problem.problem_id);
      }
    });
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session && problem) {
          fetchUserProgress(session, problem.problem_id);
        }
      }
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [problem]);

  const handleBackToProblems = () => {
    navigate(`/latsol/${categoryId}/${topicId}/${subtopicId}`);
  };

  const handleCheckAnswer = async () => {
    let isCorrect;

    // 1. Kunci jika sudah benar
    if (userProgress && userProgress.is_correct) {
      return;
    }

    // --- LOGIKA Req 3: Cek apakah jawaban tidak berubah ---
    let currentComparableAnswer;
    if (problem.type === "mcma" || problem.type === "mck") {
      currentComparableAnswer = JSON.stringify(userAnswers);
    } else {
      currentComparableAnswer = userAnswers;
    }

    if (compareAnswers(currentComparableAnswer, lastCheckedAnswer)) {
      // Req 1: Hapus toast
      setFeedback(userProgress?.is_correct ? "correct" : "incorrect");
      return;
    }
    // --- AKHIR LOGIKA Req 3 ---

    // 2. Logika penentuan isCorrect
    if (problem.type === "mck") {
      const problemAnswer = problem.answer;
      isCorrect = compareAnswers(userAnswers, problemAnswer);
    } else if (problem.type === "mcma") {
      const sortedUserAnswers = Array.isArray(userAnswers)
        ? [...userAnswers].sort()
        : [];
      const sortedProblemAnswers = Array.isArray(problem.answer)
        ? [...problem.answer].sort()
        : [];

      isCorrect =
        sortedUserAnswers.length === sortedProblemAnswers.length &&
        sortedUserAnswers.every(
          (val, index) => val === sortedProblemAnswers[index]
        );
    } else {
      isCorrect = userAnswers.toLowerCase() === problem.answer.toLowerCase();
    }

    // 3. LOGIKA: Menyimpan Progress
    let newAttemptsCount = (userProgress?.attempts_count || 0) + 1;
    let newIsCorrect = isCorrect;

    if (session) {
      const { error: progressError } = await supabase
        .from("user_progress")
        .upsert(
          {
            user_id: session.user.id,
            problem_id: problem.problem_id,
            is_correct: newIsCorrect,
            attempts_count: newAttemptsCount,
            updated_at: new Date().toISOString(),
          },
          { onConflict: ["user_id", "problem_id"] }
        );

      if (progressError) {
        console.error("Error saving progress:", progressError);
        toast.error("Gagal menyimpan progres jawaban.");
      } else {
        // Update local state setelah upsert sukses
        setUserProgress({
          is_correct: newIsCorrect,
          attempts_count: newAttemptsCount,
        });

        // Update lastCheckedAnswer state (hanya jika berhasil disubmit)
        setLastCheckedAnswer(currentComparableAnswer);

        // Tampilkan toast hanya jika BENAR
        if (newIsCorrect) {
          toast.success(`Jawaban Benar!`);
        }
      }
    }

    // 4. Set visual feedback
    setFeedback(isCorrect ? "correct" : "incorrect");
  };

  const handleToggleSolution = () => {
    setShowSolution(!showSolution);
  };

  const handleMcmaAnswerChange = (e) => {
    const { value, checked } = e.target;
    setUserAnswers((prevAnswers) => {
      const currentAnswers = Array.isArray(prevAnswers) ? prevAnswers : [];
      if (checked) {
        return [...currentAnswers, value];
      } else {
        return currentAnswers.filter((answer) => answer !== value);
      }
    });
  };

  const breadcrumb = problem ? (
    <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
      <Link to="/latsol" className="hover:text-gray-700">
        Latihan Soal
      </Link>
      <ChevronRight size={14} />
      <Link
        to={`/latsol/${problem.subtopic.topic.category.category_id}`}
        className="hover:text-gray-700"
      >
        {problem.subtopic.topic.category.category_name}
      </Link>
      <ChevronRight size={14} />
      <Link
        to={`/latsol/${problem.subtopic.topic.category.category_id}/${problem.subtopic.topic.topic_id}`}
        className="hover:text-gray-700"
      >
        {problem.subtopic.topic.topic_name}
      </Link>
      <ChevronRight size={14} />
      <Link
        to={`/latsol/${problem.subtopic.topic.category.category_id}/${problem.subtopic.topic.topic_id}/${problem.subtopic.subtopic_id}`}
        className="hover:text-gray-700"
      >
        {problem.subtopic.subtopic_name}
      </Link>
      <ChevronRight size={14} />
      <span className="text-gray-900 font-medium">{problem.problem_id}</span>
    </div>
  ) : null;

  useEffect(() => {
    if (window.MathJax && window.MathJax.Hub) {
      window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
    }
  }, [showSolution, userAnswers, handleCheckAnswer]);

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
          onClick={handleBackToProblems}
          className="mt-4 rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Kembali
        </button>
      </div>
    );
  }

  const isSolvedCorrectly = userProgress?.is_correct;
  const showFeedback = isSolvedCorrectly || feedback;
  // Jawaban benar ditampilkan hanya jika isSolvedCorrectly adalah TRUE atau feedback adalah 'correct'
  const shouldShowCorrectAnswer = isSolvedCorrectly || feedback === "correct";

  return (
    <div className="container mx-auto px-4 py-8">
      {breadcrumb}

      {/* Bagian Soal */}
      <div className="mt-6 rounded-lg bg-white p-6 shadow-md">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-xl font-bold text-gray-800">Soal</h2>
          {problem.tag && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              {problem.tag}
            </span>
          )}
        </div>
        <div className="prose max-w-none">
          <MathRenderer
            key={`q-${problem.id}`}
            text={formatTextForHTML(problem.question_text)}
          />
        </div>
      </div>

      {/* Bagian Pilihan Jawaban */}
      <div className="mt-6 rounded-lg bg-white p-6 shadow-md">
        <h3 className="mb-4 text-xl font-bold text-gray-800">
          {problem.type === "input"
            ? "Masukkan Jawaban"
            : problem.type === "mck"
            ? ""
            : "Pilihan Jawaban"}
        </h3>
        {(problem.type === "mcq" || problem.type === "mcma") &&
          problem.options && (
            <div className="space-y-4">
              {Object.keys(problem.options).map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center space-x-3 rounded-xl shadow bg-gray-50 p-4 transition-colors duration-200 hover:bg-gray-200"
                >
                  <input
                    type={problem.type === "mcq" ? "radio" : "checkbox"}
                    name="mc-option"
                    value={key}
                    checked={
                      problem.type === "mcq"
                        ? userAnswers === key
                        : Array.isArray(userAnswers) &&
                          userAnswers.includes(key)
                    }
                    onChange={(e) =>
                      problem.type === "mcq"
                        ? setUserAnswers(e.target.value)
                        : handleMcmaAnswerChange(e)
                    }
                    // Nonaktifkan input jika soal sudah benar
                    disabled={isSolvedCorrectly}
                    className={
                      problem.type === "mcq"
                        ? "h-5 w-5 text-blue-600"
                        : "h-4 w-4 text-blue-600 rounded"
                    }
                  />
                  <span className="prose max-w-none text-gray-700">
                    <MathRenderer
                      text={formatTextForHTML(
                        `${key}. ${problem.options[key]}`
                      )}
                    />
                  </span>
                </label>
              ))}
            </div>
          )}

        {problem.type === "input" && (
          <input
            type="text"
            value={userAnswers}
            onChange={(e) => setUserAnswers(e.target.value)}
            // Nonaktifkan input jika soal sudah benar
            disabled={isSolvedCorrectly}
            className="w-full rounded-md border p-3 focus:border-blue-500 focus:outline-none"
            placeholder="Ketik jawaban Anda di sini..."
          />
        )}

        {problem.type === "mck" && problem.options && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Pernyataan
                  </th>
                  {problem.answer_categories.map((cat, index) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {cat}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.keys(problem.options).map((key, index) => (
                  <tr key={key}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {problem.options[key]}
                    </td>
                    {problem.answer_categories.map((cat, catIndex) => (
                      <td
                        key={catIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
                      >
                        <input
                          type="radio"
                          name={`mck-option-${index}`}
                          value={cat}
                          checked={userAnswers[key] === cat}
                          onChange={(e) =>
                            setUserAnswers({
                              ...userAnswers,
                              [key]: e.target.value,
                            })
                          }
                          // Nonaktifkan input jika soal sudah benar
                          disabled={isSolvedCorrectly}
                          className="h-4 w-4 text-blue-600"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 flex gap-4">
        {/* Tombol Cek Jawaban (Hilang jika sudah benar) */}
        {!isSolvedCorrectly && (
          <button
            onClick={handleCheckAnswer}
            className="rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600 disabled:bg-gray-400"
            disabled={
              !userAnswers ||
              (problem.type === "mck" &&
                Object.keys(userAnswers).length !==
                  Object.keys(problem.options).length) ||
              (problem.type === "mcma" &&
                (!Array.isArray(userAnswers) || userAnswers.length === 0))
            }
          >
            Cek Jawaban
          </button>
        )}
      </div>

      {/* Feedback Section (Tampil jika sudah ada jawaban yang benar atau baru saja submit) */}
      {showFeedback && (
        <div
          className={`mt-6 p-6 rounded-lg shadow-md border-l-4 ${
            shouldShowCorrectAnswer
              ? "border-green-500 bg-green-50"
              : "border-red-500 bg-red-50"
          }`}
        >
          <h3
            className={`mb-2 text-xl font-bold ${
              shouldShowCorrectAnswer ? "text-green-700" : "text-red-700"
            }`}
          >
            {shouldShowCorrectAnswer
              ? "Jawaban Anda Benar!"
              : "Jawaban Anda Salah"}
          </h3>

          {/* Tampilkan Jawaban Benar hanya jika sudah benar */}
          {shouldShowCorrectAnswer && (
            <>
              <p className="text-sm text-gray-600">
                Jawaban yang benar adalah:
              </p>
              <div className="prose max-w-none text-gray-900 font-bold">
                <MathRenderer
                  text={
                    problem.type === "mck"
                      ? formatMckAnswer(problem.answer)
                      : Array.isArray(problem.answer)
                      ? problem.answer.join(", ")
                      : problem.answer
                  }
                />
              </div>

              {/* Tombol Lihat Pembahasan di bawah section Jawaban Anda Benar */}
              <div className="mt-4 flex justify-start">
                <button
                  onClick={handleToggleSolution}
                  className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                  {showSolution ? "Sembunyikan Pembahasan" : "Lihat Pembahasan"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Solution Section (Hanya tampil jika showSolution TRUE) */}
      {showSolution && isSolvedCorrectly && (
        <div className="mt-6 p-6 rounded-lg border-l-4 border-sky-500 bg-sky-50 shadow-md">
          {problem.has_solution ? (
            session || problem.is_public ? (
              <>
                <h3 className="mb-2 text-xl font-bold text-sky-700">
                  Pembahasan
                </h3>
                <div className="prose max-w-none text-sky-900">
                  {renderSolutionWithTheories(
                    problem.solution_text,
                    theoriesWithOrder
                  )}
                </div>
                {problem.video_link && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-sky-700 mb-2">
                      Video Pembahasan
                    </h4>
                    <div className="flex justify-center">
                      <iframe
                        width="640"
                        height="360"
                        src={getYouTubeEmbedUrl(problem.video_link)}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="rounded-lg shadow-lg"
                      ></iframe>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-gray-600 font-medium">
                <a href="/math/login" className="underline text-blue-600">
                  Login atau daftar akun
                </a>{" "}
                untuk dapat melihat pembahasan.
              </p>
            )
          ) : (
            <p className="text-center text-gray-600 font-medium">
              Pembahasan untuk soal ini belum tersedia.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
export default ProblemDetailPage;
