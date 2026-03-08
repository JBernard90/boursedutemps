
import React, { useState } from 'react';
import { User, Transaction, Connection, ChatMessage } from '../types';

interface ProfileProps {
  user: User;
  currentUser?: User | null;
  allUsers: User[];
  transactions: Transaction[];
  connections: Connection[];
  messages: ChatMessage[];
  onUpdate: (u: User) => void;
  onSendConnection?: (targetUid: string) => void;
  onUpdateConnection?: (connectionId: string, status: 'accepted' | 'refused' | 'cancelled') => void;
  onUpdateMessages: (m: ChatMessage[]) => void;
  onDeactivate?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

const Profile: React.FC<ProfileProps> = ({ 
  user, 
  currentUser, 
  allUsers,
  transactions, 
  connections,
  messages,
  onUpdate, 
  onSendConnection,
  onUpdateConnection,
  onUpdateMessages,
  onDeactivate,
  onDelete,
  readOnly = false 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [activeTab, setActiveTab] = useState<'info' | 'connections' | 'messages' | 'suivi'>('info');
  const [messageContent, setMessageContent] = useState('');
  const [selectedChatPartner, setSelectedChatPartner] = useState<string | null>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onUpdate(editedUser);
    setIsEditing(false);
    alert("Profil mis à jour !");
  };

  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedUser({ ...editedUser, coverPhoto: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const userTransactions = transactions.filter(t => t.fromId === user.uid || t.toId === user.uid);
  
  // Connections logic
  const myConnections = connections.filter(c => (c.senderId === user.uid || c.receiverId === user.uid) && c.status === 'accepted');
  const pendingRequests = connections.filter(c => c.receiverId === user.uid && c.status === 'sent');
  const sentRequests = connections.filter(c => c.senderId === user.uid && c.status === 'sent');

  const getConnectionStatus = () => {
    if (!currentUser) return null;
    const conn = connections.find(c => 
      (c.senderId === currentUser.uid && c.receiverId === user.uid) || 
      (c.senderId === user.uid && c.receiverId === currentUser.uid)
    );
    return conn;
  };

  const connection = getConnectionStatus();

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
        <div className="h-48 bg-slate-900 p-8 flex items-end justify-between relative group">
          {isEditing ? (
            editedUser.coverPhoto ? (
              <img src={editedUser.coverPhoto} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="Cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-indigo-900 opacity-80"></div>
            )
          ) : (
            user.coverPhoto ? (
              <img src={user.coverPhoto} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="Cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-indigo-900 opacity-80"></div>
            )
          )}
          <div className="absolute inset-0 bg-black/20"></div>
          
          {isEditing && (
            <div className="absolute top-4 right-4 z-20">
              <input type="file" accept="image/*" className="hidden" ref={coverInputRef} onChange={handleCoverPhotoChange} />
              <button onClick={() => coverInputRef.current?.click()} className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-xl font-bold transition border border-white/30 text-sm">
                📷 Changer la couverture
              </button>
            </div>
          )}

          <div className="flex items-center gap-6 translate-y-12 relative z-10">
            <div className="w-32 h-32 rounded-3xl bg-white p-2 shadow-2xl">
              <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden">
                {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <span className="text-4xl">👤</span>}
              </div>
            </div>
            <div className="pb-4">
              <div className="bg-white/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl">
                <h2 className="font-heading text-2xl font-bold text-slate-900">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">{user.department}</p>
              </div>
            </div>
          </div>
          
          {readOnly && currentUser && currentUser.uid !== user.uid && (
            <div className="relative z-10 flex gap-4">
              {!connection && (
                <button onClick={() => onSendConnection?.(user.uid)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition">
                  Se connecter
                </button>
              )}
              {connection?.status === 'sent' && connection.senderId === currentUser.uid && (
                <button onClick={() => onUpdateConnection?.(connection.id, 'cancelled')} className="bg-slate-700 text-white px-6 py-3 rounded-2xl font-bold transition">
                  Annuler la demande
                </button>
              )}
              {connection?.status === 'sent' && connection.receiverId === currentUser.uid && (
                <div className="flex gap-2">
                  <button onClick={() => onUpdateConnection?.(connection.id, 'accepted')} className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold transition">Accepter</button>
                  <button onClick={() => onUpdateConnection?.(connection.id, 'refused')} className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold transition">Refuser</button>
                </div>
              )}
              {connection?.status === 'accepted' && (
                <span className="bg-green-500/20 backdrop-blur-md text-green-100 px-6 py-3 rounded-2xl font-bold border border-green-500/30">
                  Connecté
                </span>
              )}
            </div>
          )}

          {!readOnly && (
            <button onClick={() => setIsEditing(true)} className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-bold transition border border-white/30 relative z-10">
              Modifier
            </button>
          )}
        </div>

        {/* Tabs */}
        {!readOnly && (
          <div className="mt-20 px-10 border-b border-slate-100 flex gap-8">
            <button onClick={() => setActiveTab('info')} className={`pb-4 text-sm font-bold uppercase tracking-widest transition ${activeTab === 'info' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Profil</button>
            <button onClick={() => setActiveTab('suivi')} className={`pb-4 text-sm font-bold uppercase tracking-widest transition ${activeTab === 'suivi' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Suivi Crédits</button>
            <button onClick={() => setActiveTab('connections')} className={`pb-4 text-sm font-bold uppercase tracking-widest transition ${activeTab === 'connections' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Réseau</button>
            <button onClick={() => setActiveTab('messages')} className={`pb-4 text-sm font-bold uppercase tracking-widest transition ${activeTab === 'messages' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Messages</button>
          </div>
        )}

        <div className="pt-10 px-10 pb-16">
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="md:col-span-2 space-y-8">
                {isEditing ? (
                  <div className="space-y-8 animate-in slide-in-from-bottom-4">
                    <section>
                      <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Présentation</h3>
                      <textarea 
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500" 
                        value={editedUser.bio} 
                        onChange={e => setEditedUser({...editedUser, bio: e.target.value})} 
                        placeholder="Parlez-nous de vous..."
                      />
                    </section>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <section>
                        <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Compétences Offertes</h3>
                        <input 
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500" 
                          value={editedUser.offeredSkills?.join(', ')} 
                          onChange={e => setEditedUser({...editedUser, offeredSkills: e.target.value.split(',').map(s => s.trim())})} 
                          placeholder="Excel, Design, Cuisine..."
                        />
                      </section>
                      <section>
                        <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Compétences Recherchées</h3>
                        <input 
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500" 
                          value={editedUser.requestedSkills?.join(', ')} 
                          onChange={e => setEditedUser({...editedUser, requestedSkills: e.target.value.split(',').map(s => s.trim())})} 
                          placeholder="Anglais, Piano, Yoga..."
                        />
                      </section>
                    </div>
                    <section>
                      <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Disponibilité</h3>
                      <input 
                        className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500" 
                        value={editedUser.availability} 
                        onChange={e => setEditedUser({...editedUser, availability: e.target.value})} 
                        placeholder="Ex: Soirs et weekends, Lundi après-midi..."
                      />
                    </section>
                    <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition">Sauvegarder les modifications</button>
                  </div>
                ) : (
                  <>
                    <section>
                      <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Présentation</h3>
                      <p className="text-slate-500 italic leading-relaxed">{user.bio || "Pas de présentation."}</p>
                    </section>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <section>
                        <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Je propose</h3>
                        <div className="flex flex-wrap gap-2">
                          {user.offeredSkills?.length > 0 ? user.offeredSkills.map((s, i) => (
                            <span key={i} className="bg-green-50 text-green-600 px-4 py-1.5 rounded-xl text-xs font-bold border border-green-100">{s}</span>
                          )) : <span className="text-slate-400 text-sm italic">Aucune compétence listée</span>}
                        </div>
                      </section>
                      <section>
                        <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Je recherche</h3>
                        <div className="flex flex-wrap gap-2">
                          {user.requestedSkills?.length > 0 ? user.requestedSkills.map((s, i) => (
                            <span key={i} className="bg-orange-50 text-orange-600 px-4 py-1.5 rounded-xl text-xs font-bold border border-orange-100">{s}</span>
                          )) : <span className="text-slate-400 text-sm italic">Aucune demande listée</span>}
                        </div>
                      </section>
                    </div>

                    <section>
                      <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Disponibilité</h3>
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4">
                        <span className="text-2xl">📅</span>
                        <p className="text-slate-600 font-medium">{user.availability || "Non spécifiée"}</p>
                      </div>
                    </section>

                    <section>
                      <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Échanges Récents</h3>
                      {userTransactions.length === 0 ? (
                        <p className="text-slate-400 italic text-sm">Aucun échange pour le moment.</p>
                      ) : (
                        <div className="space-y-3">
                          {userTransactions.slice(0, 3).map(t => (
                            <div key={t.id} className="p-4 bg-white rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${t.fromId === user.id ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                  {t.fromId === user.id ? 'OUT' : 'IN'}
                                </div>
                                <div>
                                  <p className="font-bold text-xs text-slate-800">{t.serviceTitle}</p>
                                  <p className="text-[10px] text-slate-400 uppercase font-bold">{new Date(t.date).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="font-bold text-sm text-slate-700">
                                {t.amount} ⏰
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                    <section className="pt-12 border-t border-slate-100">
                      <h3 className="font-heading text-lg font-bold text-red-600 mb-4">Zone de danger</h3>
                      <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div>
                          <p className="text-red-800 font-bold text-sm">Gestion du compte</p>
                          <p className="text-red-600 text-xs">Désactivez temporairement ou supprimez définitivement votre compte.</p>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => { if (confirm("Désactiver votre compte ? Vous pourrez le réactiver plus tard.")) onDeactivate?.(); }}
                            className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition"
                          >
                            Désactiver
                          </button>
                          <button 
                            onClick={() => { if (confirm("ATTENTION : Supprimer définitivement votre compte ? Cette action est irréversible.")) onDelete?.(); }}
                            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition shadow-lg shadow-red-100"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </section>
                  </>
                )}
              </div>
              <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-xl">
                <p className="text-xs font-bold opacity-70 mb-1 tracking-widest uppercase">Solde Actuel</p>
                <h4 className="text-5xl font-bold">⏰ {user.credits}</h4>
                <p className="mt-4 text-[10px] opacity-60">Crédits négociables pour vos services.</p>
              </div>
            </div>
          )}

          {activeTab === 'suivi' && (
            <div className="space-y-4 animate-in fade-in">
              <h3 className="font-heading text-lg font-bold text-slate-800 mb-6">Historique des transactions</h3>
              {userTransactions.length === 0 ? (
                <p className="text-slate-400 italic">Aucune transaction enregistrée.</p>
              ) : (
                <div className="space-y-3">
                  {userTransactions.map(t => (
                    <div key={t.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${t.fromId === user.id ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {t.fromId === user.id ? '↓' : '↑'}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{t.serviceTitle}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">{new Date(t.date).toLocaleDateString()} — {t.fromId === user.id ? 'Débit' : 'Crédit'}</p>
                        </div>
                      </div>
                      <div className={`font-bold text-lg ${t.fromId === user.id ? 'text-red-500' : 'text-green-500'}`}>
                        {t.fromId === user.id ? '-' : '+'}{t.amount} ⏰
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'connections' && (
            <div className="space-y-8 animate-in fade-in">
              {pendingRequests.length > 0 && (
                <section>
                  <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Demandes reçues</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingRequests.map(req => {
                      const sender = allUsers.find(u => u.uid === req.senderId);
                      return sender ? (
                        <div key={req.id} className="p-4 bg-white rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm">
                          <div className="flex items-center gap-3">
                            <img src={sender.avatar} className="w-10 h-10 rounded-full object-cover" />
                            <p className="font-bold text-sm">{sender.firstName} {sender.lastName}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => onUpdateConnection?.(req.id, 'accepted')} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold">Accepter</button>
                            <button onClick={() => onUpdateConnection?.(req.id, 'refused')} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold">Refuser</button>
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </section>
              )}

              <section>
                <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Mes connexions</h3>
                {myConnections.length === 0 ? (
                  <p className="text-slate-400 italic">Vous n'avez pas encore de connexions.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {myConnections.map(conn => {
                      const partnerId = conn.senderId === user.uid ? conn.receiverId : conn.senderId;
                      const partner = allUsers.find(u => u.uid === partnerId);
                      return partner ? (
                        <div key={conn.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                          <img src={partner.avatar} className="w-10 h-10 rounded-full object-cover" />
                          <p className="font-bold text-xs">{partner.firstName} {partner.lastName}</p>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
