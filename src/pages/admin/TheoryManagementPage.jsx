// src/pages/admin/TheoryManagementPage.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import toast from "react-hot-toast";
import MathRenderer from "../../components/MathRenderer.jsx";
import {
  Edit,
  Trash2,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Copy,
} from "lucide-react";
import formatTextForHTML from "../../util/formatTextForHTML.js";

const TheoryManagementPage = () => {
  // categories tetap disimpan untuk digunakan di MODAL (Tambah/Edit Teori)
  const [categories, setCategories] = useState([]);

  const [topics, setTopics] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  const [theories, setTheories] = useState([]);

  // Filter utama hanya menggunakan Topic dan Subtopic
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedSubtopic, setSelectedSubtopic] = useState("");

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  const [form, setForm] = useState({ content: "" });
  const [formCategory, setFormCategory] = useState("");
  const [formTopics, setFormTopics] = useState([]);
  const [formTopic, setFormTopic] = useState("");
  const [formSubtopics, setFormSubtopics] = useState([]);
  const [formSubtopic, setFormSubtopic] = useState("");

  // Memuat Topik filter (hanya dari "List Teori") dan semua Kategori (untuk modal) saat komponen dimuat
  useEffect(() => {
    fetchInitialTopics();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedSubtopic) {
      fetchTheories();
    } else {
      setTheories([]);
    }
  }, [selectedSubtopic]);

  useEffect(() => {
    if (formCategory) {
      fetchModalTopics(formCategory);
    } else {
      setFormTopics([]);
      setFormTopic("");
    }
  }, [formCategory]);

  useEffect(() => {
    if (formTopic) {
      fetchModalSubtopics(formTopic);
    } else {
      setFormSubtopics([]);
      setFormSubtopic("");
    }
  }, [formTopic]);

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
    }
  };

  /**
   * Mengambil Topik hanya dari Kategori yang bernama "List Teori"
   * untuk digunakan sebagai filter utama.
   */
  const fetchInitialTopics = async () => {
    setSelectedTopic("");
    setSelectedSubtopic("");
    setSubtopics([]);

    // 1. Cari ID kategori "List Teori"
    const { data: categoryData, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("category_name", "List Teori")
      .single();

    if (categoryError || !categoryData) {
      console.error(
        "Error fetching 'List Teori' category or not found:",
        categoryError
      );
      toast.error("Kategori 'List Teori' tidak ditemukan atau gagal dimuat.");
      setTopics([]); // Set topics empty if not found
      return;
    }

    const listTeoriCategoryId = categoryData.id;

    // 2. Muat Topik berdasarkan category_id tersebut
    const { data, error } = await supabase
      .from("topics")
      .select("*")
      .eq("category_id", listTeoriCategoryId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Gagal memuat topik!");
    } else {
      setTopics(data);
    }
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

  const fetchTheories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("theories")
      .select("*")
      .eq("subtopic_id", selectedSubtopic)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error(error);
      toast.error("Gagal memuat teori!");
    } else {
      setTheories(data);
    }
    setLoading(false);
  };

  const fetchModalTopics = async (categoryId) => {
    const { data, error } = await supabase
      .from("topics")
      .select("*")
      .eq("category_id", categoryId)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error(error);
    } else {
      setFormTopics(data);
    }
  };

  const fetchModalSubtopics = async (topicId) => {
    const { data, error } = await supabase
      .from("subtopics")
      .select("*")
      .eq("topic_id", topicId)
      .order("sort_order", { ascending: true });
    if (error) {
      console.error(error);
    } else {
      setFormSubtopics(data);
    }
  };

  const fetchAncestors = async (subtopicId) => {
    if (!subtopicId) return {};
    const { data, error } = await supabase
      .from("subtopics")
      .select("topic_id, topics(category_id)")
      .eq("id", subtopicId)
      .single();
    if (error) {
      console.error(error);
      return {};
    }
    return {
      categoryId: data.topics.category_id,
      topicId: data.topic_id,
    };
  };

  const handleOpenModal = async (item = null) => {
    setCurrentItem(item);
    setForm(item ? { content: item.content } : { content: "" });
    setIsModalOpen(true);

    // Mengisi dropdown modal
    if (item) {
      const ancestors = await fetchAncestors(item.subtopic_id);
      setFormCategory(ancestors.categoryId || "");
      setFormTopic(ancestors.topicId || "");
      setFormSubtopic(item.subtopic_id);
    } else {
      // Mengisi form modal dari filter yang sedang aktif
      setFormCategory("");
      setFormTopic(selectedTopic || "");
      setFormSubtopic(selectedSubtopic || "");
      // Cari categoryId untuk topik yang dipilih saat ini (di filter utama)
      if (selectedTopic) {
        const selectedTopicData = topics.find((t) => t.id === selectedTopic);
        if (selectedTopicData) {
          setFormCategory(selectedTopicData.category_id);
          // Panggil fetchModalTopics dan fetchModalSubtopics agar modal terisi
          fetchModalTopics(selectedTopicData.category_id);
          fetchModalSubtopics(selectedTopic);
        }
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentItem(null);
    setForm({ content: "" });
    setFormCategory("");
    setFormTopic("");
    setFormSubtopic("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let result;
    const payload = {
      ...form,
      subtopic_id: formSubtopic, // Menggunakan subtopic dari modal
    };

    if (!formSubtopic) {
      toast.error("Mohon pilih subtopik!");
      return;
    }

    if (!currentItem) {
      const newSortOrder =
        theories.length > 0
          ? Math.max(...theories.map((i) => i.sort_order)) + 1
          : 0;
      payload.sort_order = newSortOrder;

      const theoryId =
        "TH-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      payload.theory_id = theoryId;
      result = await supabase.from("theories").insert(payload);
    } else {
      result = await supabase
        .from("theories")
        .update(payload)
        .eq("id", currentItem.id);
    }

    if (result.error) {
      toast.error(`Gagal ${currentItem ? "mengedit" : "menambah"} teori!`);
      console.error(result.error);
    } else {
      toast.success(`Teori berhasil ${currentItem ? "diedit" : "ditambah"}!`);
      handleCloseModal();
      // Muat ulang teori untuk subtopik yang aktif
      if (selectedSubtopic) {
        fetchTheories();
      } else {
        fetchInitialTopics();
      }
    }
  };

  const handleDuplicate = async (theory) => {
    if (window.confirm("Yakin ingin menduplikasi teori ini?")) {
      // Destructure content dan rest of the properties
      const {
        id,
        created_at,
        theory_id,
        sort_order,
        content,
        ...restOfTheory
      } = theory;

      // Buat ID unik baru
      const newTheoryId =
        "TH-" + Math.random().toString(36).substring(2, 10).toUpperCase();

      // Hitung urutan baru (ditempatkan di akhir)
      const newSortOrder =
        theories.length > 0
          ? Math.max(...theories.map((i) => i.sort_order)) + 1
          : 0;

      // Tambahkan prefix [Copy] ke konten
      const newContent = "[Copy] " + content;

      const { error } = await supabase.from("theories").insert({
        ...restOfTheory,
        content: newContent, // <-- Gunakan konten baru
        theory_id: newTheoryId,
        sort_order: newSortOrder,
      });

      if (error) {
        toast.error("Gagal menduplikasi teori!");
        console.error(error);
      } else {
        toast.success("Teori berhasil diduplikasi!");
        fetchTheories();
      }
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Yakin ingin menghapus teori ini? Ini akan memutus relasi ke semua soal yang menggunakannya."
      )
    ) {
      const { error: relError } = await supabase
        .from("problem_theories")
        .delete()
        .eq("theory_id", id);

      if (relError) {
        toast.error("Gagal menghapus relasi teori!");
        console.error(relError);
        return;
      }

      const { error } = await supabase.from("theories").delete().eq("id", id);
      if (error) {
        toast.error("Gagal menghapus teori!");
        console.error(error);
      } else {
        toast.success("Teori berhasil dihapus!");
        fetchTheories();
      }
    }
  };

  const handleClearFilters = () => {
    setSelectedTopic("");
    setSelectedSubtopic("");
    setSubtopics([]);
    // Muat ulang Topik yang hanya dari "List Teori"
    fetchInitialTopics();
  };

  const handleMoveItem = async (itemId, direction) => {
    const currentItem = theories.find((item) => item.id === itemId);
    const currentIndex = theories.findIndex((item) => item.id === itemId);
    if (!currentItem) return;

    let newIndex;
    if (direction === "up" && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === "down" && currentIndex < theories.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return;
    }

    const itemToSwap = theories[newIndex];
    if (!itemToSwap) return;

    const { error: error1 } = await supabase
      .from("theories")
      .update({ sort_order: itemToSwap.sort_order })
      .eq("id", currentItem.id);

    if (error1) {
      toast.error("Gagal mengurutkan teori!");
      console.error(error1);
      return;
    }

    const { error: error2 } = await supabase
      .from("theories")
      .update({ sort_order: currentItem.sort_order })
      .eq("id", itemToSwap.id);

    if (error2) {
      toast.error("Gagal mengurutkan teori!");
      console.error(error2);
      return;
    }

    toast.success("Urutan teori berhasil diubah!");
    fetchTheories();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="mb-6 text-3xl font-bold text-gray-800">Kelola Teori</h2>

      <div className="mb-6 flex items-end space-x-4">
        {/* Filter Kategori Dihapus dari Tampilan Utama */}

        <div className="flex flex-col">
          <label className="mb-1 text-sm font-bold text-gray-700">Topik</label>
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
            <span className="text-gray-600">
              Total Teori: {theories.length}
            </span>
            <button
              onClick={() => handleOpenModal()}
              className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-gray-400"
              disabled={!selectedSubtopic}
            >
              + Tambah Teori
            </button>
          </>
        ) : (
          <></>
        )}
      </div>

      {selectedSubtopic ? (
        loading ? (
          <div className="text-center text-lg">Memuat teori...</div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow-md">
            <table className="min-w-full divide-y divide-gray-200 bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Urutan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    ID Teori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Konten Teori
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {theories.map((theory, index) => (
                  <tr key={theory.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleMoveItem(theory.id, "up")}
                          disabled={index === 0}
                          className="text-gray-500 hover:text-blue-500 disabled:text-gray-300"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <span className="font-bold">{index + 1}</span>
                        <button
                          onClick={() => handleMoveItem(theory.id, "down")}
                          disabled={index === theories.length - 1}
                          className="text-gray-500 hover:text-blue-500 disabled:text-gray-300"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {theory.theory_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <MathRenderer text={formatTextForHTML(theory.content)} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium space-x-4">
                      <button
                        onClick={() => handleOpenModal(theory)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleDuplicate(theory)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Copy size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(theory.id)}
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
            Silakan pilih Topik dan Subtopik untuk menampilkan teori.
          </p>
        </div>
      )}

      {/* MODAL TEORI: Kategori, Topik, Subtopik tetap ditampilkan untuk memilih hierarki teori */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold">
                {currentItem ? "Edit" : "Tambah"} Teori
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-bold text-gray-700">
                    Kategori
                  </label>
                  <select
                    onChange={(e) => setFormCategory(e.target.value)}
                    value={formCategory}
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
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-bold text-gray-700">
                    Topik
                  </label>
                  <select
                    onChange={(e) => setFormTopic(e.target.value)}
                    value={formTopic}
                    className="rounded-md border p-2"
                    disabled={!formCategory}
                  >
                    <option value="">Pilih Topik</option>
                    {formTopics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.topic_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 text-sm font-bold text-gray-700">
                    Subtopik
                  </label>
                  <select
                    onChange={(e) => setFormSubtopic(e.target.value)}
                    value={formSubtopic}
                    className="rounded-md border p-2"
                    disabled={!formTopic}
                  >
                    <option value="">Pilih Subtopik</option>
                    {formSubtopics.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.subtopic_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-700">
                  Konten Teori
                </label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                  rows="10"
                  required
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
    </div>
  );
};

export default TheoryManagementPage;
