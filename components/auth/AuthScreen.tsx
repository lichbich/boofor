"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LogIn, UserPlus, KeyRound, User, Eye, EyeOff, Sparkles } from "lucide-react";

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!username.trim() || !password) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password);
        setSuccessMsg("Đăng ký thành công! Hãy chuyển sang Đăng nhập.");
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setSuccessMsg(null);
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d1117] p-4 relative overflow-hidden font-sans transition-colors duration-300">
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-100 dark:bg-indigo-950/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-100 dark:bg-violet-950/20 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-white dark:bg-[#161b22] border border-gray-150 rounded-2xl shadow-xl p-8 relative z-10 transition-all duration-300 hover:shadow-2xl hover:border-indigo-200 dark:hover:border-indigo-500/30">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 mb-4 shadow-inner relative group overflow-hidden">
            <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400 relative z-10 animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-800 dark:text-slate-100">
            Chào mừng đến boofor
          </h2>
          <p className="text-gray-500 dark:text-slate-400 mt-2 text-sm">
            {isLogin
              ? "Đăng nhập để vào hệ thống của bạn"
              : "Đăng ký tài khoản để bắt đầu trải nghiệm"}
          </p>
          <span className="text-black dark:text-slate-300 mt-2 text-sm block">telegram: @caramencafe</span>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-sm animate-fadeIn flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-300 text-sm animate-fadeIn flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wider uppercase block">
              Tên đăng nhập
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập..."
                disabled={submitting}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:bg-white dark:focus:bg-[#0d1117] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all text-sm"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wider uppercase block">
              Mật khẩu
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                disabled={submitting}
                className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-450 dark:placeholder-gray-600 focus:outline-none focus:bg-white dark:focus:bg-[#0d1117] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-350 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Confirm (Register only) */}
          {!isLogin && (
            <div className="space-y-2 animate-slideDown">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wider uppercase block">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Xác nhận mật khẩu..."
                  disabled={submitting}
                  className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 rounded-xl text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:bg-white dark:focus:bg-[#0d1117] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all text-sm"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-2 font-sans"
          >
            {submitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" />
                Đăng nhập
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Đăng ký tài khoản
              </>
            )}
          </button>
        </form>

        {/* Footer toggle */}
        <div className="mt-8 text-center border-t border-gray-150 pt-6">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
            <button
              onClick={toggleMode}
              disabled={submitting}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold cursor-pointer transition-colors focus:outline-none inline-flex items-center gap-1 group"
            >
              {isLogin ? "Đăng ký ngay" : "Quay lại Đăng nhập"}
              <span className="transform group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
