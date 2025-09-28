// src/pages/admin/UserManagementPage.jsx

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import toast from "react-hot-toast";
import { Trash2, Edit } from "lucide-react";

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState("");

  const availableRoles = ["admin", "basic"]; // Peran yang tersedia

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    // Mengambil ID, email, peran, dan tanggal pendaftaran dari tabel 'users'
    const { data, error } = await supabase
      .from("users")
      .select("id, email, role, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      toast.error("Gagal memuat daftar pengguna!");
    } else {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleEditRole = (user) => {
    setEditingUser(user);
    setNewRole(user.role);
  };

  const handleSaveRole = async (userId) => {
    const { error } = await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      console.error("Error updating role:", error);
      toast.error("Gagal memperbarui peran pengguna!");
    } else {
      toast.success(
        `Peran ${editingUser.email} berhasil diubah menjadi ${newRole}!`
      );
      setEditingUser(null);
      setNewRole("");
      fetchUsers(); // Muat ulang data
    }
  };

  const handleDeleteUser = async (userId, email) => {
    if (
      !window.confirm(
        `Yakin ingin menghapus pengguna ${email}? Aksi ini TIDAK dapat dibatalkan.`
      )
    ) {
      return;
    }

    // Menghapus entry dari tabel 'users'
    const { error } = await supabase.from("users").delete().eq("id", userId);

    if (error) {
      console.error("Error deleting user:", error);
      toast.error("Gagal menghapus pengguna!");
    } else {
      toast.success(`Pengguna ${email} berhasil dihapus dari daftar peran.`);
      fetchUsers(); // Muat ulang data
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="mb-6 text-3xl font-bold text-gray-800">
        Manajemen Pengguna
      </h2>

      <p className="mb-4 text-gray-600">
        Total Pengguna Terdaftar (di tabel users): {users.length}
      </p>

      {loading ? (
        <div className="text-center text-lg">Memuat daftar pengguna...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200 bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  ID Supabase
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Peran (Role)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Terdaftar
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono text-xs">
                    {user.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.role === "admin" ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        ADMIN
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        {user.role.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium space-x-4">
                    <button
                      onClick={() => handleEditRole(user)}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      <Edit size={20} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id, user.email)}
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
      )}

      {/* Modal Edit Role */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
            <h3 className="mb-4 text-xl font-bold">Edit Peran Pengguna</h3>
            <p className="mb-4">
              Mengubah peran untuk: <strong>{editingUser.email}</strong>
            </p>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Peran Baru
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
              >
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-md bg-gray-300 px-4 py-2 hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveRole(editingUser.id)}
                className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                disabled={newRole === editingUser.role}
              >
                Simpan Peran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
