// src/pages/admin/AdminPage.jsx
import { Link } from "react-router-dom";

const AdminPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="mb-6 text-3xl font-bold text-gray-800">Panel Admin</h2>
      <p className="mb-8 text-gray-600">
        Selamat datang di panel admin. Silakan pilih menu untuk mengelola data
        website.
      </p>

      <div className="space-y-4">
        <Link
          to="/adminxyz/manage"
          className="block rounded-lg bg-white p-6 shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
        >
          <h3 className="text-xl font-semibold text-gray-700">
            Kelola Kategori, Topik, dan Subtopik
          </h3>
          <p className="text-gray-500">
            Tambahkan, edit, atau hapus data dalam satu halaman terpadu.
          </p>
        </Link>
        <Link
          to="/adminxyz/problems"
          className="block rounded-lg bg-white p-6 shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
        >
          <h3 className="text-xl font-semibold text-gray-700">
            Kelola Soal dan Pembahasan
          </h3>
          <p className="text-gray-500">
            Tambahkan, edit, atau hapus soal dan pembahasannya.
          </p>
        </Link>
        {/* Tambahkan link baru di sini */}
        <Link
          to="/adminxyz/theories"
          className="block rounded-lg bg-white p-6 shadow-md transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
        >
          <h3 className="text-xl font-semibold text-gray-700">Kelola Teori</h3>
          <p className="text-gray-500">
            Lihat dan kelola semua teori yang digunakan dalam soal.
          </p>
        </Link>
      </div>
    </div>
  );
};

export default AdminPage;
