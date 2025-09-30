import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import toast from "react-hot-toast";
import MathRenderer from "../../components/MathRenderer.jsx";
import ImageUploaderModal from "../../components/ImageUploaderModal.jsx";
import {
  Edit,
  Trash2,
  Plus,
  X,
  Copy,
  List,
  ListOrdered,
  ImagePlus,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import formatTextForHTML from "../../util/formatTextForHTML.js";

const ProblemManagementPage = () => {
  const [categories, setCategories] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  const [problems, setProblems] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedSubtopic, setSelectedSubtopic] = useState("");

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isTheoryModalOpen, setIsTheoryModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [form, setForm] = useState({
    question_text: "",
    answer: "",
    solution_text: "",
    video_link: "",
    type: "input",
    options: [],
    tag: "",
    answer_categories: ["Benar", "Salah"],
    has_solution: false,
    is_public: false,
  });

  const [availableTheories, setAvailableTheories] = useState([]);
  const [selectedTheories, setSelectedTheories] = useState([]);

  const [formCategory, setFormCategory] = useState("");
  const [formTopic, setFormTopic] = useState("");
  const [formSubtopic, setFormSubtopic] = useState("");

  // State baru untuk modal teori
  const [theoryModalCategories, setTheoryModalCategories] = useState([]);
  const [theoryModalTopics, setTheoryModalTopics] = useState([]);
  const [theoryModalSubtopics, setTheoryModalSubtopics] = useState([]);
  const [theoryModalCategory, setTheoryModalCategory] = useState("");
  const [theoryModalTopic, setTheoryModalTopic] = useState("");
  const [theoryModalSubtopic, setTheoryModalSubtopic] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProblems();
  }, [selectedSubtopic]);

  // Efek baru untuk memuat teori saat subtopik di modal teori berubah
  useEffect(() => {
    const fetchAvailableTheories = async () => {
      if (!theoryModalSubtopic) {
        setAvailableTheories([]);
        return;
      }
      const { data, error } = await supabase
        .from("theories")
        .select("id, theory_id, content")
        .eq("subtopic_id", theoryModalSubtopic)
        .order("sort_order", { ascending: true });
      if (error) {
        console.error(error);
        toast.error("Gagal memuat daftar teori!");
      }
      setAvailableTheories(data || []);
    };
    fetchAvailableTheories();
  }, [theoryModalSubtopic]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      console.error(error);
      toast.error("Gagal memuat kategori!");
    } else {
      setCategories(data);
      setTheoryModalCategories(data);
    }
  };

  const fetchTopics = async (categoryId) => {
    if (!categoryId) {
      setTopics([]);
      setSubtopics([]);
      setSelectedTopic("");
      setSelectedSubtopic("");
      return;
    }
    const { data, error } = await supabase
      .from("topics")
      .select("*")
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error(error);
    }
    setTopics(data);
    setSelectedTopic("");
    setSelectedSubtopic("");
  };

  const fetchSubtopics = async (topicId) => {
    if (!topicId) {
      setSubtopics([]);
      setSelectedSubtopic("");
      return;
    }
    const { data, error } = await supabase
      .from("subtopics")
      .select("*")
      .eq("topic_id", topicId)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error(error);
    }
    setSubtopics(data);
    setSelectedSubtopic("");
  };

  const fetchProblems = async () => {
    setLoading(true);
    let query = supabase
      .from("problems")
      .select("*")
      .order("id", { ascending: true });
    if (selectedSubtopic) {
      query = query.eq("subtopic_id", selectedSubtopic);
    }
    const { data, error } = await query;
    if (error) {
      console.error(error);
      toast.error("Gagal memuat soal!");
    } else {
      setProblems(data);
    }
    setLoading(false);
  };

  const fetchAncestors = async (subtopicId) => {
    if (!subtopicId) return null;
    const { data, error } = await supabase
      .from("subtopics")
      .select(
        `
        id,
        topic_id,
        topics (
          id,
          category_id,
          categories (id)
        )
      `
      )
      .eq("id", subtopicId)
      .single();

    if (error) {
      console.error(error);
      return null;
    }
    return {
      subtopicId: data.id,
      topicId: data.topics.id,
      categoryId: data.topics.category_id,
    };
  };

  const handleOpenModal = async (item = null) => {
    setCurrentItem(item);
    let initialOptions = [];
    if (item?.type === "mcq" || item?.type === "mcma") {
      initialOptions = item.options
        ? Object.entries(item.options).map(([key, value]) => ({ key, value }))
        : [];
      if (item?.type === "mcma") {
        let answerArray = [];
        if (Array.isArray(item.answer)) {
          answerArray = item.answer;
        } else if (typeof item.answer === "string") {
          try {
            answerArray = JSON.parse(item.answer);
          } catch (error) {
            console.error("Gagal parse jawaban MCMA:", error);
            answerArray = [];
          }
        }
        initialOptions = initialOptions.map((option) => ({
          ...option,
          is_correct: answerArray.includes(option.key),
        }));
      }
    } else if (item?.type === "mck") {
      let parsedAnswer = {};
      if (item.answer && typeof item.answer === "string") {
        try {
          parsedAnswer = JSON.parse(item.answer);
        } catch (error) {
          console.error("Failed to parse MCK answer:", error);
        }
      }
      initialOptions = item.options
        ? Object.entries(item.options).map(([key, statement]) => ({
            statement,
            answer: parsedAnswer[key],
          }))
        : [];
    }

    const initialForm = item
      ? {
          ...item,
          options: initialOptions,
          tag: item.tag || "",
          answer_categories: item.answer_categories || ["Benar", "Salah"],
          has_solution: item.has_solution || false,
          is_public: item.is_public || false,
        }
      : {
          subtopic_id: selectedSubtopic,
          tag: "",
          type: "input",
          options: [],
          question_text: "",
          answer: "",
          solution_text: "",
          video_link: "",
          answer_categories: ["Benar", "Salah"],
          has_solution: false,
          is_public: false,
        };

    if (!item && initialForm.type === "mcma") {
      initialForm.options = [{ key: "A", value: "", is_correct: false }];
    } else if (!item && initialForm.type === "mcq") {
      initialForm.options = [{ key: "A", value: "" }];
    } else if (!item && initialForm.type === "mck") {
      initialForm.options = [{ statement: "", answer: "" }];
    }

    setForm(initialForm);
    setIsModalOpen(true);

    if (item) {
      const ancestors = await fetchAncestors(item.subtopic_id);
      if (ancestors) {
        setFormCategory(ancestors.categoryId);
        await fetchModalTopics(ancestors.categoryId, ancestors.topicId);
      }
      setFormSubtopic(item.subtopic_id);
      setTheoryModalSubtopic(item.subtopic_id);

      const { data: theoryLinks, error: theoryError } = await supabase
        .from("problem_theories")
        .select("theory_id, sort_order")
        .eq("problem_id", item.id)
        .order("sort_order", { ascending: true });

      if (theoryError) {
        console.error(theoryError);
      }
      // Memuat konten teori untuk teori yang sudah dipilih
      const theoriesWithContent = await Promise.all(
        (theoryLinks || []).map(async (link) => {
          const { data: theoryData, error: theoryContentError } = await supabase
            .from("theories")
            .select("content")
            .eq("id", link.theory_id)
            .single();
          if (theoryContentError) {
            console.error(
              "Failed to fetch theory content:",
              theoryContentError
            );
            return { ...link, content: "Konten tidak ditemukan" };
          }
          return { ...link, content: theoryData.content };
        })
      );
      setSelectedTheories(theoriesWithContent);
    } else {
      setFormCategory(selectedCategory);
      setFormTopic(selectedTopic);
      setFormSubtopic(selectedSubtopic);
      setTheoryModalSubtopic(selectedSubtopic);
      setSelectedTheories([]);
    }
  };

  const fetchModalTopics = async (categoryId, initialTopicId = null) => {
    if (!categoryId) return;
    const { data: topicsData, error: topicsError } = await supabase
      .from("topics")
      .select("*")
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: true });
    if (topicsError) {
      console.error(topicsError);
      return;
    }
    setTopics(topicsData);
    if (initialTopicId) {
      setFormTopic(initialTopicId);
      await fetchModalSubtopics(initialTopicId);
    } else {
      setFormTopic("");
      setSubtopics([]);
    }
  };

  const fetchModalSubtopics = async (topicId) => {
    if (!topicId) return;
    const { data: subtopicsData, error: subtopicsError } = await supabase
      .from("subtopics")
      .select("*")
      .eq("topic_id", topicId)
      .order("sort_order", { ascending: true });
    if (subtopicsError) {
      console.error(subtopicsError);
      return;
    }
    setSubtopics(subtopicsData);
  };

  // Fungsi baru untuk modal teori
  const fetchTheoryModalTopics = async (categoryId, initialTopicId = null) => {
    if (!categoryId) {
      setTheoryModalTopics([]);
      setTheoryModalSubtopics([]);
      setTheoryModalTopic("");
      setTheoryModalSubtopic("");
      return;
    }
    const { data: topicsData, error: topicsError } = await supabase
      .from("topics")
      .select("*")
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: true });
    if (topicsError) {
      console.error(topicsError);
      return;
    }
    setTheoryModalTopics(topicsData);
    if (initialTopicId) {
      setTheoryModalTopic(initialTopicId);
      await fetchTheoryModalSubtopics(initialTopicId);
    } else {
      setTheoryModalTopic("");
      setTheoryModalSubtopics([]);
    }
  };

  const fetchTheoryModalSubtopics = async (topicId) => {
    if (!topicId) {
      setTheoryModalSubtopics([]);
      setTheoryModalSubtopic("");
      return;
    }
    const { data: subtopicsData, error: subtopicsError } = await supabase
      .from("subtopics")
      .select("*")
      .eq("topic_id", topicId)
      .order("sort_order", { ascending: true });
    if (subtopicsError) {
      console.error(subtopicsError);
      return;
    }
    setTheoryModalSubtopics(subtopicsData);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentItem(null);
    setForm({
      question_text: "",
      answer: "",
      solution_text: "",
      video_link: "",
      type: "input",
      options: [],
      tag: "",
      answer_categories: ["Benar", "Salah"],
      has_solution: false,
      is_public: false,
    });
    setFormCategory("");
    setFormTopic("");
    setFormSubtopic("");
    setSelectedTheories([]);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const updatedValue = type === "checkbox" ? checked : value;
    let updatedForm = { ...form, [name]: updatedValue };

    if (name === "type") {
      if (value === "mcq" || value === "mcma") {
        if (!form.options.length) {
          updatedForm.options = [{ key: "A", value: "", is_correct: false }];
        }
      } else if (value === "mck") {
        if (!form.options.length) {
          updatedForm.options = [{ statement: "", answer: "" }];
        }
      } else {
        updatedForm.options = [];
      }
    }

    setForm(updatedForm);
  };

  // FUNGSI HANDLE UNTUK TOMBOL P-Q (Tabel Kuantitas) - DIMODIFIKASI
  const handleInsertTable = () => {
    // 1. Teks Intro Standar P-Q (Markdown/MathJax supported)
    const pqIntroText =
      "Berdasarkan informasi yang diberikan, manakah hubungan antara kuantitas $P$ dan $Q$ berikut yang benar?";

    // 2. Struktur Tabel P-Q
    const tableHTML =
      '\n\n<table style="border: 1px solid"><tr style="border: 1px solid; height: 30px"><th style="border: 1px solid; width:100px">$P$</th><th style="width:100px">$Q$</th></tr><tr style="height:40px"><td style="border: 1px solid; text-align:center">...</td><td style="text-align:center">...</td></tr></table>';

    // 3. Opsi Standar P-Q (4 opsi untuk MCQ)
    const pqOptions = [
      { key: "A", value: "Kuantitas $P$ lebih besar daripada kuantitas $Q$." },
      { key: "B", value: "Kuantitas $Q$ lebih besar daripada kuantitas $P$." },
      { key: "C", value: "Kuantitas $P$ sama dengan kuantitas $Q$." },
      {
        key: "D",
        value: "Hubungan antara kuantitas $P$ dan $Q$ tidak dapat ditentukan.",
      },
    ];

    const newQuestionText = pqIntroText + tableHTML;

    setForm({
      ...form,
      type: "mcq", // Auto-change type to MCQ
      question_text: newQuestionText, // Set new question text
      options: pqOptions, // Set 4 fixed options
      answer: "", // Reset answer
      tag: (form.tag ? form.tag + ", " : "") + "P-Q",
    });
  };

  // FUNGSI HANDLE UNTUK TOMBOL DS (Data Sufficiency)
  const handleInsertDS = () => {
    // 1. Opsi Standar Data Sufficiency
    const dsOptions = [
      {
        key: "A",
        value:
          "Pernyataan (1) SAJA cukup untuk menjawab pertanyaan, tetapi pernyataan (2) SAJA tidak cukup.",
      },
      {
        key: "B",
        value:
          "Pernyataan (2) SAJA cukup untuk menjawab pertanyaan, tetapi pernyataan (1) SAJA tidak cukup.",
      },
      {
        key: "C",
        value:
          "DUA pernyataan BERSAMA-SAMA cukup untuk menjawab pertanyaan, tetapi SATU pernyataan SAJA tidak cukup.",
      },
      {
        key: "D",
        value:
          "Pernyataan (1) SAJA cukup untuk menjawab pertanyaan, dan pernyataan (2) SAJA cukup.",
      },
      {
        key: "E",
        value: "DUA pernyataan TIDAK CUKUP untuk menjawab pertanyaan.",
      },
    ];

    // 2. Template Teks Soal
    const dsQuestionText =
      "**Pertanyaan:** [Tulis pertanyaan utama di sini]\n\n" +
      "**Pernyataan:**\n" +
      "1. [Tulis Pernyataan 1 di sini]\n" +
      "2. [Tulis Pernyataan 2 di sini]";

    setForm({
      ...form,
      type: "mcq", // Set tipe soal menjadi MCQ
      question_text: dsQuestionText, // Set teks soal dengan template DS
      options: dsOptions, // Set 5 opsi standar
      answer: "", // Reset kunci jawaban
      tag: (form.tag ? form.tag + ", " : "") + "DS", // Tambahkan tag DS
    });
  };
  // AKHIR FUNGSI BARU DS

  const handleInsertBold = () => {
    setForm({
      ...form,
      question_text: (form.question_text || "") + "**teks**",
    });
  };

  const handleInsertItalic = () => {
    setForm({
      ...form,
      question_text: (form.question_text || "") + "*teks*",
    });
  };

  const handleInsertUnderline = () => {
    const formattedText = "<u>teks</u>";
    setForm({
      ...form,
      question_text: (form.question_text || "") + formattedText,
    });
  };

  const handleInsertBulletList = () => {
    const bulletListHTML =
      '<ul style="list-style-type: disc; margin-left:1em"><li>...</li><li>...</li></ul>';
    setForm({
      ...form,
      question_text: (form.question_text || "") + bulletListHTML,
    });
  };

  const handleInsertNumberedList = () => {
    const numberedListHTML =
      '<ol style="list-style-type: roman; margin-left:1em"><li>...</li><li>...</li></ol>';
    setForm({
      ...form,
      question_text: (form.question_text || "") + numberedListHTML,
    });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...form.options];
    newOptions[index].value = value;
    setForm({ ...form, options: newOptions });
  };

  const handleMcmaCorrectAnswerChange = (index, isCorrect) => {
    const newOptions = [...form.options];
    newOptions[index].is_correct = isCorrect;
    setForm({ ...form, options: newOptions });
  };

  const handleAddOption = () => {
    const nextKey = String.fromCharCode(65 + form.options.length);
    setForm({
      ...form,
      options: [
        ...form.options,
        { key: nextKey, value: "", is_correct: false },
      ],
    });
  };

  const handleRemoveOption = (index) => {
    const newOptions = form.options.filter((_, i) => i !== index);
    const rekeyedOptions = newOptions.map((option, i) => ({
      ...option,
      key: String.fromCharCode(65 + i),
    }));
    setForm({ ...form, options: rekeyedOptions });
  };

  const handleAddStatement = () => {
    setForm({
      ...form,
      options: [...form.options, { statement: "", answer: "" }],
    });
  };

  const handleStatementChange = (index, value) => {
    const newOptions = [...form.options];
    newOptions[index].statement = value;
    setForm({ ...form, options: newOptions });
  };

  const handleStatementAnswerChange = (index, value) => {
    const newOptions = [...form.options];
    newOptions[index].answer = value;
    setForm({ ...form, options: newOptions });
  };

  const handleRemoveStatement = (index) => {
    const newOptions = form.options.filter((_, i) => i !== index);
    setForm({ ...form, options: newOptions });
  };

  const handleCategoryLabelChange = (index, value) => {
    const newCategories = [...form.answer_categories];
    newCategories[index] = value;
    setForm({ ...form, answer_categories: newCategories });
  };

  const handleAddCategory = () => {
    setForm({
      ...form,
      answer_categories: [...form.answer_categories, ""],
    });
  };

  const handleRemoveCategory = (index) => {
    if (form.answer_categories.length > 2) {
      const newCategories = form.answer_categories.filter(
        (_, i) => i !== index
      );
      setForm({ ...form, answer_categories: newCategories });
    } else {
      toast.error("Minimal harus ada 2 kategori jawaban.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let result;
    const payload = { ...form };

    if (payload.type === "mcq" || payload.type === "mcma") {
      const optionsObject = Array.isArray(payload.options)
        ? payload.options.reduce((acc, option) => {
            if (option.key) {
              acc[option.key] = option.value;
            }
            return acc;
          }, {})
        : {};
      payload.options = optionsObject;

      if (payload.type === "mcma") {
        const correctAnswers = Array.isArray(form.options)
          ? form.options.filter((opt) => opt.is_correct).map((opt) => opt.key)
          : [];
        payload.answer = correctAnswers;
      } else if (payload.type === "mcq") {
        // Logika untuk MCQ
      }
    } else if (payload.type === "mck" && payload.options) {
      const optionsObject = {};
      const answerObject = {};
      Array.isArray(payload.options) &&
        payload.options.forEach((option, index) => {
          optionsObject[`statement_${index + 1}`] = option.statement;
          answerObject[`statement_${index + 1}`] = option.answer;
        });
      payload.options = optionsObject;
      payload.answer = JSON.stringify(answerObject);
    }

    if (formSubtopic) {
      payload.subtopic_id = formSubtopic;
    }

    if (!currentItem) {
      const problemId =
        "PR-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      payload.problem_id = problemId;
      result = await supabase.from("problems").insert(payload).select();
    } else {
      result = await supabase
        .from("problems")
        .update(payload)
        .eq("id", currentItem.id)
        .select();
    }

    if (result.error) {
      toast.error(`Gagal ${currentItem ? "mengedit" : "menambah"} soal!`);
      console.error(result.error);
    } else {
      const problemDbId = currentItem?.id || result.data[0].id;

      await supabase
        .from("problem_theories")
        .delete()
        .eq("problem_id", problemDbId);

      // Pastikan hanya menyimpan data yang relevan ke database
      const theoryPayload = selectedTheories.map((theory, index) => ({
        problem_id: problemDbId,
        theory_id: theory.theory_id,
        sort_order: index, // Sort order dihitung ulang saat submit
      }));

      if (theoryPayload.length > 0) {
        await supabase.from("problem_theories").insert(theoryPayload);
      }

      toast.success(`Soal berhasil ${currentItem ? "diedit" : "ditambah"}!`);
      handleCloseModal();
      fetchProblems();
    }
  };

  const handleDuplicate = async (problem) => {
    if (window.confirm("Yakin ingin menduplikasi soal ini?")) {
      const { id, created_at, problem_id, ...problemToDuplicate } = problem;
      const newProblemId =
        "PR-" + Math.random().toString(36).substring(2, 10).toUpperCase();

      const { error } = await supabase.from("problems").insert({
        ...problemToDuplicate,
        problem_id: newProblemId,
        is_public: false,
      });

      if (error) {
        toast.error("Gagal menduplikasi soal!");
        console.error(error);
      } else {
        toast.success("Soal berhasil diduplikasi!");
        fetchProblems();
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Yakin ingin menghapus soal ini?")) {
      const { error } = await supabase.from("problems").delete().eq("id", id);
      if (error) {
        toast.error("Gagal menghapus soal!");
        console.error(error);
      } else {
        toast.success("Soal berhasil dihapus!");
        fetchProblems();
      }
    }
  };

  const handleClearFilters = () => {
    setSelectedCategory("");
    setSelectedTopic("");
    setSelectedSubtopic("");
    setTopics([]);
    setSubtopics([]);
  };

  useEffect(() => {
    if (window.MathJax && window.MathJax.Hub) {
      window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
    }
  }, [handleChange]);

  const handleImageUpload = (url) => {
    navigator.clipboard.writeText(url);
    toast.success("URL gambar berhasil disalin ke clipboard!");
  };

  // Logika pengurutan teori yang tersedia
  const sortedAvailableTheories = [...availableTheories].sort((a, b) => {
    const aIsSelected = selectedTheories.some((t) => t.theory_id === a.id);
    const bIsSelected = selectedTheories.some((t) => t.theory_id === b.id);

    if (aIsSelected && !bIsSelected) {
      return -1;
    }
    if (!aIsSelected && bIsSelected) {
      return 1;
    }
    if (aIsSelected && bIsSelected) {
      const aOrder = selectedTheories.find(
        (t) => t.theory_id === a.id
      )?.sort_order;
      const bOrder = selectedTheories.find(
        (t) => t.theory_id === b.id
      )?.sort_order;
      return aOrder - bOrder;
    }
    return 0;
  });

  const handleAddSelectedTheory = (theory) => {
    setSelectedTheories((prev) => {
      const isExist = prev.some((t) => t.theory_id === theory.id);
      if (!isExist) {
        // Tambahkan konten teori saat disimpan
        return [
          ...prev,
          {
            theory_id: theory.id,
            sort_order: prev.length,
            content: theory.content,
          },
        ];
      }
      return prev;
    });
  };

  const handleRemoveSelectedTheory = (theoryId) => {
    setSelectedTheories((prev) => {
      const updated = prev.filter((t) => t.theory_id !== theoryId);
      return updated.map((t, index) => ({ ...t, sort_order: index }));
    });
  };

  const handleMoveTheoryUp = (index) => {
    if (index > 0) {
      setSelectedTheories((prev) => {
        const newArr = [...prev];
        const temp = newArr[index];
        newArr[index] = newArr[index - 1];
        newArr[index - 1] = temp;
        // Update sort_order
        newArr[index].sort_order = index;
        newArr[index - 1].sort_order = index - 1;
        return newArr;
      });
    }
  };

  const handleMoveTheoryDown = (index) => {
    if (index < selectedTheories.length - 1) {
      setSelectedTheories((prev) => {
        const newArr = [...prev];
        const temp = newArr[index];
        newArr[index] = newArr[index + 1];
        newArr[index + 1] = temp;
        // Update sort_order
        newArr[index].sort_order = index;
        newArr[index + 1].sort_order = index + 1;
        return newArr;
      });
    }
  };

  // LOGIKA BARU: Dapatkan ID dan Nama Kategori "List Teori"
  const listTeoriCategory = categories.find(
    (cat) => cat.category_name === "List Teori"
  );
  const listTeoriCategoryName = listTeoriCategory
    ? listTeoriCategory.category_name
    : "Memuat Kategori...";
  const listTeoriCategoryId = listTeoriCategory ? listTeoriCategory.id : "";

  const handleOpenTheoryModal = async () => {
    setIsTheoryModalOpen(true);

    // PERUBAHAN KUNCI: Paksa kategori menjadi "List Teori"
    if (!listTeoriCategoryId) {
      toast.error(
        "Kategori 'List Teori' tidak ditemukan. Harap buat kategori tersebut."
      );
      setIsTheoryModalOpen(false);
      return;
    }

    // 1. Atur Kategori ke "List Teori"
    setTheoryModalCategory(listTeoriCategoryId);

    // 2. Muat Topik berdasarkan kategori ini
    await fetchTheoryModalTopics(listTeoriCategoryId);

    // 3. Reset Topik/Subtopik agar Admin bisa memilih ulang
    setTheoryModalTopic("");
    setTheoryModalSubtopic("");

    // Logika ancestors yang lama dihapus
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="mb-6 text-3xl font-bold text-gray-800">
        Kelola Soal dan Pembahasan
      </h2>

      <div className="mb-6 flex items-end space-x-4">
        <div className="flex flex-col">
          <label className="mb-1 text-sm font-bold text-gray-700">
            Kategori
          </label>
          <select
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              fetchTopics(e.target.value);
            }}
            value={selectedCategory}
            className="rounded-md border p-2"
          >
            <option value="">Pilih Kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.category_name}
              </option>
            ))}
          </select>
        </div>
        {selectedCategory && (
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-bold text-gray-700">
              Topik
            </label>
            <select
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                fetchSubtopics(e.target.value);
              }}
              value={selectedTopic}
              className="rounded-md border p-2"
            >
              <option value="">Pilih Topik</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.topic_name}
                </option>
              ))}
            </select>
          </div>
        )}
        {selectedTopic && (
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-bold text-gray-700">
              Subtopik
            </label>
            <select
              onChange={(e) => setSelectedSubtopic(e.target.value)}
              value={selectedSubtopic}
              className="rounded-md border p-2"
            >
              <option value="">Pilih Subtopik</option>
              {subtopics.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.subtopic_name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={handleClearFilters}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 shadow-sm transition-all hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        {selectedSubtopic ? (
          <>
            <span className="text-gray-600">Total Soal: {problems.length}</span>
            <button
              onClick={() => handleOpenModal()}
              className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-gray-400"
              disabled={!selectedSubtopic}
            >
              + Tambah Soal
            </button>
          </>
        ) : (
          <></>
        )}
      </div>

      {selectedSubtopic ? (
        loading ? (
          <div className="text-center text-lg">Memuat soal...</div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow-md">
            <table className="min-w-full divide-y divide-gray-200 bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    ID Soal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Teks Soal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tag
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {problems.map((problem) => (
                  <tr key={problem.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {problem.problem_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 overflow-x-auto">
                      <MathRenderer
                        text={formatTextForHTML(problem.question_text || "")}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        {problem.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {problem.tag && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 mr-2">
                          {problem.tag}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium space-x-4">
                      <button
                        onClick={() => handleOpenModal(problem)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleDuplicate(problem)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Copy size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(problem.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg">
          <p className="text-gray-500">
            Silakan pilih Kategori, Topik, dan Subtopik untuk menampilkan soal.
          </p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold">
                {currentItem ? "Edit" : "Tambah"} Soal
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Kategori
                  </label>
                  <select
                    onChange={(e) => {
                      setFormCategory(e.target.value);
                      fetchModalTopics(e.target.value);
                    }}
                    value={formCategory}
                    className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.category_name}
                      </option>
                    ))}
                  </select>
                </div>
                {formCategory && (
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      Topik
                    </label>
                    <select
                      onChange={(e) => {
                        setFormTopic(e.target.value);
                        fetchModalSubtopics(e.target.value);
                      }}
                      value={formTopic}
                      className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">Pilih Topik</option>
                      {topics.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.topic_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {formTopic && (
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      Subtopik
                    </label>
                    <select
                      onChange={(e) => setFormSubtopic(e.target.value)}
                      value={formSubtopic}
                      className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">Pilih Subtopik</option>
                      {subtopics.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.subtopic_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Tipe Soal
                  </label>
                  <select
                    name="type"
                    value={form.type || "input"}
                    onChange={handleChange}
                    className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="input">Input</option>
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="mcma">
                      Multiple Choice Multiple Answer (MCMA)
                    </option>
                    <option value="mck">Pilihan Ganda Kategori</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Teks Soal
                  </label>
                  <textarea
                    name="question_text"
                    value={form.question_text || ""}
                    onChange={handleChange}
                    className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                    rows="10"
                    required
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsImageModalOpen(true)}
                      className="rounded-md bg-gray-200 p-2 text-gray-700 hover:bg-gray-300"
                      aria-label="Unggah Gambar"
                    >
                      <ImagePlus size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertTable}
                      className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 text-sm"
                    >
                      P-Q
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertDS}
                      className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 text-sm font-semibold"
                      title="Insert Data Sufficiency Template"
                    >
                      DS
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertBold}
                      className="font-serif rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 text-sm font-bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertItalic}
                      className="font-serif rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 text-sm italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertUnderline}
                      className="font-serif rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 text-sm underline"
                    >
                      U
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertBulletList}
                      className="rounded-md bg-gray-200 px-2 py-2 text-gray-700 hover:bg-gray-300"
                    >
                      <List size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertNumberedList}
                      className="rounded-md bg-gray-200 px-2 py-2 text-gray-700 hover:bg-gray-300"
                    >
                      <ListOrdered size={20} />
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Pratinjau Soal
                  </label>
                  <div className="p-2 bg-gray-100 rounded-md min-h-[10rem] max-h-[25rem] overflow-y-auto prose max-w-none overflow-x-auto">
                    <MathRenderer
                      text={formatTextForHTML(form.question_text || "")}
                    />
                  </div>
                </div>
              </div>
              {form.type === "mcq" && (
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-gray-700">
                    Opsi Jawaban
                  </h4>
                  {form.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 text-sm font-bold">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <input
                        type="text"
                        value={option.value || ""}
                        onChange={(e) =>
                          handleOptionChange(index, e.target.value)
                        }
                        className="flex-1 rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-white text-sm hover:bg-green-600"
                  >
                    <Plus size={16} /> Tambah Opsi
                  </button>
                </div>
              )}
              {form.type === "mcma" && (
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-gray-700">
                    Opsi Jawaban
                  </h4>
                  {form.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 text-sm font-bold">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <input
                        type="text"
                        value={option.value || ""}
                        onChange={(e) =>
                          handleOptionChange(index, e.target.value)
                        }
                        className="flex-1 rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                        required
                      />
                      <label className="flex items-center space-x-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={option.is_correct || false}
                          onChange={(e) =>
                            handleMcmaCorrectAnswerChange(
                              index,
                              e.target.checked
                            )
                          }
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span>Benar</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-white text-sm hover:bg-green-600"
                  >
                    <Plus size={16} /> Tambah Opsi
                  </button>
                </div>
              )}
              {form.type === "mck" && (
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-gray-700">
                    Kategori Jawaban
                  </h4>
                  <div className="flex flex-col space-y-2">
                    {form.answer_categories.map((cat, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={cat || ""}
                          onChange={(e) =>
                            handleCategoryLabelChange(index, e.target.value)
                          }
                          className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                          placeholder={`Kategori ${index + 1}`}
                          required
                        />
                        {form.answer_categories.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCategory(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X size={20} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-white text-sm hover:bg-green-600 self-start"
                    >
                      <Plus size={16} /> Tambah Kategori
                    </button>
                  </div>
                  <h4 className="text-xl font-bold text-gray-700">
                    Pernyataan dan Jawaban
                  </h4>
                  {form.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 text-sm font-bold">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={option.statement || ""}
                        onChange={(e) =>
                          handleStatementChange(index, e.target.value)
                        }
                        className="flex-1 rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                        placeholder="Pernyataan"
                        required
                      />
                      <select
                        value={option.answer || ""}
                        onChange={(e) =>
                          handleStatementAnswerChange(index, e.target.value)
                        }
                        className="rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                        required
                      >
                        <option value="">Pilih Jawaban</option>
                        {form.answer_categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveStatement(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddStatement}
                    className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-white text-sm hover:bg-green-600"
                  >
                    <Plus size={16} /> Tambah Pernyataan
                  </button>
                </div>
              )}
              {form.type !== "mcma" && form.type !== "mck" && (
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      Teks Jawaban
                    </label>
                    <textarea
                      name="answer"
                      value={form.answer || ""}
                      onChange={handleChange}
                      className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                      rows="10"
                      required
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setIsImageModalOpen(true)}
                        className="rounded-md bg-gray-200 p-2 text-gray-700 hover:bg-gray-300"
                        aria-label="Unggah Gambar"
                      >
                        <ImagePlus size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      Pratinjau Jawaban
                    </label>
                    <div className="p-2 bg-gray-100 rounded-md min-h-[10rem] max-h-[25rem] overflow-y-auto prose max-w-none overflow-x-auto">
                      <MathRenderer
                        text={formatTextForHTML(form.answer || "")}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Teks Pembahasan
                    <p className="text-xs font-normal text-gray-500">
                      Gunakan penanda seperti `[teori_N]`, di mana N adalah
                      nomor urut Teori Penting yang dipilih.
                    </p>
                  </label>
                  <textarea
                    name="solution_text"
                    value={form.solution_text || ""}
                    onChange={handleChange}
                    className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                    rows="10"
                    required
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsImageModalOpen(true)}
                      className="rounded-md bg-gray-200 p-2 text-gray-700 hover:bg-gray-300"
                      aria-label="Unggah Gambar"
                    >
                      <ImagePlus size={20} />
                    </button>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Pratinjau Pembahasan
                  </label>
                  <div className="p-2 bg-gray-100 rounded-md min-h-[10rem] max-h-[25rem] overflow-y-auto prose max-w-none overflow-x-auto">
                    <MathRenderer
                      text={formatTextForHTML(form.solution_text || "")}
                    />
                  </div>
                </div>
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xl font-bold text-gray-700">
                    Teori Penting
                  </h4>
                  <button
                    type="button"
                    onClick={handleOpenTheoryModal}
                    className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-gray-400"
                    disabled={!formSubtopic}
                  >
                    Pilih & Atur Teori ({selectedTheories.length})
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  Total teori yang dipilih: {selectedTheories.length}.
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  Link Video Pembahasan (YouTube)
                </label>
                <input
                  type="url"
                  name="video_link"
                  value={form.video_link || ""}
                  onChange={handleChange}
                  className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                  placeholder="Contoh: https://www.youtube.com/watch?v=xxxxxxxxxxx"
                />
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input
                    id="has-solution-toggle"
                    type="checkbox"
                    name="has_solution"
                    checked={form.has_solution}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label
                    htmlFor="has-solution-toggle"
                    className="ml-2 text-sm font-bold text-gray-700"
                  >
                    Soal ini memiliki pembahasan
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="is-public-toggle"
                    type="checkbox"
                    name="is_public"
                    checked={form.is_public}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label
                    htmlFor="is-public-toggle"
                    className="ml-2 text-sm font-bold text-gray-700"
                  >
                    Pembahasan soal ini dapat dilihat publik
                  </label>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  Tag
                </label>
                <input
                  type="text"
                  name="tag"
                  value={form.tag || ""}
                  onChange={handleChange}
                  className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-md bg-gray-300 px-4 py-2 hover:bg-gray-400"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isImageModalOpen && (
        <ImageUploaderModal
          onUpload={(url) => {
            navigator.clipboard.writeText(url);
            toast.success("URL gambar berhasil disalin ke clipboard!");
          }}
          onClose={() => setIsImageModalOpen(false)}
        />
      )}
      {isTheoryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70">
          <div className="w-full max-w-4xl rounded-lg bg-white p-8 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold">Pilih & Atur Urutan Teori</h3>
              <button
                onClick={() => setIsTheoryModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            {/* Dropdown untuk navigasi teori */}
            <div className="mb-4 flex space-x-4">
              {/* Dropdown Topik Teori: Hanya muncul jika Kategori sudah ditetapkan */}
              {theoryModalCategory && (
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-bold text-gray-700">
                    Topik Teori
                  </label>
                  <select
                    onChange={async (e) => {
                      setTheoryModalTopic(e.target.value);
                      await fetchTheoryModalSubtopics(e.target.value);
                    }}
                    value={theoryModalTopic}
                    className="w-full rounded-md border p-2"
                  >
                    <option value="">Pilih Topik</option>
                    {theoryModalTopics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.topic_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {theoryModalTopic && (
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-bold text-gray-700">
                    Subtopik Teori
                  </label>
                  <select
                    onChange={(e) => setTheoryModalSubtopic(e.target.value)}
                    value={theoryModalSubtopic}
                    className="w-full rounded-md border p-2"
                  >
                    <option value="">Pilih Subtopik</option>
                    {theoryModalSubtopics.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.subtopic_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              {/* Kolom Kiri: Teori yang Tersedia */}
              <div className="flex-1 border rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold mb-2">Teori Tersedia</h4>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {availableTheories.length > 0 ? (
                    availableTheories.map((theory) => (
                      <div
                        key={theory.id}
                        className={`p-2 rounded-md bg-white shadow-sm cursor-pointer hover:bg-gray-100 ${
                          selectedTheories.some(
                            (t) => t.theory_id === theory.id
                          )
                            ? "opacity-50"
                            : ""
                        }`}
                        onClick={() => handleAddSelectedTheory(theory)}
                      >
                        <span className="font-semibold">
                          {theory.theory_id}
                        </span>
                        <MathRenderer
                          text={theory.content}
                          className="mt-1 prose-sm"
                        />
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 text-sm">
                      Tidak ada teori tersedia untuk subtopik ini.
                    </div>
                  )}
                </div>
              </div>

              {/* Kolom Kanan: Teori Terpilih (dan Tombol Pengatur) */}
              <div className="flex-1 border rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold mb-2">
                  Teori Terpilih ({selectedTheories.length})
                </h4>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {selectedTheories.length > 0 ? (
                    selectedTheories.map((selected, index) => {
                      return (
                        <div
                          key={selected.theory_id}
                          className="flex items-center space-x-2 p-2 rounded-md bg-white shadow-sm"
                        >
                          <div className="flex-1">
                            <span className="font-semibold">
                              [teori_{selected.sort_order}]
                            </span>
                            <MathRenderer
                              text={selected.content}
                              className="mt-1 prose-sm"
                            />
                          </div>
                          <div className="flex flex-col space-y-1">
                            <button
                              type="button"
                              onClick={() => handleMoveTheoryUp(index)}
                              disabled={index === 0}
                              className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveTheoryDown(index)}
                              disabled={index === selectedTheories.length - 1}
                              className="p-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                            >
                              <ArrowDown size={16} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveSelectedTheory(selected.theory_id)
                            }
                            className="text-red-600 hover:text-red-800"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-gray-500 text-sm">
                      Pilih teori dari daftar di samping.
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => setIsTheoryModalOpen(false)}
                    className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemManagementPage;
