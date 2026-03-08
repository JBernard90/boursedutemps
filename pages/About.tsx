
import React from 'react';

const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="text-center mb-16">
        <h1 className="font-heading text-5xl font-bold text-slate-900 mb-6">Notre Philosophie</h1>
        <p className="text-xl text-slate-600 font-medium">Réinventer l'entraide communautaire par le temps.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100">
          <span className="text-4xl mb-6 block">🎯</span>
          <h2 className="font-heading text-2xl font-bold text-slate-900 mb-4">Notre Mission</h2>
          <p className="text-slate-500 leading-relaxed">
            Créer un écosystème d'échange où chaque membre peut valoriser ses compétences sans barrière financière. Nous croyons que le savoir partagé est la plus grande des richesses.
          </p>
        </div>
        <div className="bg-blue-600 p-10 rounded-[2.5rem] text-white shadow-xl shadow-blue-200">
          <span className="text-4xl mb-6 block">💡</span>
          <h2 className="font-heading text-2xl font-bold mb-4">La Vision</h2>
          <p className="opacity-90 leading-relaxed">
            Bâtir la plus grande communauté d'innovation sociale africaine en favorisant les ponts entre les départements et les expertises des étudiants de Senghor.
          </p>
        </div>
      </div>

      <div className="space-y-12">
        <h2 className="font-heading text-3xl font-bold text-slate-900 text-center mb-8">Comment ça marche ?</h2>
        <div className="relative border-l-2 border-slate-100 pl-10 space-y-12 ml-4">
          <div className="relative">
            <div className="absolute -left-[54px] top-0 w-8 h-8 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white font-bold text-xs">1</div>
            <h3 className="font-heading font-bold text-xl mb-2">Inscrivez-vous</h3>
            <p className="text-slate-500">Créez votre profil en mentionnant votre département et vos compétences. Recevez 5 crédits de bienvenue.</p>
          </div>
          <div className="relative">
            <div className="absolute -left-[54px] top-0 w-8 h-8 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white font-bold text-xs">2</div>
            <h3 className="font-heading font-bold text-xl mb-2">Proposez & Négociez</h3>
            <p className="text-slate-500">Mettez en ligne un service. Négociez le nombre de crédits selon le temps et l'effort. 1h ne vaut pas forcément 1 crédit si la tâche est complexe.</p>
          </div>
          <div className="relative">
            <div className="absolute -left-[54px] top-0 w-8 h-8 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white font-bold text-xs">3</div>
            <h3 className="font-heading font-bold text-xl mb-2">Échangez</h3>
            <p className="text-slate-500">Contactez les membres via WhatsApp, réalisez la prestation et validez le transfert de crédits. Votre solde se met à jour instantanément.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
