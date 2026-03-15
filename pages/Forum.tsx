
import React, { useState, useRef } from 'react';
import { User, ForumTopic, MediaItem } from '../types';
import { db, doc, updateDoc, deleteDoc, addDoc, collection } from '../api';
import { Edit2, Trash2, MessageCircle, Heart, Share2 } from 'lucide-react';

interface ForumProps {
  user: User | null;
  topics: ForumTopic[];
  onAdd: (t: ForumTopic) => void;
}

const Forum: React.FC<ForumProps> = ({ user, topics }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingPost, setEditingPost] = useState<ForumTopic | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newMsg, setNewMsg] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [videoLink, setVideoLink] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) throw new Error('Cloudinary non configuré');
    const isVideo = file.type.startsWith('video');
    const resourceType = isVideo ? 'video' : 'image';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
      method: 'POST', body: formData,
    });
    const data = await res.json();
    if (!data.secure_url) throw new Error('Erreur upload: ' + JSON.stringify(data));
    return data.secure_url;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingMedia(true);
    try {
      const uploaded: MediaItem[] = [];
      for (const file of files) {
        const url = await uploadToCloudinary(file);
        uploaded.push({ type: file.type.startsWith('video') ? 'video' : 'image', url });
      }
      setMediaItems(prev => [...prev, ...uploaded]);
    } catch (err) {
      alert("Erreur lors de l'upload. Réessayez.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer définitivement ce sujet ?")) return;
    await deleteDoc(doc(db, 'forumTopics', id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Connectez-vous pour participer');

    const media: MediaItem[] = [...mediaItems];
    if (videoLink.trim()) media.push({ type: 'video', url: videoLink.trim() });

    const postData = {
      title: newTitle,
      content: newMsg,  // mapped to 'content' for DB
      media,
      externalLink,
    };

    try {
      if (editingPost) {
        await updateDoc(doc(db, 'forumTopics', editingPost.id), postData);
      } else {
        await addDoc(collection(db, 'forumTopics'), {
          ...postData,
          authorId: user.uid,
          authorName: `${user.firstName} ${user.lastName}`,
          authorAvatar: user.avatar || null,
          likes: [],
          shares: 0,
          comments: [],
          createdAt: new Date().toISOString(),
        });
      }
      setShowAdd(false);
      setEditingPost(null);
      setNewTitle('');
      setNewMsg('');
      setMediaItems([]);
      setExternalLink('');
      setVideoLink('');
    } catch (err: any) {
      alert('Erreur : ' + (err.message || 'Impossible de publier'));
    }
  };

  const handleLike = async (t: ForumTopic) => {
    if (!user) return alert('Connectez-vous pour participer');
    const likes = t.likes || [];
    const hasLiked = likes.includes(user.uid);
    const newLikes = hasLiked ? likes.filter(id => id !== user.uid) : [...likes, user.uid];
    await updateDoc(doc(db, 'forumTopics', t.id), { likes: newLikes });
  };

  const handleShare = async (t: ForumTopic) => {
    if (navigator.share) {
      try { await navigator.share({ title: t.title, text: t.content || t.message, url: window.location.href }); }
      catch (err) { console.error(err); }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Lien copié !");
    }
    await updateDoc(doc(db, 'forumTopics', t.id), { shares: (t.shares || 0) + 1 });
  };

  const handleComment = async (t: ForumTopic) => {
    if (!user) return alert('Connectez-vous pour participer');
    if (!commentText.trim()) return;
    const newComment = {
      id: Math.random().toString(36).substr(2, 9),
      authorId: user.uid,
      authorName: `${user.firstName} ${user.lastName}`,
      authorAvatar: user.avatar || null,
      content: commentText,
      createdAt: new Date().toISOString()
    };
    await updateDoc(doc(db, 'forumTopics', t.id), { comments: [...(t.comments || []), newComment] });
    setCommentText('');
    setActiveCommentPost(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex justify-between items-center mb-10">
        <h1 className="font-heading text-4xl font-bold text-slate-900">Forum des échanges</h1>
        <button
          onClick={() => {
            if (!user) return alert('Connectez-vous pour participer');
            setEditingPost(null); setNewTitle(''); setNewMsg('');
            setMediaItems([]); setExternalLink(''); setVideoLink('');
            setShowAdd(true);
          }}
          className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition"
        >
          Nouveau Sujet
        </button>
      </div>

      {showAdd && (
        <div className="mb-12 bg-white p-8 rounded-[2rem] border border-blue-100 shadow-xl shadow-blue-50">
          <h2 className="font-heading text-xl font-bold mb-6">{editingPost ? 'Modifier le sujet' : 'Lancer une discussion'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input required placeholder="Titre du sujet" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <textarea required placeholder="Votre message..." className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px]" value={newMsg} onChange={e => setNewMsg(e.target.value)} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="url" placeholder="🔗 Lien externe (optionnel)" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none" value={externalLink} onChange={e => setExternalLink(e.target.value)} />
              <div>
                <input type="file" accept="image/*,video/*" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full px-5 py-4 rounded-2xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-200 transition flex items-center justify-center gap-2">
                  {uploadingMedia ? "⏳ Chargement..." : mediaItems.length > 0 ? `✅ ${mediaItems.length} fichier(s)` : "📁 Photos/Vidéos"}
                </button>
              </div>
            </div>

            <input type="url" placeholder="🎬 Lien YouTube ou Google Drive (optionnel)" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none" value={videoLink} onChange={e => setVideoLink(e.target.value)} />

            {mediaItems.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {mediaItems.map((m, i) => (
                  <div key={i} className="relative">
                    {m.type === 'image' ? <img src={m.url} className="w-full h-24 object-cover rounded-xl" alt="Preview" /> : <video src={m.url} className="w-full h-24 object-cover rounded-xl" />}
                    <button type="button" onClick={() => setMediaItems(prev => prev.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition">{editingPost ? 'Mettre à jour' : 'Publier'}</button>
              <button type="button" onClick={() => { setShowAdd(false); setEditingPost(null); }} className="bg-slate-100 text-slate-500 px-8 py-3 rounded-xl font-bold">Annuler</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {topics.length > 0 ? topics.map(topic => (
          <div key={topic.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 hover:border-blue-200 transition group relative">
            {user && (user.uid === topic.authorId || user.role === 'admin') && (
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => { setEditingPost(topic); setNewTitle(topic.title); setNewMsg(topic.content || topic.message || ''); setExternalLink(topic.externalLink || ''); if (topic.media?.length) setMediaItems(topic.media); setShowAdd(true); }} className="p-2 text-slate-400 hover:text-blue-600 bg-white/80 rounded-full"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(topic.id)} className="p-2 text-slate-400 hover:text-red-600 bg-white/80 rounded-full"><Trash2 size={16} /></button>
              </div>
            )}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition overflow-hidden flex-shrink-0">
                {topic.authorAvatar ? <img src={topic.authorAvatar} className="w-full h-full object-cover" /> : topic.authorName[0]}
              </div>
              <div className="flex-grow">
                <h3 className="font-heading text-xl font-bold text-slate-800 mb-2 pr-16">{topic.title}</h3>
                <p className="text-slate-500 text-sm mb-4 whitespace-pre-wrap">{topic.content || topic.message}</p>

                {topic.externalLink && (
                  <a href={topic.externalLink} target="_blank" rel="noopener noreferrer" className="inline-block mb-4 text-blue-600 hover:underline text-sm font-medium">🔗 Lien externe</a>
                )}

                {topic.media && topic.media.length > 0 && (
                  <div className={`mb-4 grid gap-2 ${topic.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {topic.media.map((m, i) => (
                      <div key={i} className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
                        {m.type === 'image' ? <img src={m.url} className="w-full h-auto max-h-[300px] object-cover" alt="Media" />
                          : m.url.includes('youtube.com') || m.url.includes('youtu.be')
                            ? <iframe src={m.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')} className="w-full aspect-video" allowFullScreen />
                            : <video src={m.url} controls className="w-full max-h-[300px]" />}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Par {topic.authorName}</span>
                  <span className="text-[10px] text-slate-300">{new Date(topic.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-6 border-t border-slate-50 pt-4">
                  <button onClick={() => handleLike(topic)} className={`flex items-center gap-2 font-bold transition ${user && (topic.likes || []).includes(user.uid) ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}>
                    <Heart size={18} className={user && (topic.likes || []).includes(user.uid) ? 'fill-current' : ''} />
                    <span className="text-xs">{(topic.likes || []).length}</span>
                  </button>
                  <button onClick={() => setActiveCommentPost(activeCommentPost === topic.id ? null : topic.id)} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold transition">
                    <MessageCircle size={18} />
                    <span className="text-xs">{(topic.comments || []).length}</span>
                  </button>
                  <button onClick={() => handleShare(topic)} className="flex items-center gap-2 text-slate-400 hover:text-green-600 font-bold transition ml-auto">
                    <Share2 size={18} />
                    <span className="text-xs">{topic.shares || 0}</span>
                  </button>
                </div>

                {activeCommentPost === topic.id && (
                  <div className="mt-4 pt-4 border-t border-slate-50">
                    <div className="space-y-3 mb-4">
                      {(topic.comments || []).map(comment => (
                        <div key={comment.id} className="bg-slate-50 p-3 rounded-2xl">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-slate-200 overflow-hidden">
                              {comment.authorAvatar ? <img src={comment.authorAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold">{comment.authorName[0]}</div>}
                            </div>
                            <span className="font-bold text-xs text-slate-800">{comment.authorName}</span>
                          </div>
                          <p className="text-xs text-slate-600 pl-7">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Commenter..." className="flex-grow px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500 text-xs" value={commentText} onChange={e => setCommentText(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleComment(topic)} />
                      <button onClick={() => handleComment(topic)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-700 transition">Envoyer</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )) : (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
            <span className="text-5xl mb-4 block">💬</span>
            <p className="text-slate-400 font-medium">Aucune discussion en cours. Soyez le premier !</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Forum;
