/**
 * Header.tsx
 * -----------------------------------------------
 * Top navigation bar. Clean, minimal design with
 * teal active-link indicator. No gradient logos.
 * -----------------------------------------------
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, User, LogOut, Settings, Bot, Briefcase } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { AuthModal } from '../auth/AuthModal';

export function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* -- Logo / Brand -- */}
            <Link to={isAuthenticated ? '/dashboard' : '/'}>
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-4.5 h-4.5 text-white" />
                </div>
                <h1 className="text-lg font-semibold text-slate-100 tracking-tight">
                  Resumate
                </h1>
              </div>
            </Link>

            {/* -- Nav links (authenticated) -- */}
            {isAuthenticated ? (
              <nav className="hidden md:flex items-center space-x-6">
                <NavLink to="/dashboard" current={location.pathname}>
                  Dashboard
                </NavLink>
                <NavLink to="/editor" current={location.pathname}>
                  Editor
                </NavLink>
                <NavLink to="/preview" current={location.pathname}>
                  Preview
                </NavLink>
                <NavLink to="/ai-assistant" current={location.pathname}>
                  <Bot className="w-3.5 h-3.5 mr-1.5" />
                  AI Assistant
                </NavLink>
                <NavLink to="/applications" current={location.pathname}>
                  <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                  Applications
                </NavLink>
              </nav>
            ) : (
              /* -- Nav links (public) -- */
              <nav className="hidden md:flex items-center space-x-6">
                <a
                  href="#features"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Features
                </a>
                <a
                  href="#templates"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Templates
                </a>
              </nav>
            )}

            {/* -- Right side actions -- */}
            <div className="flex items-center space-x-3">
              {isAuthenticated ? (
                <div className="relative">
                  {/* User avatar button */}
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-7 h-7 rounded-full"
                      />
                    ) : (
                      <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    )}
                    <span className="hidden sm:block text-sm text-slate-300">
                      {user?.name}
                    </span>
                  </button>

                  {/* Dropdown menu */}
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute right-0 mt-2 w-44 bg-surface-900 border border-slate-700/60 rounded-lg shadow-xl py-1"
                    >
                      <MenuButton icon={<User className="w-4 h-4" />}>
                        Profile
                      </MenuButton>
                      <MenuButton icon={<Settings className="w-4 h-4" />}>
                        Settings
                      </MenuButton>
                      <hr className="border-slate-700/60 my-1" />
                      <button
                        onClick={logout}
                        className="w-full px-4 py-2 text-left text-red-400 hover:bg-slate-800 flex items-center space-x-2 text-sm"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAuthModal(true)}
                  >
                    Sign in
                  </Button>
                  <Button size="sm" onClick={() => setShowAuthModal(true)}>
                    Get started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}

/* -- Helper: Navigation link with active indicator -- */
function NavLink({
  to,
  current,
  children,
}: {
  to: string;
  current: string;
  children: React.ReactNode;
}) {
  const isActive = current === to;

  return (
    <Link
      to={to}
      className={`flex items-center text-sm transition-colors relative ${
        isActive
          ? 'text-teal-400 font-medium'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
      {/* -- Active underline indicator -- */}
      {isActive && (
        <motion.span
          layoutId="nav-indicator"
          className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-teal-500 rounded-full"
        />
      )}
    </Link>
  );
}

/* -- Helper: Menu dropdown button -- */
function MenuButton({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button className="w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-800 flex items-center space-x-2 text-sm">
      {icon}
      <span>{children}</span>
    </button>
  );
}
