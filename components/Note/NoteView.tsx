import React, { useState, useRef } from 'react';
import { FileDown, FileUp, Save, Trash2, Edit2, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

// [1] 독립 인터페이스 정의 (외부 참조 제거)
interface Note {
  id: string;
  content: string;
  createdAt: string;
}

interface NoteViewProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  noteTitle: string;
  setNoteTitle: (title: string) => void;
}

const NoteView: React.FC<NoteViewProps> = ({ notes, setNotes, noteTitle, setNoteTitle }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [newInput, setNewInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // 엑셀 내보내기 로직
  const onExport = () => {
    if (notes.length === 0) return;
    const name = window.prompt("파일명 입력", `${noteTitle}_${format(new Date(), 'yyyyMMdd')}`);
    if (name) {
      const ws = XLSX.utils.json_to_sheet(notes.map(n => ({ '시간': n.createdAt, '내용': n.content })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Notes");
      XLSX.writeFile(wb, `${name}.xlsx`);
    }
  };

  // 엑셀 가져오기 로직
  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      const data = XLSX.read(ev.target?.result, { type: 'binary' });
      const rows = XLSX.utils.sheet_to_json(data.Sheets[data.SheetNames[0]]) as any[];
      setNotes(prev => [...rows.map(r => ({ 
        id: crypto.randomUUID(), 
        content: String(r['내용'] || ''), 
        createdAt: String(r['시간'] || format(new Date(), 'yyyy-MM-dd HH:mm:ss')) 
      })), ...prev]);
    };
    r.readAsBinaryString(f);
    e.target.value = '';
  };

  // 텍스트 영역 높이 자동 조절
  const autoResize = (target: HTMLTextAreaElement) => {
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  };

  // 신규 메모 저장 (본문 맨 윗줄에 시간 삽입)
  const handleSave = () => {
    if (!newInput.trim()) return;
    const timeStamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const contentWithTime = `[${timeStamp}]\n${newInput}`;
    const newNote: Note = { id: crypto.randomUUID(), content: contentWithTime, createdAt: timeStamp };
    setNotes([newNote, ...notes]);
    setNewInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] p-6 pt-2 text-gray-200 overflow-hidden">
      {/* 상단 헤더: h-20 고정, mb-0 및 pb-0으로 여백 제거 */}
      <div className="relative flex items-center justify-center h-20 shrink-0 border-b border-gray-800 w-full mb-0 pb-0">
        <div className="absolute left-0 w-32"></div>
        <h2 className="text-4xl font-black text-white text-center tracking-tighter">{noteTitle}</h2>
        <div className="absolute right-0 flex gap-4 w-32 justify-end">
          <button onClick={onExport} className="p-3 bg-gray-800 text-emerald-400 rounded-2xl border border-gray-700 hover:bg-gray-700 shadow-lg transition-all">
            <FileDown size={32} />
          </button>
          <button onClick={() => fileRef.current?.click()} className="p-3 bg-gray-800 text-blue-400 rounded-2xl border border-gray-700 hover:bg-gray-700 shadow-lg transition-all">
            <FileUp size={32} />
          </button>
          <input type="file" ref={fileRef} onChange={onImport} className="hidden" accept=".xlsx,.xls" />
        </div>
      </div>

      <div className="flex-grow overflow-y-auto space-y-6 px-2 mt-4">
        {/* 신규 입력 섹션: mb-0으로 하단 여백 제거 */}
        <div className="flex items-start gap-6 w-full bg-[#252535] border-2 border-dashed border-gray-700 rounded-[2rem] p-6 shadow-inner mb-0">
          <div className="flex-grow">
            <textarea 
              className="w-full bg-transparent p-2 text-3xl font-bold outline-none text-white placeholder-gray-600 overflow-hidden resize-none"
              placeholder="여기에 새로운 메모를 기록하세요..." 
              value={newInput} 
              onChange={(e) => { setNewInput(e.target.value); autoResize(e.target); }}
            />
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <button onClick={handleSave} className="w-24 h-24 bg-emerald-600 text-white rounded-3xl font-black text-xl shadow-2xl active:scale-95 flex flex-col items-center justify-center gap-1 transition-all">
              <Save size={32} />
              <span>기록</span>
            </button>
            <button onClick={() => setNewInput('')} className="w-24 h-12 bg-gray-800 text-gray-500 rounded-xl font-bold text-sm">비움</button>
          </div>
        </div>

        {/* 기존 데이터 리스트 */}
        {notes.map(note => (
          <div key={note.id} className="flex items-start gap-6 w-full bg-[#1a1a2e] border border-gray-800 rounded-[2rem] p-6 shadow-2xl transition-all">
            <div className="flex-grow min-h-[60px] cursor-text" onClick={() => { setEditingId(note.id); setEditBuffer(note.content); }}>
              {editingId === note.id ? (
                <textarea 
                  autoFocus 
                  className="w-full bg-black text-white p-2 outline-none border-4 border-blue-600 rounded-xl font-bold text-2xl overflow-hidden resize-none"
                  value={editBuffer} 
                  onChange={(e) => { setEditBuffer(e.target.value); autoResize(e.target); }}
                  onFocus={(e) => autoResize(e.target)}
                />
              ) : (
                <div className="text-3xl font-bold whitespace-pre-wrap text-gray-300 leading-tight tracking-tight">{note.content}</div>
              )}
            </div>

            {/* 조작 버튼 4개 */}
            <div className="flex flex-col gap-3 shrink-0">
              <button onClick={() => { if(editingId === note.id) { setNotes(notes.map(n => n.id === note.id ? {...n, content: editBuffer} : n)); setEditingId(null); } else { setEditingId(note.id); setEditBuffer(note.content); } }} className="w-24 h-14 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center shadow-lg active:scale-95 transition-all">
                <Check size={32} />
              </button>
              <button onClick={() => { setEditingId(note.id); setEditBuffer(note.content); }} className="w-24 h-14 bg-gray-700 text-white rounded-2xl font-black flex items-center justify-center hover:bg-gray-600 transition-colors">
                <Edit2 size={32} />
              </button>
              <button onClick={() => setEditingId(null)} className="w-24 h-14 bg-gray-800 text-gray-400 rounded-2xl font-black flex items-center justify-center hover:bg-gray-700">
                <X size={32} />
              </button>
              <button onClick={() => { if(window.confirm("삭제하시겠습니까?")) setNotes(notes.filter(n => n.id !== note.id)) }} className="w-24 h-14 bg-red-900 text-red-300 rounded-2xl font-black flex items-center justify-center hover:bg-red-800">
                <Trash2 size={32} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NoteView;