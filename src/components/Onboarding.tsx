import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, SkipForward, Zap, Users, PieChart } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    id: 1,
    icon: Zap,
    title: "Track Expenses\nInstantly",
    subtitle: "Snap receipts, categorize automatically, and never lose track of your spending again.",
    gradient: "from-emerald-400 via-cyan-500 to-blue-500"
  },
  {
    id: 2,
    icon: Users,
    title: "Split Bills with\nYour Squad",
    subtitle: "Create groups, chat in real-time, and settle expenses fairly with smart splitting algorithms.",
    gradient: "from-violet-400 via-purple-500 to-indigo-500"
  },
  {
    id: 3,
    icon: PieChart,
    title: "Insights That\nMatter",
    subtitle: "Beautiful analytics, spending trends, and personalized insights to help you save more.",
    gradient: "from-rose-400 via-pink-500 to-purple-500"
  }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const nextSlide = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  }, [currentSlide, onComplete]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  }, [currentSlide]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') nextSlide();
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'Escape') onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col relative overflow-hidden bg-slate-950"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-rose-500/15 to-pink-500/15 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      {/* Skip Button */}
      <motion.button
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={onComplete}
        className="absolute top-8 right-8 z-10 flex items-center gap-2 px-5 py-2.5 bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-full text-slate-300 text-sm font-medium hover:bg-slate-700/80 hover:text-white transition-all duration-300 active:scale-95"
      >
        <SkipForward size={16} />
        Skip
      </motion.button>

      {/* Slide Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-lg"
          >
            {/* Icon */}
            <motion.div
              className={`w-28 h-28 mx-auto mb-10 bg-gradient-to-br ${slides[currentSlide].gradient} rounded-3xl flex items-center justify-center shadow-2xl shadow-black/25 border border-white/10`}
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              {React.createElement(slides[currentSlide].icon, {
                size: 44,
                className: "text-white drop-shadow-lg"
              })}
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-5xl font-bold text-white mb-6 leading-tight tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {slides[currentSlide].title}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-xl text-slate-400 leading-relaxed max-w-md mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {slides[currentSlide].subtitle}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between p-8 relative z-10">
        {/* Previous Button */}
        <motion.button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 active:scale-95 ${
            currentSlide === 0 
              ? 'bg-slate-900/50 border-slate-800/50 text-slate-600' 
              : 'bg-slate-800/80 border-slate-700/50 text-slate-300 hover:bg-slate-700/80 hover:text-white backdrop-blur-xl'
          }`}
          whileHover={currentSlide > 0 ? { scale: 1.05 } : {}}
        >
          <ChevronLeft size={24} />
        </motion.button>

        {/* Slide Indicators */}
        <div className="flex gap-3">
          {slides.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-10 bg-gradient-to-r from-emerald-400 to-cyan-400' 
                  : 'w-2 bg-slate-600 hover:bg-slate-500'
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.8 }}
            />
          ))}
        </div>

        {/* Next/Continue Button */}
        <motion.button
          onClick={nextSlide}
          className="w-14 h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 active:scale-95 border border-white/10"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronRight size={24} />
        </motion.button>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/50">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
          initial={{ width: "0%" }}
          animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
};

export default Onboarding;