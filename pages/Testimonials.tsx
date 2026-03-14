
import React, { useState, useRef } from 'react';
import { Testimonial, User, MediaItem } from '../types';
import { db, doc, updateDoc, deleteDoc, addDoc, collection } from '../api';
import { Edit2, Trash2, MessageCircle, Heart, Share2 } from 'lucide-react';

interface TestimonialsProps {
  testimonials: Testimonial[];
  user: User | null;
  onUpdate: (t: Testimonial[]) => void; // Keeping for compatibility but won't use for data
  onAuthClick: () => void;
}

const Testimonials: React.FC<TestimonialsProps> = ({ testimonials, user, onAuthClick }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingPost, setEditingPost] = useState<Testimonial | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);


  const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    const isVideo = file.type.startsWith('video');
    const resourceType = isVideo ? 'video' : 'image';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.secure_url) throw new Error('Erreur upload Cloudinary');
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
    if (!confirm("Supprimer définitivement ce témoignage ?")) return;
    await deleteDoc(doc(db, 'testimonials', id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return onAuthClick();
    
    const media: MediaItem[] = [...mediaItems];
    
    const postData = {
      title: newTitle,
      content: newContent,
      rating: newRating,
      media: media,
    };

    if (editingPost) {
      await updateDoc(doc(db, 'testimonials', editingPost.id), postData);
    } else {
      await addDoc(collection(db, 'testimonials'), {
        ...postData,
        authorId: user.uid,
        authorName: `${user.firstName} ${user.lastName}`,
        authorAvatar: user.avatar,
        votes: [],
        likes: [],
        shares: 0,
        comments: [],
        createdAt: new Date().toISOString(),
      });
    }

    setShowAdd(false);
    setEditingPost(null);
    setNewTitle('');
    setNewContent('');
    setMediaItems([]);
    setNewRating(5);
  };

  const handleLike = async (t: Testimonial) => {
    if (!user) { onAuthClick(); return; }
    const likes = t.likes || [];
    const hasLiked = likes.includes(user.uid);
    const newLikes = hasLiked ? likes.filter(id => id !== user.uid) : [...likes, user.uid];
    await updateDoc(doc(db, 'testimonials', t.id), { likes: newLikes });
  };

  const handleShare = async (t: Testimonial) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: t.title, text: t.content, url: window.location.href });
        await updateDoc(doc(db, 'testimonials', t.id), { shares: (t.shares || 0) + 1 });
      } catch (err) { console.error("Erreur de partage:", err); }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Lien copié dans le presse-papier !");
      await updateDoc(doc(db, 'testimonials', t.id), { shares: (t.shares || 0) + 1 });
    }
  };

  const handleComment = async (t: Testimonial) => {
    if (!user) { onAuthClick(); return; }
    if (!commentText.trim()) return;
    const newComment = {
      id: Math.random().toString(36).substr(2, 9),
      authorId: user.uid,
      authorName: `${user.firstName} ${user.lastName}`,
      authorAvatar: user.avatar,
      content: commentText,
      createdAt: new Date().toISOString()
    };
    await updateDoc(doc(db, 'testimonials', t.id), { comments: [...(t.comments || []), newComment] });
    setCommentText('');
    setActiveCommentPost(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="text-center mb-16">
        <h1 className="font-heading text-4xl font-bold text-slate-900 mb-4">Paroles de Membres</h1>
        <p className="text-slate-500 mb-10">Partagez votre expérience et votez pour les meilleures histoires d'entraide.</p>
        <button 
          onClick={() => {
            if (!user) { onAuthClick(); return; }
            setEditingPost(null);
            setNewTitle('');
            setNewContent('');
            setMediaItems([]);
            setNewRating(5);
            setShowAdd(true);
          }}
          className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-blue-600 transition shadow-xl"
        >
          Contribuer au mur
        </button>
      </div>

      {showAdd && (
        <div className="mb-16 bg-white p-10 rounded-[2.5rem] border border-blue-100 shadow-2xl animate-in fade-in slide-in-from-bottom-6">
          <h2 className="font-heading text-2xl font-bold mb-8">{editingPost ? 'Modifier le témoignage' : 'Votre Témoignage'}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <input required placeholder="Titre de votre histoire" className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <textarea required placeholder="Détaillez votre expérience..." className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none min-h-[150px]" value={newContent} onChange={e => setNewContent(e.target.value)} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-sm font-bold text-slate-400">Note :</span>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setNewRating(star)} className={`text-2xl transition ${newRating >= star ? 'text-yellow-400 scale-110' : 'text-slate-200'}`}>★</button>
                ))}
              </div>
              
              <div className="relative">
                <input type="file" accept="image/*,video/*" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full px-5 py-4 rounded-2xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-200 transition flex items-center justify-center gap-2 h-full">
                  {uploadingMedia ? "⏳ Chargement..." : mediaItems.length > 0 ? `✅ ${mediaItems.length} fichier(s) prêt(s)` : "📁 Importer Photos/Vidéos"}
                </button>
              </div>
            </div>

            {mediaItems.length > 0 && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {mediaItems.map((m, i) => (
                  <div key={i} className="relative">
                    {m.type === 'image' ? (
                      <img src={m.url} className="w-full h-24 object-cover rounded-xl" alt="Preview" />
                    ) : (
                      <video src={m.url} className="w-full h-24 object-cover rounded-xl" />
                    )}
                    <button type="button" onClick={() => setMediaItems(prev => prev.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold">{editingPost ? 'Mettre à jour' : 'Publier'}</button>
              <button type="button" onClick={() => { setShowAdd(false); setEditingPost(null); }} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold">Annuler</button>
            </div>
          </form>
        </div>
      )}

      <div className="columns-1 md:columns-2 gap-8 space-y-8">
        {testimonials.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(t => (
          <div key={t.id} className="break-inside-avoid bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl transition-all relative overflow-hidden">
            
            {user && (user.uid === t.authorId || user.role === 'admin') && (
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => { setEditingPost(t); setNewTitle(t.title); setNewContent(t.content); setNewRating(t.rating); if (t.media && t.media.length > 0) { setMediaItems(t.media); } setShowAdd(true); }} className="p-2 text-slate-400 hover:text-blue-600 transition bg-white/80 backdrop-blur-sm rounded-full">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-red-600 transition bg-white/80 backdrop-blur-sm rounded-full">
                  <Trash2 size={16} />
                </button>
              </div>
            )}
            
            <div className="flex text-yellow-400 mb-6 text-lg">
              {'★'.repeat(t.rating)}{'☆'.repeat(5-t.rating)}
            </div>
            <h3 className="font-heading font-bold text-xl text-slate-800 mb-4 pr-10">"{t.title}"</h3>
            <p className="text-slate-500 italic leading-relaxed mb-8">
              {t.content}
            </p>

            {t.media && t.media.length > 0 && (
              <div className="rounded-3xl overflow-hidden mb-8 bg-slate-50 border border-slate-100">
                {t.media[0].type === 'image' ? (
                  <img src={t.media[0].url} className="w-full h-auto max-h-[300px] object-cover" alt="Media" />
                ) : (
                  <video src={t.media[0].url} controls className="w-full h-auto max-h-[300px]" />
                )}
              </div>
            )}

            <div className="flex items-center gap-4 pt-6 border-t border-slate-50 mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shadow-sm">
                {t.authorAvatar ? <img src={t.authorAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-blue-600">{t.authorName[0]}</div>}
              </div>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest text-[10px]">Par {t.authorName}</span>
            </div>

            <div className="flex items-center gap-6 border-t border-slate-50 pt-6">
              <button onClick={() => handleLike(t)} className={`flex items-center gap-2 font-bold transition ${user && (t.likes || []).includes(user.uid) ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}>
                <Heart size={18} className={user && (t.likes || []).includes(user.uid) ? 'fill-current' : ''} />
                <span className="text-xs">{(t.likes || []).length}</span>
              </button>
              <button onClick={() => setActiveCommentPost(activeCommentPost === t.id ? null : t.id)} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold transition">
                <MessageCircle size={18} />
                <span className="text-xs">{(t.comments || []).length}</span>
              </button>
              <button onClick={() => handleShare(t)} className="flex items-center gap-2 text-slate-400 hover:text-green-600 font-bold transition ml-auto">
                <Share2 size={18} />
                <span className="text-xs">{t.shares || 0}</span>
              </button>
            </div>

            {activeCommentPost === t.id && (
              <div className="mt-6 pt-6 border-t border-slate-50 animate-in fade-in slide-in-from-top-4">
                <div className="space-y-4 mb-6">
                  {(t.comments || []).map(comment => (
                    <div key={comment.id} className="bg-slate-50 p-4 rounded-2xl">
                      <div className="flex items-center gap-2 mb-2">
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
                  <input 
                    type="text" 
                    placeholder="Commenter..." 
                    className="flex-grow px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleComment(t)}
                  />
                  <button onClick={() => handleComment(t)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-700 transition">
                    Envoyer
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Testimonials;
