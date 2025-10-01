import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import toast from "react-hot-toast";
import { CheckCircle, Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

// Helper function to generate link path (adapted from existing UserDashboardPage logic)
const generateProblemLinkPath = (problemId, hierarchyMap) => {
  // Memastikan data hierarki ada sebelum membangun path
  if (!hierarchyMap[problemId]) return null;
  const { category_id, topic_id, subtopic_id } = hierarchyMap[problemId];
  // Asumsi base path adalah '/latsol'
  return `/math/latsol/${category_id}/${topic_id}/${subtopic_id}/${problemId}`;
};

const ReportManagementPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // State untuk menyimpan map hierarki soal agar cepat membuat tautan
  const [problemHierarchyMap, setProblemHierarchyMap] = useState({});

  const reportStatuses = ["open", "in_progress", "resolved"];

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Laporan & User (email dari join)
      // Menggunakan sintaks join yang paling aman: user_id(email)
      const { data: reportData, error: reportError } = await supabase
        .from("problem_reports")
        .select(
          `
            *,
            users(*) 
        `
        )
        .order("created_at", { ascending: false });

      if (reportError) throw reportError;

      // Ambil problem_id unik untuk mencari hierarki
      const uniqueProblemIds = [
        ...new Set(reportData.map((r) => r.problem_id)),
      ];

      // 2. Fetch Hierarki Soal (untuk link ke halaman soal)
      let hierarchyMap = {};
      if (uniqueProblemIds.length > 0) {
        const { data: problemsData, error: problemsError } = await supabase
          .from("problems")
          .select(
            `
                  problem_id,
                  subtopic:subtopic_id(
                      subtopic_id,
                      topic:topic_id(
                          topic_id,
                          category:category_id(
                              category_id
                          )
                      )
                  )
              `
          )
          .in("problem_id", uniqueProblemIds);

        if (problemsError)
          console.error("Error fetching problem hierarchy:", problemsError);

        // Membangun map: PR-XXXXXXXX -> {category_id, topic_id, subtopic_id}
        problemsData.forEach((p) => {
          hierarchyMap[p.problem_id] = {
            category_id: p.subtopic?.topic?.category?.category_id,
            topic_id: p.subtopic?.topic?.topic_id,
            subtopic_id: p.subtopic?.subtopic_id,
          };
        });
      }

      setProblemHierarchyMap(hierarchyMap);
      setReports(reportData);
    } catch (e) {
      console.error("Error fetching reports:", e);
      setError(e.message);
      toast.error("Gagal memuat laporan!");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleStatusChange = async (reportId, newStatus) => {
    const { error } = await supabase
      .from("problem_reports")
      .update({ report_status: newStatus })
      .eq("id", reportId); // Menggunakan internal ID (uuid) untuk update

    if (error) {
      console.error("Error updating status:", error);
      toast.error("Gagal memperbarui status laporan!");
    } else {
      toast.success(
        `Status berhasil diubah menjadi ${newStatus.replace("_", " ")}!`
      );
      // Update state lokal
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, report_status: newStatus } : r
        )
      );
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "resolved":
        return <CheckCircle size={16} className="text-green-500" />;
      case "in_progress":
        return <Clock size={16} className="text-blue-500" />;
      case "open":
      default:
        return <AlertTriangle size={16} className="text-red-500" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-lg">
        Memuat laporan...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-red-500">
        Gagal memuat laporan: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="mb-6 text-3xl font-bold text-gray-800 flex items-center gap-3">
        Manajemen Laporan Soal ({reports.length})
      </h2>

      <p className="mb-4 text-gray-600">Total Laporan: {reports.length}</p>

      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                ID Laporan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Waktu
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Tipe / Detail
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Pelapor
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Soal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {reports.map((report) => {
              const problemLink = generateProblemLinkPath(
                report.problem_id,
                problemHierarchyMap
              );

              return (
                <tr
                  key={report.id}
                  className={`${
                    report.report_status === "resolved"
                      ? "bg-green-50/50"
                      : report.report_status === "in_progress"
                      ? "bg-blue-50/50"
                      : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {report.report_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                    {new Date(report.created_at).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <p className="font-semibold text-red-700">
                      {report.report_type}
                    </p>
                    <p
                      className="text-xs text-gray-600 mt-1 line-clamp-2"
                      title={report.report_content}
                    >
                      {report.report_content}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {/* Akses data email melalui report.user_id.email */}
                    {report.users?.email || "Pengguna Tidak Dikenal"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {problemLink ? (
                      <a
                        href={problemLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-mono flex items-center justify-center gap-1"
                      >
                        {report.problem_id} <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="text-gray-400">{report.problem_id}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize 
                      ${
                        report.report_status === "resolved"
                          ? "bg-green-100 text-green-800"
                          : report.report_status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {getStatusIcon(report.report_status)}{" "}
                      {report.report_status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <select
                      value={report.report_status}
                      onChange={(e) =>
                        handleStatusChange(report.id, e.target.value)
                      }
                      className="rounded-md border p-1 text-gray-800 text-xs"
                    >
                      {reportStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() +
                            status.slice(1).replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportManagementPage;
