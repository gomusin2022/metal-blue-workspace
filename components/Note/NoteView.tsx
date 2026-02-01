import React, { useState, useRef, useEffect } from 'react';
import { Note } from '../../types';
import { Edit2, Check, Trash2, Plus } from 'lucide-react';

interface NoteViewProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  noteTitle: string;
  setNoteTitle: (title: string) => void;
}

const NoteView: React.FC<NoteViewProps> = ({ notes, setNotes, noteTitle, setNoteTitle }) => {
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  // 포커스 제어를 위한 Ref
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // 수정 버튼 클릭 시 커서를 마지막으로 이동시키는 로직
  const startEditing = (note: Note) => {
    setEditingId(note.id);
    setEditValue(note.content);
  };

  // editingId가 변경될 때(수정 모드 진입 시) 포커스 및 커서 위치 제어
  useEffect(() => {
    if (editingId && editInputRef.current) {
      const el = editInputRef.current;
      el.focus();
      // 커서를 텍스트 맨 뒤로 이동
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editingId]);

  const saveEdit = () => {
    if (!editingId) return;
    setNotes(notes.map(n => n.id === editingId ? { ...n, content: editValue } : n));
    setEditingId(null);
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    const note: Note = {
      id: crypto.randomUUID(),
      content: newNote,
      date: new Date().toISOString()
    };
    setNotes([note, ...notes]);
    setNewNote('');
  };

  const deleteNote = (id: string) => {
    if (window.confirm('기록을 삭제하시겠습니까?')) {
      setNotes(notes.filter(n => n.id !== id));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] p-4 md:p-6 overflow-hidden">
      {/* 노트 타이틀 영역 */}
      <div className="mb-6 shrink-0">
        {isEditingTitle ? (
          <input
            autoFocus
            className="bg-[#1a1a2e] border-b-2 border-blue-500 text-2xl md:text-3xl font-black text-white outline-none w-full pb-1"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
          />
        ) : (
          <h2 
            className="text-2xl md:text-3xl font-black text-white cursor-pointer hover:text-blue-400 transition-colors tracking-tighter"
            onClick={() => setIsEditingTitle(true)}
          >
            {noteTitle}
          </h2>
        )}
      </div>

      {/* 새 노트 입력 */}
      <div className="bg-[#1a1a2e] rounded-xl border border-[#3a3a5e] p-4 mb-6 shrink-0 shadow-xl">
        <textarea
          className="w-full bg-transparent border-none outline-none text-gray-200 placeholder-gray-500 resize-none mb-2 min-h-[80px]"
          placeholder="새로운 아이디어나 메모를 입력하세요..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        />
        <div className="flex justify-end">
          <button
            onClick={addNote}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" /> 기록하기
          </button>
        </div>
      </div>

      {/* 노트 리스트 */}
      <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        {notes.map((note) => (
          <div key={note.id} className="bg-[#1a1a2e] rounded-xl border border-[#3a3a5e] p-4 group transition-all hover:border-blue-500/50 shadow-md">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-grow">
                {editingId === note.id ? (
                  <textarea
                    ref={editInputRef}
                    className="w-full bg-[#121212] border border-blue-500 rounded p-2 text-gray-200 outline-none resize-none min-h-[100px]"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        saveEdit();
                      }
                    }}
                  />
                ) : (
                  <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                )}
                <div className="mt-2 text-[10px] text-gray-500 font-medium">
                  {new Date(note.date).toLocaleString()}
                </div>
              </div>
              
              <div className="flex flex-col gap-2 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                {/* 수정/저장 가변 버튼 */}
                <button
                  onClick={editingId === note.id ? saveEdit : () => startEditing(note)}
                  className={`p-2 rounded-lg transition-colors ${
                    editingId === note.id ? 'bg-emerald-600 text-white' : 'hover:bg-blue-900/30 text-blue-400'
                  }`}
                  title={editingId === note.id ? "저장" : "수정"}
                >
                  {editingId === note.id ? <Check className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="p-2 hover:bg-rose-900/30 text-rose-400 rounded-lg transition-colors"
                  title="삭제"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NoteView;