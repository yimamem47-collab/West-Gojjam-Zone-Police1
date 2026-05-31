import React, { useState } from 'react';
import { Newspaper, Plus, Search, Trash2, Edit2, Calendar, User, Eye, Sparkles, MessageSquare, AlertCircle, FileText, Bold, List, Heading, HelpCircle, Image } from 'lucide-react';
import { NewsItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../lib/translations';

interface NewsFeedProps {
  newsItems: NewsItem[];
  lang: Language;
  userRole?: string;
  onAdd?: (news: Omit<NewsItem, 'id'>) => void;
  onUpdate?: (id: string, updates: Partial<NewsItem>) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

export function NewsFeed({ newsItems, lang, userRole = 'Officer', onAdd, onUpdate, onDelete, readOnly = false }: NewsFeedProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const [newNews, setNewNews] = useState<Omit<NewsItem, 'id'>>({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0],
    author: '',
    category: 'General',
    photo: ''
  });

  const filteredNews = newsItems.filter(item => {
    const matchesSearch = 
      (item.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.author || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Simple rich text inserting helper
  const insertTextMarkup = (markupType: 'bold' | 'list' | 'header' | 'alert') => {
    const textarea = document.getElementById('news-composer-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selectedText = value.substring(start, end);

    let replacement = '';
    switch (markupType) {
      case 'bold':
        replacement = `<b>${selectedText || (lang === 'am' ? 'ደማቅ ጽሑፍ' : 'Bold Text')}</b>`;
        break;
      case 'list':
        replacement = `\n• ${selectedText || (lang === 'am' ? 'ነጥብ አንድ' : 'Point One')}\n• `;
        break;
      case 'header':
        replacement = `<h3>${selectedText || (lang === 'am' ? 'ንዑስ ርዕስ' : 'Heading')}</h3>`;
        break;
      case 'alert':
        replacement = `<div class="bg-rose-500/10 text-rose-400 p-4 border border-rose-500/20 rounded-xl my-2 flex items-center gap-2">⚠️ <b>${selectedText || (lang === 'am' ? 'አስቸኳይ ማስጠንቀቂያ!' : 'URGENT NOTICE!')}</b></div>`;
        break;
    }

    const newValue = value.substring(0, start) + replacement + value.substring(end);
    setNewNews(prev => ({ ...prev, content: newValue }));

    // Focus back on textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewNews(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNews.title.trim()) {
      alert(lang === 'am' ? 'እባክዎ የመግለጫውን ርዕስ ያስገቡ' : 'Please enter news title');
      return;
    }
    if (!newNews.content.trim()) {
      alert(lang === 'am' ? 'እባክዎ መግለጫውን ይጻፉ' : 'Please enter news content');
      return;
    }

    if (editingNews) {
      onUpdate(editingNews.id, newNews);
      setEditingNews(null);
    } else {
      onAdd(newNews);
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (item: NewsItem) => {
    setEditingNews(item);
    setNewNews({
      title: item.title,
      content: item.content,
      date: item.date,
      author: item.author,
      category: item.category,
      photo: item.photo || ''
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setNewNews({
      title: '',
      content: '',
      date: new Date().toISOString().split('T')[0],
      author: '',
      category: 'General',
      photo: ''
    });
    setEditingNews(null);
    setPreviewMode(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-2">
            <Newspaper className="text-brand-accent shrink-0" size={32} />
            <span>{lang === 'am' ? 'የፖሊስ ይፋዊ የዜና ክፍል' : 'Police Official News Feed'}</span>
          </h1>
          <p className="text-brand-text-secondary text-sm">
            {lang === 'am' 
              ? 'የደህንነት ማስጠንቀቂያዎችን፣ ይፋዊ መግለጫዎችን እና የፖሊስ ስራዎችን ለህዝብ ማሰራጫ ማዕከል' 
              : 'Write and publish press releases, core notifications, and emergency advice directly.'}
          </p>
        </div>
        
        {!readOnly && onAdd && (
          <button 
            id="add-news-article"
            onClick={() => { resetForm(); setIsModalOpen(true); }} 
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            <span>{lang === 'am' ? 'መግለጫ አዘጋጅ' : 'Write Statement'}</span>
          </button>
        )}
      </div>

      {/* Control Bar */}
      <div className="glass-card p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" size={18} />
          <input 
            id="news-search"
            type="text" 
            placeholder={lang === 'am' ? 'በርዕስ፣ በመግለጫ ወይም በጸሐፊ ፈልግ...' : 'Search title, content, or author...'} 
            className="input-field pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          {(['All', 'General', 'Alert', 'Press Release', 'Statement'] as const).map((filter) => (
            <button
              id={`filter-news-${filter.replace(/\s+/g, '-')}`}
              key={filter}
              onClick={() => setCategoryFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border whitespace-nowrap transition-all ${
                categoryFilter === filter
                  ? 'bg-brand-accent/15 text-brand-accent border-brand-accent/30 shadow-md'
                  : 'bg-brand-bg/50 text-brand-text-secondary border-brand-border hover:bg-brand-border'
              }`}
            >
              {filter === 'All' && (lang === 'am' ? 'ሁሉም' : 'All')}
              {filter === 'General' && (lang === 'am' ? 'አጠቃላይ' : 'General')}
              {filter === 'Alert' && (lang === 'am' ? 'አስቸኳይ' : 'Alert')}
              {filter === 'Press Release' && (lang === 'am' ? 'የጋዜጣ መግለጫ' : 'Press Release')}
              {filter === 'Statement' && (lang === 'am' ? 'ሪፖርቶች' : 'Statement')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Articles - Admin Dashboard News Display */}
      {filteredNews.length === 0 ? (
        <div className="glass-card p-12 text-center py-20">
          <Newspaper className="mx-auto text-brand-text-secondary opacity-30 mb-4" size={56} />
          <h3 className="text-xl font-bold text-white mb-2">
            {lang === 'am' ? 'ምንም አይነት መግለጫ አልተገኘም' : 'No News Releases'}
          </h3>
          <p className="text-sm text-brand-text-secondary max-w-md mx-auto">
            {lang === 'am' 
              ? 'ከተመረጠው ካቴጎሪ ወይም የፍለጋ ቃል ጋር የሚዛመድ መረጃ በስርዓቱ ላይ አልተመዘገበም።' 
              : 'No official announcements matching your parameters. Create one to populate this feed.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredNews.map((news) => (
            <motion.div
              layout
              id={`news-card-${news.id}`}
              key={news.id}
              className={`glass-card overflow-hidden hover:border-brand-accent/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between border ${
                news.category === 'Alert' 
                  ? 'border-rose-500/30 bg-rose-500/[0.01]' 
                  : 'border-brand-border h-full'
              }`}
            >
              <div>
                {/* Visual Header Banner */}
                {news.photo ? (
                  <div className="relative h-48 w-full bg-slate-900 overflow-hidden border-b border-brand-border">
                    <img 
                      src={news.photo} 
                      alt={news.title} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-card/90 via-black/40 to-transparent" />
                  </div>
                ) : (
                  <div className="h-4 pointer-events-none" />
                )}

                <div className="p-6">
                  {/* Category and Date info */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                      news.category === 'Alert' 
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' 
                        : news.category === 'Press Release'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                        : news.category === 'Statement'
                        ? 'bg-teal-500/10 text-teal-400 border-teal-500/25'
                        : 'bg-brand-accent/10 text-brand-accent border-brand-accent/25'
                    }`}>
                      {news.category === 'Alert' && (lang === 'am' ? 'አስቸኳይ ማስጠንቀቂያ' : 'ALERT')}
                      {news.category === 'Press Release' && (lang === 'am' ? 'የጋዜጣ መግለጫ' : 'PRESS RELEASE')}
                      {news.category === 'Statement' && (lang === 'am' ? 'መግለጫ' : 'STATEMENT')}
                      {news.category === 'General' && (lang === 'am' ? 'አጠቃላይ መረጃ' : 'GENERAL')}
                    </span>
                    
                    <div className="flex items-center gap-2 text-brand-text-secondary text-xs">
                      <Calendar size={12} className="text-brand-accent" />
                      <span className="font-medium">{news.date}</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-white hover:text-brand-accent transition-colors mb-4 leading-snug">
                    {news.title}
                  </h3>

                  {/* Rich HTML body rendering */}
                  <div 
                    className="text-sm text-brand-text-secondary leading-relaxed space-y-2 rich-text-display overflow-hidden text-ellipsis transition-all max-h-full"
                    style={expandedIds[news.id] ? {} : { display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}
                    dangerouslySetInnerHTML={{ __html: news.content }}
                  />

                  {news.content && (news.content.length > 200 || news.content.includes('<') || news.content.includes('\n')) && (
                    <button
                      id={`toggle-news-${news.id}`}
                      onClick={() => setExpandedIds(prev => ({ ...prev, [news.id]: !prev[news.id] }))}
                      className="mt-3 text-xs text-brand-accent hover:text-brand-accent/80 font-black uppercase tracking-wider flex items-center gap-1 transition-colors bg-brand-accent/10 px-3 py-1.5 rounded-lg border border-brand-accent/20 hover:border-brand-accent/40 cursor-pointer"
                    >
                      {expandedIds[news.id] ? (
                        <>
                          <span>{lang === 'am' ? 'ቀንስ' : 'Close / Show Less'}</span>
                          <span className="text-[10px] opacity-70">▲</span>
                        </>
                      ) : (
                        <>
                          <span>{lang === 'am' ? 'ሙሉውን አንብብ' : 'Read Full Article'}</span>
                          <span className="text-[10px] opacity-70">▼</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Card Footer actions */}
              <div className="p-6 pt-4 border-t border-brand-border/40 flex items-center justify-between bg-brand-bg/20 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-brand-accent/20 rounded-full flex items-center justify-center text-[10px] font-black text-brand-accent">
                    {news.author ? news.author.substring(0, 2).toUpperCase() : 'WG'}
                  </div>
                  <div>
                    <span className="text-[10px] text-brand-text-secondary block font-bold uppercase tracking-wider">{lang === 'am' ? 'ጸሐፊ/መምሪያ' : 'ISSUED BY'}</span>
                    <span className="text-white text-xs font-bold leading-none">{news.author || 'WGZ Police Dept'}</span>
                  </div>
                </div>

                {!readOnly && onUpdate && onDelete && (
                  <div className="flex gap-2">
                    <button
                      id={`edit-news-${news.id}`}
                      onClick={() => handleEdit(news)}
                      className="p-2 hover:bg-brand-accent/20 hover:text-brand-accent text-brand-text-secondary border border-brand-border/80 rounded-lg transition-colors"
                      title={lang === 'am' ? 'አስተካክል' : 'Edit'}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      id={`delete-news-${news.id}`}
                      onClick={() => {
                        if (window.confirm(lang === 'am' ? 'ይህን መግለጫ እስከመጨረሻው ማጥፋት ይፈልጋሉ?' : 'Delete this item permanently?')) {
                          onDelete(news.id);
                        }
                      }}
                      className="p-2 hover:bg-rose-500/20 hover:text-rose-400 text-brand-text-secondary border border-brand-border/80 rounded-lg transition-colors"
                      title={lang === 'am' ? 'አጥፋ' : 'Delete'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Editor Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-3xl p-8 max-h-[90vh] overflow-y-auto border-brand-accent/30"
            >
              <div className="flex justify-between items-center mb-6 border-b border-brand-border pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-brand-accent" size={20} />
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    {editingNews 
                      ? (lang === 'am' ? 'ይፋዊ መግለጫ ማስተካከያ ክፍል' : 'Edit Official Statement') 
                      : (lang === 'am' ? 'አዲስ ይፋዊ መግለጫ መጻፊያ ክፍል' : 'Write Official Police Statement')}
                  </h3>
                </div>
                <button onClick={handleCloseModal} className="p-2 hover:bg-brand-bg rounded-lg text-brand-text-secondary">
                  <XIcon size={20} />
                </button>
              </div>

              {/* Mode toggles */}
              <div className="flex gap-2 mb-6 bg-brand-bg/40 p-1 rounded-xl border border-brand-border max-w-xs">
                <button
                  id="tab-composer-write"
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    !previewMode 
                      ? 'bg-brand-accent text-brand-bg' 
                      : 'text-brand-text-secondary hover:text-white'
                  }`}
                >
                  {lang === 'am' ? 'ጽሁፍ አዘጋጅ' : 'Edit Code'}
                </button>
                <button
                  id="tab-composer-preview"
                  type="button"
                  onClick={() => setPreviewMode(true)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    previewMode 
                      ? 'bg-brand-accent text-brand-bg' 
                      : 'text-brand-text-secondary hover:text-white'
                  }`}
                >
                  <Eye className="inline shrink-0 mr-1" size={12} />
                  {lang === 'am' ? 'ቀጥታ ማሳያ' : 'Live Preview'}
                </button>
              </div>

              {previewMode ? (
                /* Live Preview Window */
                <div className="space-y-6 border border-brand-accent/20 bg-brand-bg/50 p-6 rounded-2xl min-h-[300px]">
                  <div className="border-b border-brand-border/40 pb-4">
                    <div className="flex gap-3 text-xs text-brand-text-secondary mb-2 items-center">
                      <span className="px-2 py-0.5 bg-brand-accent/10 border border-brand-accent/30 text-brand-accent rounded">
                        {newNews.category}
                      </span>
                      <span>•</span>
                      <span>{newNews.date}</span>
                    </div>
                    <h2 className="text-2xl font-black text-white">{newNews.title || (lang === 'am' ? 'የመግለጫው ርዕስ እዚህ ይታያል' : 'Release Title Preview')}</h2>
                  </div>
                  
                  {newNews.photo && (
                    <div className="aspect-video w-full rounded-xl overflow-hidden max-h-64">
                      <img src={newNews.photo} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div 
                    className="text-sm text-brand-text-secondary leading-relaxed rich-text-display whitespace-pre-line"
                    dangerouslySetInnerHTML={{ __html: newNews.content || (lang === 'am' ? 'የመግለጫው ይዘት እዚህ በታረመ ቅፅ ይታያል...' : 'Content preview goes here...') }}
                  />

                  <div className="pt-6 border-t border-brand-border/40 text-xs text-brand-text-secondary">
                    {lang === 'am' ? `ማረጋገጫ፡ ${newNews.author || 'የምዕራብ ጎጃም መምሪያ'}` : `Authorized: ${newNews.author || 'WGZ Station'}`}
                  </div>
                </div>
              ) : (
                /* Edit Composer Panel */
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Category and Date row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                        {lang === 'am' ? 'የዝግጅቱ ካቴጎሪ / ዓይነት *' : 'Releasing Category *'}
                      </label>
                      <select
                        id="input-news-category"
                        className="input-field focus:border-brand-accent"
                        value={newNews.category}
                        onChange={(e) => setNewNews({ ...newNews, category: e.target.value })}
                      >
                        <option value="General">{lang === 'am' ? 'አጠቃላይ የፖሊስ መግለጫ (General)' : 'General Release'}</option>
                        <option value="Alert">{lang === 'am' ? 'አስቸኳይ ማስጠንቀቂያ (Alert Notice)' : 'Emergency Alert'}</option>
                        <option value="Press Release">{lang === 'am' ? 'የጋዜጣዊ መግለጫ (Press Statement)' : 'Press Statement'}</option>
                        <option value="Statement">{lang === 'am' ? 'ፖሊቲካዊ/መደበኛ መግለጫ (Official Statement)' : 'Official Statement'}</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                        {lang === 'am' ? 'ቀን' : 'Release Settle Date'}
                      </label>
                      <input
                        id="input-news-date"
                        type="date"
                        className="input-field focus:border-brand-accent"
                        value={newNews.date}
                        onChange={(e) => setNewNews({ ...newNews, date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Title and Author */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                        {lang === 'am' ? 'የመግለጫው ርዕስ *' : 'Statement Title / Headline *'}
                      </label>
                      <input
                        id="input-news-title"
                        required
                        type="text"
                        className="input-field animate-focus"
                        placeholder={lang === 'am' ? 'የዜናውን ዋና ርዕስ ያስገቡ' : 'Headline here'}
                        value={newNews.title}
                        onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                        {lang === 'am' ? 'ጸሐፊ / ክፍል (ለምሳሌ የምዕራብ ጎጃም መኮንን)' : 'Author / Department'}
                      </label>
                      <input
                        id="input-news-author"
                        type="text"
                        className="input-field animate-focus"
                        placeholder="e.g. Chief Sergeant Mengesha"
                        value={newNews.author}
                        onChange={(e) => setNewNews({ ...newNews, author: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Rich Editor compose formatting toolbar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                        {lang === 'am' ? 'የመግለጫው ዋና ይዘት * (HTML ፎርማት ይደግፋል)' : 'Statement Complete Content * (Rich html enabled)'}
                      </label>
                      {/* Rich buttons */}
                      <div className="flex gap-1.5 bg-brand-bg/80 border border-brand-border p-1 rounded-lg">
                        <button
                          id="rt-btn-bold"
                          type="button"
                          onClick={() => insertTextMarkup('bold')}
                          className="p-1.5 hover:bg-brand-accent/20 hover:text-brand-accent rounded text-brand-text-secondary transition-colors"
                          title="Bold Text (ደማቅ ጽሑፍ)"
                        >
                          <Bold size={14} />
                        </button>
                        <button
                          id="rt-btn-h"
                          type="button"
                          onClick={() => insertTextMarkup('header')}
                          className="p-1.5 hover:bg-brand-accent/20 hover:text-brand-accent rounded text-brand-text-secondary transition-colors"
                          title="Sub-heading (ንዑስ ርዕስ)"
                        >
                          <Heading size={14} />
                        </button>
                        <button
                          id="rt-btn-list"
                          type="button"
                          onClick={() => insertTextMarkup('list')}
                          className="p-1.5 hover:bg-brand-accent/20 hover:text-brand-accent rounded text-brand-text-secondary transition-colors"
                          title="Bullet List (ነጥብ ዝርዝር)"
                        >
                          <List size={14} />
                        </button>
                        <button
                          id="rt-btn-alert"
                          type="button"
                          onClick={() => insertTextMarkup('alert')}
                          className="p-1.5 hover:bg-rose-500/20 hover:text-rose-400 rounded text-brand-text-secondary transition-colors"
                          title="Urgent Banner Alert (አስቸኳይ ማስጠንቀቂያ)"
                        >
                          <AlertCircle size={14} />
                        </button>
                      </div>
                    </div>

                    <textarea
                      id="news-composer-textarea"
                      required
                      rows={10}
                      className="input-field focus:border-brand-accent font-sans whitespace-pre-wrap leading-relaxed min-h-[250px]"
                      placeholder={lang === 'am' ? 'የትራፊክ ደህንነት መግለጫዎችን እዚህ ይጻፉ። ከላይ ያሉትን የአርትዖት ቁልፎች መጠቀም ይችላሉ...' : 'Write official statements. Use the text design toolbar above to add alerts, lists, headers, etc...'}
                      value={newNews.content}
                      onChange={(e) => setNewNews({ ...newNews, content: e.target.value })}
                    />
                  </div>

                  {/* Attachment image */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-brand-text-secondary">
                      {lang === 'am' ? 'የዜና ገጽ ምስል / ፖስተር' : 'Press Photo Image (Base64 file or direct URL)'}
                    </label>
                    <input
                      id="input-news-photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-accent/15 file:text-brand-accent hover:file:bg-brand-accent/25"
                    />
                    <div className="flex gap-2 items-center text-[10px] mt-1 text-brand-text-secondary">
                      <span>{lang === 'am' ? 'ወይም ምስል ሊንክ' : 'Or paste URL:'}</span>
                      <input
                        id="input-news-photo-url"
                        type="text"
                        className="bg-transparent border-b border-brand-border text-white px-2 focus:outline-none flex-1 font-mono"
                        value={newNews.photo}
                        onChange={(e) => setNewNews({ ...newNews, photo: e.target.value })}
                      />
                    </div>
                  </div>
                </form>
              )}

              {/* Action Buttons Row */}
              <div className="flex justify-end gap-3 pt-6 border-t border-brand-border mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 rounded-xl border border-brand-border text-brand-text-secondary hover:bg-brand-bg transition-colors font-bold text-xs uppercase"
                >
                  {lang === 'am' ? 'ተመለስ' : 'Cancel'}
                </button>
                {!previewMode && (
                  <button
                    id="submit-news-item"
                    type="button"
                    onClick={handleSubmit}
                    className="px-6 py-2.5 rounded-xl btn-primary transition-all font-bold text-xs uppercase"
                  >
                    {editingNews 
                      ? (lang === 'am' ? 'መግለጫ አዘምን' : 'Publish Changes') 
                      : (lang === 'am' ? 'ልቀቅ / ይሰራጭ' : 'Publish Statement')}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple Helper X Icons for modal dismissal
function XIcon({ size = 20, className = "" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
