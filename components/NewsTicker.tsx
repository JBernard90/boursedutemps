
import React, { useRef } from 'react';
import { BlogPost, Testimonial, Page } from '../types';

interface NewsTickerProps {
  blogs: BlogPost[];
  testimonials: Testimonial[];
  navigate: (p: Page) => void;
}

const NewsTicker: React.FC<NewsTickerProps> = ({ blogs, testimonials, navigate }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Mélanger les deux types pour un fil varié
  const combinedItems = [
    ...blogs.map(b => ({ ...b, type: 'blog' as const })),
    ...testimonials.map(t => ({ ...t, type: 'testimonial' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="relative group max-w-7xl mx-auto px-4">
      {/* Boutons de navigation */}
      <button 
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-110 transition opacity-0 group-hover:opacity-100 border border-slate-100"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button 
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-110 transition opacity-0 group-hover:opacity-100 border border-slate-100"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Conteneur du Carrousel */}
      <div 
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide py-4 px-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {combinedItems.map((item, idx) => (
          <div 
            key={`${item.id}-${idx}`}
            onClick={() => navigate(item.type === 'blog' ? 'blog' : 'testimonials')}
            className="flex-shrink-0 w-80 snap-center cursor-pointer transform hover:scale-[1.02] transition-all"
          >
            {item.type === 'blog' ? (
              <div className="h-full bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {item.category}
                  </span>
                  <h4 className="font-bold text-slate-800 mt-4 mb-2 line-clamp-2 leading-tight uppercase tracking-tight">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    {item.content}
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 pt-4 border-t border-slate-50">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Par {item.authorName}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-full bg-slate-900 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex text-yellow-400 mb-4 text-xs">
                    {'★'.repeat(item.rating)}
                  </div>
                  <p className="italic text-xs text-slate-300 mb-4 line-clamp-4 leading-relaxed">
                    "{item.content}"
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">
                    — {item.authorName}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsTicker;
