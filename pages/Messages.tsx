import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { Send, Image, FileText, Link, Smile } from 'lucide-react';

interface Message {
  id: number;
  senderId: string;
  receiverId: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

interface MessagesProps {
  user: User;
  users: User[];
  onAuthClick?: () => void;
}

const EMOJIS = ['😊','👍','❤️','🎉','🙏','😂','🔥','💪','👏','✅','🤝','📚'];

const Messages: React.FC<MessagesProps> = ({ user, users }) => {
  const [conversations, setConversations] = useState<Record<string, Message[]>>({});
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch messages for selected conversation
  const fetchMessages = async (partnerId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/messages/${partnerId}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(prev => ({ ...prev, [partnerId]: data }));
      }
    } catch (e) { console.error(e); }
  };

  // Fetch unread counts
  const fetchUnread = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/messages/unread', {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCounts(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.uid);
      const interval = setInterval(() => fetchMessages(selectedUser.uid), 10000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, selectedUser]);

  const uploadToCloudinary = async (file: File, type: 'image' | 'video' | 'raw'): Promise<string> => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${type}/upload`, {
      method: 'POST', body: formData
    });
    const data = await res.json();
    if (!data.secure_url) throw new Error('Upload failed');
    return data.secure_url;
  };

  const sendMessage = async (extra?: Partial<Message>) => {
    if (!selectedUser) return;
    if (!newMessage.trim() && !extra?.mediaUrl && !extra?.link) return;
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const body = {
        receiverId: selectedUser.uid,
        content: newMessage.trim(),
        ...extra
      };
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const msg = await res.json();
        setConversations(prev => ({
          ...prev,
          [selectedUser.uid]: [...(prev[selectedUser.uid] || []), msg]
        }));
        setNewMessage('');
        setShowEmojis(false);
        // Send email notification
        await fetch('/api/notify/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiverId: selectedUser.uid,
            receiverName: selectedUser.firstName + ' ' + selectedUser.lastName,
            receiverEmail: selectedUser.email,
            senderName: user.firstName + ' ' + user.lastName
          })
        });
      }
    } catch (e) { alert('Erreur envoi message'); }
    finally { setSending(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const isVideo = file.type.startsWith('video');
      const url = await uploadToCloudinary(file, isVideo ? 'video' : 'image');
      await sendMessage({ mediaUrl: url, mediaType: isVideo ? 'video' : 'image' });
    } catch { alert('Erreur upload'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'raw');
      await sendMessage({ mediaUrl: url, mediaType: 'file', fileName: file.name });
    } catch { alert('Erreur upload'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleLinkSend = () => {
    const url = prompt('Entrez un lien URL :');
    if (url) sendMessage({ link: url });
  };

  const currentMessages = selectedUser ? (conversations[selectedUser.uid] || []) : [];
  const filteredUsers = users.filter(u =>
    u.uid !== user.uid &&
    (u.firstName.toLowerCase().includes(searchFilter.toLowerCase()) ||
     u.lastName.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="font-heading text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3">
        Messagerie
        {totalUnread > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">{totalUnread}</span>
        )}
      </h1>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden" style={{ height: '70vh' }}>
        <div className="flex h-full">

          {/* Liste des membres */}
          <div className="w-72 border-r border-slate-100 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-slate-100">
              <input
                type="text"
                placeholder="Rechercher un membre..."
                className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-blue-500"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">Aucun membre trouvé</div>
              ) : filteredUsers.map(u => (
                <button
                  key={u.uid}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left ${selectedUser?.uid === u.uid ? 'bg-blue-50 border-r-2 border-blue-600' : ''}`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                    {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">{u.firstName[0]}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">{u.firstName} {u.lastName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{u.department}</p>
                  </div>
                  {unreadCounts[u.uid] > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">{unreadCounts[u.uid]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Zone de conversation */}
          <div className="flex-1 flex flex-col">
            {selectedUser ? (
              <>
                {/* Header conversation */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                    {selectedUser.avatar ? <img src={selectedUser.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">{selectedUser.firstName[0]}</div>}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{selectedUser.firstName} {selectedUser.lastName}</p>
                    <p className="text-xs text-slate-400">{selectedUser.department}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                  {currentMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <span className="text-4xl mb-3">👋</span>
                      <p className="font-medium">Commencez la conversation !</p>
                    </div>
                  ) : currentMessages.map(msg => {
                    const isMe = msg.senderId === user.uid;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'}`}>
                          {msg.content && <p className="text-sm">{msg.content}</p>}
                          {msg.mediaUrl && msg.mediaType === 'image' && (
                            <img src={msg.mediaUrl} className="max-w-full rounded-xl mt-1 max-h-48 object-cover" />
                          )}
                          {msg.mediaUrl && msg.mediaType === 'video' && (
                            <video src={msg.mediaUrl} controls className="max-w-full rounded-xl mt-1 max-h-48" />
                          )}
                          {msg.mediaUrl && msg.mediaType === 'file' && (
                            <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 mt-1 text-xs font-bold underline ${isMe ? 'text-blue-100' : 'text-blue-600'}`}>
                              📎 {msg.fileName || 'Fichier'}
                            </a>
                          )}
                          {msg.link && (
                            <a href={msg.link} target="_blank" rel="noopener noreferrer" className={`text-xs underline block mt-1 ${isMe ? 'text-blue-100' : 'text-blue-600'}`}>
                              🔗 {msg.link.substring(0, 40)}...
                            </a>
                          )}
                          <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Zone de saisie */}
                <div className="px-4 py-3 border-t border-slate-100 bg-white">
                  {showEmojis && (
                    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 rounded-xl">
                      {EMOJIS.map(e => (
                        <button key={e} type="button" onClick={() => setNewMessage(prev => prev + e)} className="text-xl hover:scale-125 transition">{e}</button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input ref={imageInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleImageUpload} />
                    <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" className="hidden" onChange={handleFileUpload} />

                    <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2 text-slate-400 hover:text-blue-600 transition" title="Photo/Vidéo">
                      <Image size={18} />
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-blue-600 transition" title="Fichier">
                      <FileText size={18} />
                    </button>
                    <button type="button" onClick={handleLinkSend} className="p-2 text-slate-400 hover:text-blue-600 transition" title="Lien">
                      <Link size={18} />
                    </button>
                    <button type="button" onClick={() => setShowEmojis(!showEmojis)} className="p-2 text-slate-400 hover:text-yellow-500 transition" title="Emojis">
                      <Smile size={18} />
                    </button>

                    <input
                      type="text"
                      placeholder={uploading ? "Upload en cours..." : "Écrire un message..."}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      disabled={uploading}
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={sending || uploading || (!newMessage.trim())}
                      className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <span className="text-6xl mb-4">💬</span>
                <p className="font-bold text-lg text-slate-600">Sélectionnez un membre</p>
                <p className="text-sm mt-2">pour commencer une conversation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
