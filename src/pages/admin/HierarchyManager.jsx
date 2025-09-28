// src/pages/admin/HierarchyManager.jsx

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

const generateRandomId = (prefix) => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `${prefix}-${result}`;
};

const HierarchyManager = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [form, setForm] = useState({});

  const [currentView, setCurrentView] = useState("categories");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    let query;

    if (currentView === "categories") {
      query = supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
    } else if (currentView === "topics" && selectedCategory) {
      query = supabase
        .from("topics")
        .select(`*, category:category_id(category_name)`)
        .eq("category_id", selectedCategory.id)
        .order("sort_order", { ascending: true });
    } else if (currentView === "subtopics" && selectedTopic) {
      query = supabase
        .from("subtopics")
        .select(
          `*, topic:topic_id(topic_name, category:category_id(category_name))`
        )
        .eq("topic_id", selectedTopic.id)
        .order("sort_order", { ascending: true }); // Mengurutkan subtopik
    } else {
      query = supabase.from("categories").select("*");
    }

    const { data, error } = await query;
    if (error) {
      toast.error(`Gagal mengambil data!`);
      console.error(error);
    } else {
      setItems(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [currentView, selectedCategory, selectedTopic]);

  const handleOpenModal = (item = null) => {
    setCurrentItem(item);
    let initialForm = item ? { ...item } : { is_published: false };
    if (currentView === "topics" && selectedCategory) {
      initialForm.category_id = selectedCategory.id;
    } else if (currentView === "subtopics" && selectedTopic) {
      initialForm.topic_id = selectedTopic.id;
    }
    setForm(initialForm);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentItem(null);
    setForm({});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let updatedForm = {
      ...form,
      [name]: type === "checkbox" ? checked : value,
    };
    setForm(updatedForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let tableName = currentView;
    let result;

    let payload = { ...form };

    if (payload.category) delete payload.category;
    if (payload.topic) delete payload.topic;

    if (!currentItem) {
      let prefix;
      let idColumn;
      if (currentView === "categories") {
        prefix = "CA";
        idColumn = "category_id";
        const newSortOrder =
          items.length > 0
            ? Math.max(...items.map((i) => i.sort_order)) + 1
            : 0;
        payload.sort_order = newSortOrder;
      } else if (currentView === "topics") {
        prefix = "TO";
        idColumn = "topic_id";
        const newSortOrder =
          items.length > 0
            ? Math.max(...items.map((i) => i.sort_order)) + 1
            : 0;
        payload.sort_order = newSortOrder;
      } else if (currentView === "subtopics") {
        prefix = "SU";
        idColumn = "subtopic_id";
        // Logika sort_order untuk subtopik baru
        const newSortOrder =
          items.length > 0
            ? Math.max(...items.map((i) => i.sort_order)) + 1
            : 0;
        payload.sort_order = newSortOrder;
      }

      payload[idColumn] = generateRandomId(prefix);
    }

    if (currentItem) {
      result = await supabase
        .from(tableName)
        .update(payload)
        .eq("id", currentItem.id);
    } else {
      result = await supabase.from(tableName).insert(payload);
    }

    if (result.error) {
      toast.error(`Gagal ${currentItem ? "mengedit" : "menambah"}!`);
      console.error(result.error);
    } else {
      toast.success(
        `${currentView} berhasil ${currentItem ? "diedit" : "ditambah"}!`
      );
      handleCloseModal();
      fetchItems();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Yakin ingin menghapus item ini?")) {
      const { error } = await supabase.from(currentView).delete().eq("id", id);
      if (error) {
        toast.error("Gagal menghapus!");
        console.error(error);
      } else {
        toast.success("Item berhasil dihapus!");
        fetchItems();
      }
    }
  };

  const handleMoveItem = async (itemId, direction) => {
    const tableName =
      currentView === "categories"
        ? "categories"
        : currentView === "topics"
        ? "topics"
        : "subtopics";

    const currentItem = items.find((item) => item.id === itemId);
    const currentIndex = items.findIndex((item) => item.id === itemId);
    if (!currentItem) return;

    let newIndex;
    if (direction === "up" && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === "down" && currentIndex < items.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return;
    }

    const itemToSwap = items[newIndex];
    if (!itemToSwap) return;

    const { error: error1 } = await supabase
      .from(tableName)
      .update({ sort_order: itemToSwap.sort_order })
      .eq("id", currentItem.id);

    if (error1) {
      toast.error("Gagal mengurutkan!");
      console.error(error1);
      return;
    }

    const { error: error2 } = await supabase
      .from(tableName)
      .update({ sort_order: currentItem.sort_order })
      .eq("id", itemToSwap.id);

    if (error2) {
      toast.error("Gagal mengurutkan!");
      console.error(error2);
      return;
    }

    toast.success("Urutan berhasil diubah!");
    fetchItems();
  };

  const getTableHeaders = () => {
    if (currentView === "categories") {
      return ["Urutan", "Nama Kategori", "Deskripsi", "Published"];
    } else if (currentView === "topics") {
      return ["Urutan", "Nama Topik", "Kategori", "Published"];
    } else if (currentView === "subtopics") {
      return ["Urutan", "Nama Subtopik", "Topik", "Kategori", "Published"];
    }
    return [];
  };

  const getTableRows = () => {
    return items.map((item, index) => {
      const row = [];
      const publishedBadge = (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${
            item.is_published ? "bg-green-500" : "bg-gray-400"
          }`}
        >
          {item.is_published ? "Published" : "Not Published"}
        </span>
      );

      const isSortable =
        currentView !== "subtopics" || item.sort_order !== undefined;

      const sortableCell = isSortable ? (
        <div className="flex items-center space-x-2">
          <div className="flex gap-2 items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMoveItem(item.id, "up");
              }}
              disabled={index === 0}
              className="text-gray-500 hover:text-blue-500 disabled:text-gray-300"
            >
              <ChevronUp size={16} />
            </button>
            <span className="font-bold">{index + 1}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMoveItem(item.id, "down");
              }}
              disabled={index === items.length - 1}
              className="text-gray-500 hover:text-blue-500 disabled:text-gray-300"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      ) : (
        "-"
      );

      if (currentView === "categories") {
        row.push(
          sortableCell,
          item.category_name,
          item.description,
          publishedBadge
        );
      } else if (currentView === "topics") {
        row.push(
          sortableCell,
          item.topic_name,
          item.category?.category_name || "-",
          publishedBadge
        );
      } else if (currentView === "subtopics") {
        row.push(
          sortableCell,
          item.subtopic_name,
          item.topic?.topic_name || "-",
          item.topic?.category?.category_name || "-",
          publishedBadge
        );
      }
      return row;
    });
  };

  const handleDrillDown = (item) => {
    if (currentView === "categories") {
      setSelectedCategory(item);
      setCurrentView("topics");
    } else if (currentView === "topics") {
      setSelectedTopic(item);
      setCurrentView("subtopics");
    }
  };

  const handleDrillUp = (view) => {
    if (view === "topics") {
      setCurrentView("topics");
      setSelectedTopic(null);
    } else if (view === "categories") {
      setCurrentView("categories");
      setSelectedCategory(null);
      setSelectedTopic(null);
    }
  };

  const getFormFields = () => {
    const baseFields = [];
    if (currentView === "categories") {
      baseFields.push(
        { name: "category_name", label: "Nama Kategori", type: "text" },
        { name: "description", label: "Deskripsi", type: "text" }
      );
    } else if (currentView === "topics") {
      baseFields.push({
        name: "topic_name",
        label: "Nama Topik",
        type: "text",
      });
    } else if (currentView === "subtopics") {
      baseFields.push({
        name: "subtopic_name",
        label: "Nama Subtopik",
        type: "text",
      });
    }
    baseFields.push({
      name: "is_published",
      label: "Published",
      type: "checkbox",
    });
    return baseFields;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster />
      <div className="mb-6">
        <div className="flex items-center gap-2 text-gray-500">
          <Link to="/adminxyz" className="text-gray-500 hover:text-gray-700">
            Admin
          </Link>
          <ChevronRight size={16} />
          <button
            onClick={() => handleDrillUp("categories")}
            className="text-gray-500 hover:text-gray-700"
          >
            Kategori
          </button>
          {selectedCategory && (
            <>
              <ChevronRight size={16} />
              <button
                onClick={() => handleDrillUp("topics")}
                className="text-gray-500 hover:text-gray-700"
              >
                {selectedCategory.category_name}
              </button>
            </>
          )}
          {selectedTopic && (
            <>
              <ChevronRight size={16} />
              <span className="text-gray-900 font-medium">
                {selectedTopic.topic_name}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-gray-800">
            {currentView === "categories" && "Kelola Kategori"}
            {currentView === "topics" &&
              `Topik di Kategori: ${selectedCategory.category_name}`}
            {currentView === "subtopics" &&
              `Subtopik di Topik: ${selectedTopic.topic_name}`}
          </h2>
          <button
            onClick={() => handleOpenModal()}
            className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            + Tambah
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-lg">Memuat data...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200 bg-white">
            <thead className="bg-gray-50">
              <tr>
                {getTableHeaders().map((header) => (
                  <th
                    key={header}
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {header}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  className="cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  {getTableRows()[index].map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      onClick={() => handleDrillDown(item)}
                      className="whitespace-nowrap px-6 py-4 text-sm text-gray-900"
                    >
                      {cell}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(item);
                      }}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="ml-4 text-red-600 hover:text-red-900"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold">
                {currentItem ? "Edit" : "Tambah"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {getFormFields().map((field) => (
                <div key={field.name}>
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    {field.label}
                  </label>
                  {field.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      name={field.name}
                      checked={form[field.name] || false}
                      onChange={handleChange}
                      className="form-checkbox h-5 w-5 text-blue-600"
                    />
                  ) : (
                    <input
                      type="text"
                      name={field.name}
                      value={form[field.name] || ""}
                      onChange={handleChange}
                      className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                      required
                    />
                  )}
                </div>
              ))}
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

export default HierarchyManager;
