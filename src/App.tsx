import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { supabase } from "./supabaseClient";
import Onboarding from "./components/Onboarding";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import GroupChat from "./components/GroupChat";

function App() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleOnboardingComplete = () => {
    setIsOnboardingComplete(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
          <span className="text-white text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 overflow-hidden">
        <AnimatePresence mode="wait">
          <Routes>
            <Route
              path="/"
              element={
                !isOnboardingComplete ? (
                  <Onboarding onComplete={handleOnboardingComplete} />
                ) : !session ? (
                  <Navigate to="/auth" replace />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/auth"
              element={
                !session ? (
                  <Auth onAuthSuccess={() => {}} />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/dashboard"
              element={session ? <Dashboard /> : <Navigate to="/auth" replace />}
            />
            <Route
              path="/group/:groupId/chat"
              element={session ? <GroupChat /> : <Navigate to="/auth" replace />}
            />
          </Routes>
        </AnimatePresence>
      </div>
    </Router>
  );
}

export default App;
