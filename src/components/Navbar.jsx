// src/components/Navbar.jsx

import React, { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react"; // Import UserCircle untuk ikon Profile
import { supabase } from "../lib/supabaseClient.js";
import LogoImg from "../image/logo.png";

const navItems = [
  { name: "Latihan Soal", to: "/latsol" },
  { name: "Materi", to: "/materi" },
  { name: "Drill Soal", to: "/drill-soal" },
];

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false); // State baru untuk dropdown Profile
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchUserRole = async (userId) => {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        setUserRole(null);
      } else {
        setUserRole(data.role);
      }
    };

    // Memeriksa sesi saat komponen di-mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserRole(session.user.id);
      }
    });

    // Mendengarkan perubahan status otentikasi
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session) {
          fetchUserRole(session.user.id);
        } else {
          setUserRole(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsProfileDropdownOpen(false); // Tutup dropdown profile saat menu mobile di-toggle
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    setIsProfileDropdownOpen(false);
  };

  const handleDropdownClick = () => {
    setIsProfileDropdownOpen(false);
    setIsMenuOpen(false); // Tutup menu mobile jika diakses dari sana
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link to="/">
          <img
            src={LogoImg}
            alt="matrohmatmath Logo"
            className="h-10 md:h-12 w-auto"
          />
        </Link>
        <div className="md:hidden">
          <button onClick={toggleMenu} className="focus:outline-none">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        <div
          className={`
            absolute top-16 left-0 right-0 z-10 flex-col bg-white px-4 py-2 shadow-md md:static md:flex md:flex-row md:items-center md:justify-end md:gap-x-6 md:p-0 md:shadow-none
            ${isMenuOpen ? "flex" : "hidden"}
          `}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `py-2 text-lg font-medium md:py-0 ${
                  isActive
                    ? "text-blue-600 font-bold"
                    : "text-gray-700 hover:text-blue-600"
                }`
              }
              onClick={() => setIsMenuOpen(false)}
            >
              {item.name}
            </NavLink>
          ))}

          {session ? (
            // START: Dropdown Profile (untuk desktop dan mobile)
            <div className="relative">
              <button
                onClick={toggleProfileDropdown}
                className="flex items-center gap-1 py-2 text-lg font-medium text-gray-700 hover:text-blue-600 md:py-0"
              >
                <span className="hidden md:inline">Profile</span>
                <span className="md:hidden">
                  Profile {isProfileDropdownOpen ? "▲" : "▼"}
                </span>
              </button>

              {isProfileDropdownOpen && (
                <div
                  className="md:absolute md:right-0 md:mt-2 w-full md:w-48 rounded-md shadow-lg bg-white focus:outline-none"
                  // Gunakan kelas flex-col dan p-2 untuk tampilan mobile/desktop yang konsisten
                >
                  <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                      `block px-4 py-2 text-md font-medium ${
                        isActive
                          ? "text-blue-600 bg-gray-100 font-bold"
                          : "text-gray-700 hover:bg-gray-100"
                      }`
                    }
                    onClick={handleDropdownClick}
                  >
                    Dashboard
                  </NavLink>
                  <NavLink
                    to="/bookmarks"
                    className={({ isActive }) =>
                      `block px-4 py-2 text-md font-medium ${
                        isActive
                          ? "text-yellow-600 bg-gray-100 font-bold"
                          : "text-gray-700 hover:bg-gray-100"
                      }`
                    }
                    onClick={handleDropdownClick}
                  >
                    Bookmark
                  </NavLink>
                  {userRole === "admin" && (
                    <NavLink
                      to="/admin"
                      className={({ isActive }) =>
                        `block px-4 py-2 text-md font-medium ${
                          isActive
                            ? "text-red-600 bg-gray-100 font-bold"
                            : "text-gray-700 hover:bg-gray-100"
                        }`
                      }
                      onClick={handleDropdownClick}
                    >
                      Admin Panel
                    </NavLink>
                  )}
                  <div className="border-t border-gray-100 md:block">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-md font-semibold text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // END: Dropdown Profile
            <Link
              to="/login"
              className="py-2 px-4 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm md:py-1"
              onClick={() => setIsMenuOpen(false)}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
