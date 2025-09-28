import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import CategoryCard from "../components/CategoryCard";

const LatihanSoalPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("sort_order", { ascending: true });

        if (error) {
          throw error;
        }
        setCategories(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-lg">
        Memuat kategori...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-red-500">
        Gagal memuat kategori: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="mb-6 text-center text-4xl font-bold text-gray-800">
        Pilih Kategori Latihan Soal
      </h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {categories.map((category) =>
          category.is_published ? (
            <CategoryCard key={category.id} category={category} />
          ) : (
            <></>
          )
        )}
      </div>
    </div>
  );
};

export default LatihanSoalPage;
