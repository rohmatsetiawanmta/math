import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient.js";
import Navbar from "./components/Navbar";
import LatihanSoalPage from "./pages/LatihanSoalPage";
import MainPage from "./pages/MainPage";
import TopicListPage from "./pages/TopicListPage";
import SubtopicListPage from "./pages/SubtopicListPage";
import AdminPage from "./pages/admin/AdminPage";
import HierarchyManager from "./pages/admin/HierarchyManager";
import ProblemManagementPage from "./pages/admin/ProblemManagementPage";
import ProblemDetailPage from "./pages/ProblemDetailPage";
import ProblemListPage from "./pages/ProblemListPage";
import ComingSoon from "./pages/ComingSoon";
import LoginPage from "./pages/LoginPage";
import TheoryManagementPage from "./pages/admin/TheoryManagementPage.jsx";
import UserManagementPage from "./pages/admin/UserManagementPage.jsx";
import UserBookmarksPage from "./pages/UserBookmarkPage.jsx";

const ProtectedRoute = ({ children, userRole, isLoading }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && userRole !== "admin") {
      navigate("/login", { replace: true });
    }
  }, [isLoading, userRole, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-lg">
        Memuat...
      </div>
    );
  }

  return userRole === "admin" ? children : null;
};

function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessionAndRole = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error fetching session:", sessionError);
        setIsLoading(false);
        return;
      }

      setSession(session);
      if (session) {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
          setUserRole(null);
        } else {
          setUserRole(data.role);
        }
      }
      setIsLoading(false);
    };

    fetchSessionAndRole();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session) {
          // Fetch role again if the session changes
          supabase
            .from("users")
            .select("role")
            .eq("id", session.user.id)
            .single()
            .then(({ data, error }) => {
              if (error) {
                console.error("Error fetching user role:", error);
                setUserRole(null);
              } else {
                setUserRole(data.role);
              }
            });
        } else {
          setUserRole(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        userRole={userRole}
        session={session}
        handleLogout={() => supabase.auth.signOut()}
      />
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/latsol" element={<LatihanSoalPage />} />
        <Route path="/latsol/:categoryId" element={<TopicListPage />} />
        <Route
          path="/latsol/:categoryId/:topicId"
          element={<SubtopicListPage />}
        />
        <Route
          path="/latsol/:categoryId/:topicId/:subtopicId"
          element={<ProblemListPage />}
        />
        <Route
          path="/latsol/:categoryId/:topicId/:subtopicId/:problemId"
          element={<ProblemDetailPage />}
        />
        <Route path="/materi" element={<ComingSoon />} />
        <Route path="/drill-soal" element={<ComingSoon />} />

        <Route path="/bookmarks" element={<UserBookmarksPage />} />

        {/* Rute yang dilindungi untuk Admin */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute userRole={userRole} isLoading={isLoading}>
              <Routes>
                <Route path="/" element={<AdminPage />} />
                <Route path="manage" element={<HierarchyManager />} />
                <Route path="problems" element={<ProblemManagementPage />} />
                <Route path="theories" element={<TheoryManagementPage />} />
                <Route path="users" element={<UserManagementPage />} />
              </Routes>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </div>
  );
}

export default App;
