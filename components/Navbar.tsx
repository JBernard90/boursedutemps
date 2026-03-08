
import React, { useState } from 'react';
import { Page, User } from '../types';

interface NavbarProps {
  currentPage: Page;
  user: User | null;
  onNavigate: (p: Page) => void;
  onLogin: () => void;
  onSignup: () => void;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, user, onNavigate, onLogin, onSignup, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems: { label: string; page: Page }[] = [
    { label: 'Accueil', page: 'home' },
    { label: 'À Propos', page: 'about' },
    { label: 'Services', page: 'services' },
    { label: 'Demandes', page: 'requests' },
    { label: 'Membres', page: 'members' },
    { label: 'Forum', page: 'forum' },
    { label: 'Blog', page: 'blog' },
    { label: 'Témoignages', page: 'testimonials' },
  ];

  const isAdminOrMod = user?.role === 'admin' || user?.role === 'moderator';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onNavigate('home')}
          >
            <img 
              src="https://i.postimg.cc/5Y3Rg6zs/image-1.jpg" 
              alt="Logo" 
              className="w-12 h-12 rounded-full shadow-sm group-hover:scale-110 transition-transform object-cover" 
            />
            <span className="font-heading font-bold text-lg text-slate-800 hidden sm:block">
              BOURSE DU TEMPS
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                  currentPage === item.page 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}

            {isAdminOrMod && (
              <button
                onClick={() => onNavigate('moderation')}
                className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ml-2 ${
                  currentPage === 'moderation' 
                    ? 'text-purple-600 bg-purple-50' 
                    : 'text-purple-400 hover:text-purple-600 hover:bg-purple-50/50'
                }`}
              >
                Modération
              </button>
            )}
            
            <div className="ml-4 pl-4 border-l border-slate-100 flex items-center gap-3">
              {user ? (
                <button 
                  onClick={() => onNavigate('profile')}
                  className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full transition hover:bg-blue-100 border border-blue-200"
                >
                  <span className="text-sm font-bold">⏰ {user.credits}</span>
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                    {user.avatar ? (
                      <img src={user.avatar} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-white font-bold">{user.firstName[0]}</span>
                    )}
                  </div>
                </button>
              ) : (
                <button 
                  onClick={onLogin}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-bold transition shadow-lg shadow-blue-100"
                >
                  Accès Membre
                </button>
              )}
            </div>
          </div>

          <button 
            className="lg:hidden p-2 text-slate-600"
            onClick={() => setIsOpen(!isOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 py-4 px-4 space-y-1 shadow-2xl">
          {navItems.map((item) => (
            <button
              key={item.page}
              onClick={() => { onNavigate(item.page); setIsOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-base font-bold ${
                currentPage === item.page ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="pt-4 mt-4 border-t border-slate-100">
            {user ? (
              <button 
                onClick={() => { onNavigate('profile'); setIsOpen(false); }}
                className="w-full bg-blue-50 text-blue-600 py-3 rounded-xl font-bold"
              >
                Mon Profil (⏰ {user.credits})
              </button>
            ) : (
              <button 
                onClick={() => { onLogin(); setIsOpen(false); }}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold"
              >
                Accès Membre
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
