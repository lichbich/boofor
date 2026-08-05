"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, X, Shield, ShieldCheck, UserCheck, AlertTriangle, ChevronDown } from "lucide-react";

interface UserAccount {
  username: string;
  role: "admin" | "user" | "guest";
  createdAt: string;
  isOnline: boolean;
  isCurrent: boolean;
}

export const ManageRoles: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeDropdownUser, setActiveDropdownUser] = useState<string | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".role-dropdown-container")) {
        setActiveDropdownUser(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("boofor_session_id") : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/admin/users", { headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể tải danh sách tài khoản");
      }

      setUsers(data.users || []);
      setOnlineCount(data.onlineCount || 0);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (targetUsername: string, newRole: string) => {
    setActionLoading(targetUsername);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("boofor_session_id") : null;
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ targetUsername, newRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể cập nhật quyền hạn");
      }

      // Refresh list
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi cập nhật quyền hạn");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (targetUsername: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${targetUsername}"? Hành động này không thể hoàn tác.`)) {
      return;
    }

    setActionLoading(targetUsername);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("boofor_session_id") : null;
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ targetUsername }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể xóa người dùng");
      }

      // Refresh list
      await fetchUsers();
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi xóa người dùng");
    } finally {
      setActionLoading(null);
    }
  };

  // Group users
  const admins = users.filter((u) => u.role === "admin");
  const verifiedUsers = users.filter((u) => u.role === "user");
  const guests = users.filter((u) => u.role === "guest");

  const currentUser = users.find((u) => u.isCurrent);
  const isSuperAdmin = currentUser?.username === "liam";

  // Helper to generate a background color for avatars based on username
  const getAvatarBg = (username: string) => {
    const colors = [
      "bg-red-500",
      "bg-orange-500",
      "bg-amber-500",
      "bg-emerald-500",
      "bg-teal-500",
      "bg-blue-500",
      "bg-indigo-500",
      "bg-violet-500",
      "bg-pink-500",
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-6 font-sans transition-colors duration-300">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#161b22] p-6 rounded-2xl shadow-sm border border-gray-100 transition-colors duration-300">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100 tracking-tight">Manage Roles</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              {onlineCount} Online
            </span>
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            Review user accounts and change their permissions.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-250 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-[#1f2937] text-gray-600 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-400 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh List
        </button>
      </div>

      {/* Display error if any */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-sm animate-fadeIn flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid columns */}
      {loading && users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white dark:bg-[#161b22] rounded-2xl border border-gray-100 shadow-sm">
          <span className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm animate-pulse">Đang tải dữ liệu...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Administrators */}
          <div className="bg-white dark:bg-[#161b22] p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 transition-colors duration-300">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h2 className="text-indigo-600 dark:text-indigo-400 text-md font-bold tracking-wide flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                Administrators
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400">
                {admins.length}
              </span>
            </div>

            <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-visible">
              {admins.length === 0 ? (
                <p className="p-4 text-gray-400 text-sm text-center">Không có quản trị viên nào</p>
              ) : (
                admins.map((user, idx) => {
                  const isLast = idx === admins.length - 1 && admins.length >= 2;
                  return (
                    <div key={user.username} className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-[#0d1117]/50 transition-colors first:rounded-t-xl last:rounded-b-xl">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-full ${getAvatarBg(user.username)} flex items-center justify-center text-sm font-bold text-white shadow-inner uppercase`}>
                          {user.username.charAt(0)}
                        </div>

                        {/* Info */}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-800 dark:text-slate-200 text-sm">{user.username}</span>
                            <span className={`w-2 h-2 rounded-full ${user.isOnline ? "bg-emerald-500" : "bg-gray-300"}`} />
                          </div>
                          {user.isCurrent && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold tracking-widest block mt-0.5">
                              YOUR ACCOUNT
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action: Only allow role change/delete if current user is liam and target is not liam */}
                      {isSuperAdmin && user.username !== "liam" ? (
                        <div className="flex items-center gap-2 role-dropdown-container">
                          <div className="relative">
                            <button
                              type="button"
                              disabled={actionLoading === user.username}
                              onClick={() => setActiveDropdownUser(activeDropdownUser === user.username ? null : user.username)}
                              className="w-24 pl-2.5 pr-7 py-1.5 bg-white dark:bg-[#0d1117]/20 border border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-slate-200 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold cursor-pointer shadow-sm text-left flex items-center justify-between transition-all duration-200"
                            >
                              <span className="capitalize">{user.role}</span>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-gray-400 dark:text-slate-500 transition-transform duration-200 ${
                                  activeDropdownUser === user.username ? "rotate-180" : ""
                                }`}
                              />
                            </button>

                            {activeDropdownUser === user.username && (
                              <div className={`absolute right-0 z-50 w-24 ${isLast ? "bottom-full mb-1" : "top-full mt-1"} bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg shadow-lg py-1 divide-y divide-gray-50 dark:divide-slate-800 animate-fadeIn`}>
                                {["admin", "user", "guest"].map((role) => (
                                  <button
                                    key={role}
                                    type="button"
                                    onClick={() => {
                                      handleRoleChange(user.username, role);
                                      setActiveDropdownUser(null);
                                    }}
                                    className={`w-full px-2.5 py-1.5 text-xs text-left cursor-pointer transition-colors capitalize ${
                                      user.role === role
                                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold"
                                        : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                                    }`}
                                  >
                                    {role}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleDeleteUser(user.username)}
                            disabled={actionLoading === user.username}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent hover:border-red-200 dark:hover:border-red-900/50 rounded-lg text-red-500 hover:text-red-400 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                            title="Xóa tài khoản"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-gray-500 dark:text-slate-400 font-semibold text-xs px-2.5 py-1 rounded bg-gray-100 dark:bg-[#0d1117] border border-gray-250">
                          Admin
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: Verified Users */}
          <div className="bg-white dark:bg-[#161b22] p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 transition-colors duration-300">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h2 className="text-sky-600 dark:text-sky-400 text-md font-bold tracking-wide flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                Verified Users
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/50 text-sky-700 dark:text-sky-400">
                {verifiedUsers.length}
              </span>
            </div>

            <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-visible">
              {verifiedUsers.length === 0 ? (
                <p className="p-4 text-gray-400 text-sm text-center">Không có tài khoản người dùng</p>
              ) : (
                verifiedUsers.map((user, idx) => {
                  const isLast = idx === verifiedUsers.length - 1 && verifiedUsers.length >= 2;
                  return (
                    <div key={user.username} className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-[#0d1117]/50 transition-colors first:rounded-t-xl last:rounded-b-xl">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full ${getAvatarBg(user.username)} flex items-center justify-center text-sm font-bold text-white shadow-inner uppercase`}>
                        {user.username.charAt(0)}
                      </div>

                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-800 dark:text-slate-200 text-sm">{user.username}</span>
                          <span className={`w-2 h-2 rounded-full ${user.isOnline ? "bg-emerald-500" : "bg-gray-300"}`} />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 role-dropdown-container">
                      <div className="relative">
                        <button
                          type="button"
                          disabled={actionLoading === user.username}
                          onClick={() => setActiveDropdownUser(activeDropdownUser === user.username ? null : user.username)}
                          className="w-24 pl-2.5 pr-7 py-1.5 bg-white dark:bg-[#0d1117]/20 border border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-slate-200 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold cursor-pointer shadow-sm text-left flex items-center justify-between transition-all duration-200"
                        >
                          <span className="capitalize">{user.role}</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-gray-400 dark:text-slate-500 transition-transform duration-200 ${
                              activeDropdownUser === user.username ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {activeDropdownUser === user.username && (
                          <div className={`absolute right-0 z-50 w-24 ${isLast ? "bottom-full mb-1" : "top-full mt-1"} bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg shadow-lg py-1 divide-y divide-gray-50 dark:divide-slate-800 animate-fadeIn`}>
                            {["admin", "user", "guest"]
                              .filter((role) => role !== "admin" || isSuperAdmin)
                              .map((role) => (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() => {
                                    handleRoleChange(user.username, role);
                                    setActiveDropdownUser(null);
                                  }}
                                  className={`w-full px-2.5 py-1.5 text-xs text-left cursor-pointer transition-colors capitalize ${
                                    user.role === role
                                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold"
                                      : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                                  }`}
                                >
                                  {role}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteUser(user.username)}
                        disabled={actionLoading === user.username}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent hover:border-red-200 dark:hover:border-red-900/50 rounded-lg text-red-500 hover:text-red-400 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                        title="Xóa tài khoản"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );})
              )}
            </div>
          </div>

          {/* Column 3: Guests / Pending */}
          <div className="bg-white dark:bg-[#161b22] p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 transition-colors duration-300">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h2 className="text-orange-600 dark:text-orange-400 text-md font-bold tracking-wide flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                Guests / Pending
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-400">
                {guests.length}
              </span>
            </div>

            <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-visible">
              {guests.length === 0 ? (
                <p className="p-4 text-gray-400 text-sm text-center">Không có tài khoản đang chờ duyệt</p>
              ) : (
                guests.map((user, idx) => {
                  const isLast = idx === guests.length - 1 && guests.length >= 2;
                  return (
                    <div key={user.username} className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-[#0d1117]/50 transition-colors first:rounded-t-xl last:rounded-b-xl">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full ${getAvatarBg(user.username)} flex items-center justify-center text-sm font-bold text-white shadow-inner uppercase`}>
                        {user.username.charAt(0)}
                      </div>

                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-800 dark:text-slate-200 text-sm">{user.username}</span>
                          <span className={`w-2 h-2 rounded-full ${user.isOnline ? "bg-emerald-500" : "bg-gray-300"}`} />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 role-dropdown-container">
                      <div className="relative">
                        <button
                          type="button"
                          disabled={actionLoading === user.username}
                          onClick={() => setActiveDropdownUser(activeDropdownUser === user.username ? null : user.username)}
                          className="w-24 pl-2.5 pr-7 py-1.5 bg-white dark:bg-[#0d1117]/20 border border-gray-200 dark:border-[#30363d] text-gray-800 dark:text-slate-200 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold cursor-pointer shadow-sm text-left flex items-center justify-between transition-all duration-200"
                        >
                          <span className="capitalize">{user.role}</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-gray-400 dark:text-slate-500 transition-transform duration-200 ${
                              activeDropdownUser === user.username ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {activeDropdownUser === user.username && (
                          <div className={`absolute right-0 z-50 w-24 ${isLast ? "bottom-full mb-1" : "top-full mt-1"} bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg shadow-lg py-1 divide-y divide-gray-50 dark:divide-slate-800 animate-fadeIn`}>
                            {["admin", "user", "guest"]
                              .filter((role) => role !== "admin" || isSuperAdmin)
                              .map((role) => (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() => {
                                    handleRoleChange(user.username, role);
                                    setActiveDropdownUser(null);
                                  }}
                                  className={`w-full px-2.5 py-1.5 text-xs text-left cursor-pointer transition-colors capitalize ${
                                    user.role === role
                                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold"
                                      : "text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                                  }`}
                                >
                                  {role}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteUser(user.username)}
                        disabled={actionLoading === user.username}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent hover:border-red-200 dark:hover:border-red-900/50 rounded-lg text-red-500 hover:text-red-400 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                        title="Xóa tài khoản"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );})
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
