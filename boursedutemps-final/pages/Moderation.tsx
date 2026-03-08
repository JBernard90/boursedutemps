
import React from 'react';
import { User, Service, Request } from '../types';

interface ModerationProps {
  users: User[];
  onUpdateUsers: (users: User[]) => void;
  services: Service[];
  onUpdateServices: (services: Service[]) => void;
  requests: Request[];
  onUpdateRequests: (requests: Request[]) => void;
  currentUser: User;
}

const Moderation: React.FC<ModerationProps> = ({ users, onUpdateUsers, services, onUpdateServices, requests, onUpdateRequests, currentUser }) => {
  const isOwner = currentUser.role === 'admin';

  const changeRole = (userId: string, newRole: 'user' | 'moderator') => {
    if (!isOwner) return alert("Seul l'administrateur principal peut changer les rôles.");
    const updated = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    onUpdateUsers(updated);
  };

  const deleteService = (sid: string) => {
    if (window.confirm("Supprimer cette annonce ?")) {
      const up = services.filter(s => s.id !== sid);
      onUpdateServices(up);
      localStorage.setItem('stb_services', JSON.stringify(up));
    }
  };

  const deleteRequest = (rid: string) => {
    if (window.confirm("Supprimer cette demande ?")) {
      const up = requests.filter(r => r.id !== rid);
      onUpdateRequests(up);
      localStorage.setItem('stb_requests', JSON.stringify(up));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <div className="flex justify-between items-center">
        <h1 className="font-heading text-4xl font-bold text-slate-900">Espace de Modération</h1>
        <div className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl font-bold text-sm">
          Rôle: {currentUser.role === 'admin' ? 'Administrateur Illimité' : 'Modérateur Limité'}
        </div>
      </div>

      {/* Users Section */}
      <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50">
          <h2 className="font-heading text-xl font-bold">Gestion des Membres</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">Utilisateur</th>
                <th className="px-8 py-4">Email</th>
                <th className="px-8 py-4">Rôle Actuel</th>
                <th className="px-8 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100">
                        {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : null}
                      </div>
                      <span className="font-bold text-slate-700 text-sm">{u.firstName} {u.lastName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-xs text-slate-500">{u.email}</td>
                  <td className="px-8 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${u.role === 'admin' ? 'bg-red-50 text-red-500' : u.role === 'moderator' ? 'bg-purple-50 text-purple-500' : 'bg-slate-50 text-slate-500'}`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    {isOwner && u.role !== 'admin' && (
                      <button 
                        onClick={() => changeRole(u.id, u.role === 'moderator' ? 'user' : 'moderator')}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        {u.role === 'moderator' ? 'Révoquer' : 'Promouvoir Modérateur'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Content Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="p-8 border-b border-slate-50">
            <h2 className="font-heading text-xl font-bold">Services Actifs</h2>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-4 space-y-4">
            {services.map(s => (
              <div key={s.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm text-slate-800">{s.title}</p>
                  <p className="text-[10px] text-slate-400">Par {s.userName}</p>
                </div>
                <button onClick={() => deleteService(s.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition">
                  🗑
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="p-8 border-b border-slate-50">
            <h2 className="font-heading text-xl font-bold">Demandes Actives</h2>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-4 space-y-4">
            {requests.map(r => (
              <div key={r.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm text-slate-800">{r.title}</p>
                  <p className="text-[10px] text-slate-400">Par {r.userName}</p>
                </div>
                <button onClick={() => deleteRequest(r.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition">
                  🗑
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Moderation;
