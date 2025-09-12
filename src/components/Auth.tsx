import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface AuthProps {
  onAuthSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // Email/Password login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        // Sign Up
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        });
        if (error) throw error;
      }

      onAuthSuccess();
    } catch (err: any) {
      console.error('Auth error:', err.message);
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('OAuth error:', err.message);
      alert(err.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950"
    >
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-rose-500/15 to-pink-500/15 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-md bg-slate-900/80 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-slate-700/50 relative z-10"
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/25 border border-white/10">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>SpendWise</h1>
          <p className="text-slate-400">Smart expense tracking made simple</p>
        </motion.div>

        {/* Tab Switcher */}
        <motion.div
          className="flex bg-slate-800/50 rounded-2xl p-1 mb-6 border border-slate-700/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
              isLogin 
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
              !isLogin 
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </motion.div>

        {/* Form */}
        <AnimatePresence mode="wait">
          <motion.form
            key={isLogin ? 'login' : 'signup'}
            initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {!isLogin && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Sparkles className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                required
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-slate-400 hover:text-emerald-400 transition-colors"
                  onClick={async () => {
                    if (!email) return alert("Enter your email first");
                    const { error } = await supabase.auth.resetPasswordForEmail(email);
                    if (error) alert(error.message);
                    else alert("Password reset email sent!");
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 border border-white/10"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </motion.form>
        </AnimatePresence>

        {/* OAuth Buttons */}
        <motion.div
          className="mt-6 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-center text-slate-500 text-sm mb-4">
            or continue with
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleOAuthLogin('google')}
              className="py-3 px-4 bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-xl text-white font-medium hover:bg-slate-700/50 hover:border-slate-600/50 transition-all duration-300 active:scale-95"
            >
              Google
            </button>
            <button
              onClick={() => handleOAuthLogin('apple')}
              className="py-3 px-4 bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-xl text-white font-medium hover:bg-slate-700/50 hover:border-slate-600/50 transition-all duration-300 active:scale-95"
            >
              Apple
            </button>
          </div>
        </motion.div>

        {/* Terms */}
        <motion.p
          className="text-center text-xs text-slate-500 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          By continuing, you agree to our Terms of Service and Privacy Policy
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default Auth;