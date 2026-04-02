import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dices, Menu, X, Sparkles } from 'lucide-react';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: '首页', path: '/' },
    { name: '桌游分类', path: '/categories' },
    { name: '热门推荐', path: '/trending' },
    { name: '新手入门', path: '/beginners' },
    { name: '关于我们', path: '/about' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header data-cmp="Header" className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-border shadow-sm">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-primary text-primary-foreground p-2 rounded-xl group-hover:rotate-12 transition-transform duration-300">
            <Dices size={28} />
          </div>
          <span className="text-2xl font-bold text-foreground flex items-center gap-1">
            落樱<span className="text-primary">桌游</span>库
            <Sparkles size={16} className="text-secondary animate-pulse" />
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-lg font-medium transition-colors hover-wiggle ${
                isActive(link.path) ? 'text-primary' : 'text-muted-foreground hover:text-primary'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <Link 
            to="/categories" 
            className="btn-bounce bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-bold shadow-custom hover:bg-primary/90 transition-colors"
          >
            找桌游
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2 text-foreground"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-border shadow-lg py-4 px-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-lg font-medium p-3 rounded-xl ${
                isActive(link.path) ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
};

export default Header;