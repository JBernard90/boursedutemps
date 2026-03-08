
import React from 'react';
import { Page, BlogPost, Testimonial } from '../types';
import NewsTicker from '../components/NewsTicker';

interface HomeProps {
  navigate: (p: Page) => void;
  blogs: BlogPost[];
  testimonials: Testimonial[];
  stats: {
    totalVisitors: number;
    activeMembers: number;
    offlineMembers: number;
    exchangesInProgress: number;
    exchangesProposed: number;
    exchangesAccepted: number;
  };
}

const Home: React.FC<HomeProps> = ({ navigate, blogs, testimonials, stats }) => {
  return (
    <div className="flex flex-col">
      {/* Hero Section sans photo, avec espace pour les news */}
      <section className="relative min-h-[60vh] flex flex-col items-center justify-center overflow-hidden py-24 px-6 bg-white">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-slate-50 rounded-full blur-3xl opacity-50"></div>

        <div className="relative z-10 max-w-5xl mx-auto text-center animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="inline-block px-4 py-1.5 mb-8 rounded-full bg-blue-50 border border-blue-100">
             <span className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em]">Université Senghor - Alexandrie</span>
          </div>
          
          <h1 className="font-heading text-5xl md:text-8xl font-bold text-slate-900 mb-8 leading-tight uppercase tracking-tighter">
            BOURSE DU TEMPS
          </h1>
          
          <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
            Échangez vos talents, apprenez gratuitement et construisez l'avenir au sein de notre banque de temps solidaire.
          </p>
          
          <div className="flex items-center justify-center mb-16">
            <button 
              onClick={() => navigate('services')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-2xl font-bold text-xl transition-all transform hover:scale-105 shadow-2xl shadow-blue-200"
            >
              Échanger mon temps
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-6 mb-24">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Visiteurs', value: stats.totalVisitors, icon: '👁️', color: 'blue' },
            { label: 'Membres Actifs', value: stats.activeMembers, icon: '🟢', color: 'green' },
            { label: 'Hors Ligne', value: stats.offlineMembers, icon: '⚪', color: 'slate' },
            { label: 'En Cours', value: stats.exchangesInProgress, icon: '⏳', color: 'orange' },
            { label: 'Proposés', value: stats.exchangesProposed, icon: '💡', color: 'indigo' },
            { label: 'Acceptés', value: stats.exchangesAccepted, icon: '✅', color: 'emerald' },
          ].map((stat, i) => (
            <div 
              key={i}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center animate-in fade-in zoom-in duration-500"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="text-2xl mb-2 block">{stat.icon}</span>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BANDEAU ACTUALITÉS (Transformé en Carrousel) */}
      <div className="bg-slate-50 py-16 border-y border-slate-100 shadow-inner">
        <div className="max-w-7xl mx-auto px-6 mb-10 flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dernières actualités & Succès</span>
            </div>
            <h2 className="font-heading text-3xl font-bold text-slate-900">Le fil de la communauté</h2>
          </div>
          <button onClick={() => navigate('blog')} className="text-blue-600 font-bold hover:underline text-sm uppercase tracking-wider">
            Tout voir →
          </button>
        </div>
        <NewsTicker blogs={blogs} testimonials={testimonials} navigate={navigate} />
      </div>

      {/* Features Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-sm">⚖️</div>
            <h3 className="font-heading font-bold text-2xl mb-4 text-slate-900">Négociation Juste</h3>
            <p className="text-slate-500 leading-relaxed">Fixez librement le coût en crédits. Une tâche complexe peut valoir plus qu'une tâche simple. Tout est négociable entre membres.</p>
          </div>
          <div className="bg-blue-600 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-blue-200 transform hover:scale-[1.02] transition-transform">
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-3xl mb-6">📸</div>
            <h3 className="font-heading font-bold text-2xl mb-4">Feed Social Interactif</h3>
            <p className="opacity-90 leading-relaxed">Partagez vos moments d'entraide en photos et vidéos directement depuis votre appareil sur notre blog communautaire.</p>
          </div>
          <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-sm">📊</div>
            <h3 className="font-heading font-bold text-2xl mb-4 text-slate-900">Suivi & Transparence</h3>
            <p className="text-slate-500 leading-relaxed">Un système de suivi précis enregistre chaque crédit débité ou crédité à votre compte pour une transparence totale.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
