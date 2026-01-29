import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Trash2, Save, Eraser, FileText, 
  ChevronRight, Calendar, Clock, StickyNote, SendHorizontal
} from 'lucide-react';
import { format } from 'date-fns';
import { Note } from '../../types';

interface NoteViewProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
}

const NoteView: React.FC<NoteViewProps> = ({ notes, setNotes }) => {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes[0]?.id || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [noteTitle, setNoteTitle] = useState('노트 관리');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const activeNote = notes.find(n => n.id === activeNoteId) || null;

  const addNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: '새로운 메모',
      content: '',
      category: '일반',
      updatedAt: new Date().toISOString()
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  };

  const updateNoteContent = (content: string) => {
    if (!activeNoteId) return;
    setNotes(notes.map(n => n.id === activeNoteId ? 
      { ...n, content, updatedAt: new Date().toISOString() } : n));
  };

  const deleteNote = (id: string) => {
    if (window.confirm("이 노트를 삭제하시겠습니까?")) {
      const updatedNotes = notes.filter(n => n.id !== id);
      setNotes(updatedNotes);
      if (activeNoteId === id) setActiveNoteId(updatedNotes[0]?.id || null);
    }
  };

  const clearContent = () => {
    if (window.confirm("내용을 모두 비우시겠습니까?")) {
      updateNoteContent('');
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    // 회원 관리 모드와 동일한 패딩(p-1.5 md:p-6 pt-1) 적용
    <div className="flex flex-col h-full bg-[#121212] p-1.5 md:p-6 pt-1 text-gray-200">
      
      {/* 상단 타이틀바 (회원 관리 모드와 규격 일치) */}
      <div className="flex flex-col w-full mb-1.5">
        <div className="flex items-center justify-between w-full h-9">
          <div className="flex-1 overflow-hidden">
            {isEditingTitle ? (
              <input 
                autoFocus 
                className="bg-[#2c2c2e] border border-blue-500 rounded px-1.5 py-0.5 text-base font-black text-white outline-none w-full max-w-xs" 
                value={noteTitle} 
                onChange={(e) => setNoteTitle(e.target.value)} 
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              />
            ) : (
              <h2 
                className="text-lg md:text-2xl font-black text-white cursor-pointer tracking-tighter truncate text-left" 
                onClick={() => setIsEditingTitle(true)}
              >
                {noteTitle}
              </h2>
            )}
          </div>
          
          {/* 우측 조작 아이콘 (회원 모드와 크기 및 간격 일치) */}
          <div className="flex bg-[#1a1a2e] p-0.5 rounded-lg border border-[#3a3a5e] shadow-lg shrink-0 scale-90 origin-right">
            <button onClick={addNote} className="p-1 text-blue-500 hover:bg-[#2c2c2e] rounded transition-colors">
              <Plus className="w-5 h-5" />
            </button>
            <button className="p-1 text-emerald-400 hover:bg-[#2c2c2e] rounded transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button onClick={() => activeNoteId && deleteNote(activeNoteId)} className="p-1 text-red-500 hover:bg-[#2c2c2e] rounded transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-2 overflow-hidden border-t border-[#3a3a5e]/20 pt-1">
        {/* 사이드바: 노트 목록 */}
        <div className="w-1/3 md:w-1/4 flex flex-col gap-1.5 overflow-y-auto pr-1 border-r border-[#3a3a5e]/30">
          {filteredNotes.map(note => (
            <div 
              key={note.id}
              onClick={() => setActiveNoteId(note.id)}
              className={`p-2 rounded-lg cursor-pointer transition-all border ${
                activeNoteId === note.id 
                  ? 'bg-blue-600/20 border-blue-500/50' 
                  : 'bg-[#1a1a2e] border-[#3a3a5e] hover:border-gray-500'
              }`}
            >
              <h3 className="text-[10px] md:text-sm font-black text-white truncate mb-0.5">{note.title}</h3>
              <p className="text-[8px] md:text-xs text-gray-500 truncate">{note.content || '내용 없음'}</p>
            </div>
          ))}
        </div>

        {/* 메인: 노트 입력란 */}
        <div className="flex-1 flex flex-col bg-[#1a1a2e] rounded-lg border border-[#3a3a5e] relative overflow-hidden">
          {activeNote ? (
            <>
              <div className="flex items-center justify-between p-2 border-b border-[#3a3a5e]/50 bg-[#252545]/30">
                <input 
                  className="bg-transparent text-sm md:text-base font-black text-blue-400 outline-none w-full"
                  value={activeNote.title}
                  onChange={(e) => setNotes(notes.map(n => n.id === activeNoteId ? { ...n, title: e.target.value } : n))}
                />
                
                {/* 입력란 내부 아이콘: 40% 축소 (w-5 -> w-3) */}
                <div className="flex gap-1 items-center shrink-0">
                  <button 
                    onClick={() => alert('저장되었습니다.')}
                    className="p-1 text-emerald-500 hover:bg-[#2c2c2e] rounded transition-all"
                    title="기록"
                  >
                    <Save className="w-3 h-3" /> {/* 기존 5에서 3으로 축소 */}
                  </button>
                  <button 
                    onClick={clearContent}
                    className="p-1 text-orange-500 hover:bg-[#2c2c2e] rounded transition-all"
                    title="비움"
                  >
                    <Eraser className="w-3 h-3" /> {/* 기존 5에서 3으로 축소 */}
                  </button>
                </div>
              </div>
              <textarea 
                className="flex-1 p-3 bg-transparent text-gray-200 text-xs md:text-sm outline-none resize-none leading-relaxed"
                placeholder="내용을 입력하세요..."
                value={activeNote.content}
                onChange={(e) => updateNoteContent(e.target.value)}
              />
              <div className="p-1.5 px-3 border-t border-[#3a3a5e]/30 flex justify-between items-center bg-[#121212]/50">
                <span className="text-[9px] text-gray-600 font-bold tracking-tighter">
                  마지막 수정: {format(new Date(activeNote.updatedAt), 'yyyy-MM-dd HH:mm')}
                </span>
                <SendHorizontal className="w-3.5 h-3.5 text-blue-500 opacity-50" />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
              <StickyNote className="w-12 h-12 mb-2 opacity-20" />
              <p className="text-sm font-black">선택된 노트가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteView;