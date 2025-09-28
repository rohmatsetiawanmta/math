import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js"; // Import bernama
import { useNavigate } from "react-router-dom";
import { Loader } from "lucide-react";
import toast from "react-hot-toast";

const LoginPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error("Error during sign in:", error);
      setIsLoading(false);
      toast.error(error.message);
    } else {
      navigate("/"); // Alihkan ke halaman utama setelah login
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      console.error("Error during sign up:", error);
      setIsLoading(false);
      toast.error(error.message);
    } else {
      if (data.user) {
        // Simpan data pengguna ke tabel `users`
        const { error: insertError } = await supabase.from("users").insert([
          {
            id: data.user.id,
            email: data.user.email,
            role: "basic",
          },
        ]);

        if (insertError) {
          console.error(
            "Error inserting user into 'users' table:",
            insertError
          );
          toast.error(
            "Pendaftaran berhasil, tetapi gagal menyimpan data pengguna."
          );
        } else {
          toast.success(
            "Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi."
          );
        }
      }
      navigate("/"); // Alihkan ke halaman utama setelah pendaftaran
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-gray-50 mt-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
        <h2 className="mb-6 text-center text-3xl font-bold text-gray-800">
          {isRegister ? "Daftar Akun" : "Login"}
        </h2>
        <p className="mb-8 text-center text-gray-600">
          {isRegister
            ? "Silakan daftar untuk mengakses fitur yang lebih lengkap."
            : "Masuk ke akun Anda untuk mengakses fitur yang lebih lengkap."}
        </p>
        <form
          onSubmit={isRegister ? handleRegister : handleLogin}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border p-3 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border p-3 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 py-3 text-lg font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:bg-gray-400"
            disabled={isLoading}
          >
            {isLoading ? <Loader size={24} className="animate-spin" /> : null}
            <span>{isRegister ? "Daftar" : "Login"}</span>
          </button>
        </form>
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            {isRegister
              ? "Sudah punya akun? Login di sini."
              : "Belum punya akun? Daftar di sini."}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
