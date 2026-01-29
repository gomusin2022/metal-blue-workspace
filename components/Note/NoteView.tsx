import React, { useState, useRef } from 'react';
import { FileDown, FileUp, Save, Trash2, Edit2, X, Check, Eraser } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const autoResize = (target: HTMLTextAreaElement) => {
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  };

  const handleSave = () => {
    if (!newInput.trim()) return;
    const timeStamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const contentWithTime = `[${timeStamp}]\n${newInput}`;
    const newNote: Note = { id: crypto.randomUUID(), content: contentWithTime, createdAt: timeStamp };
    setNotes([newNote, ...notes]);
    setNewInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] p-1.5 md:p-6 pt-1 text-gray-200 overflow-hidden font-sans">
      
      {/* 상단 타이틀바: 회원 관리 모드와 여백 및 규격 완전 동기화 */}
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
          
          {/* 우측 아이콘 그룹: scale-90 제거 및 p-1 / rounded-xl 적용 (회원 모드와 동일) */}
          <div className="flex bg-[#1a1a2e] p-1 rounded-xl border border-[#3a3a5e] shadow-lg shrink-0 transition-all">
            <button onClick={onExport} className="p-1.5 text-emerald-400 hover:bg-[#2c2c2e] rounded-lg transition-colors" title="엑셀 내보내기">
              <FileDown className="w-5 h-5" />
            </button>
            <button onClick={() => fileRef.current?.click()} className="p-1.5 text-blue-400 hover:bg-[#2c2c2e] rounded-lg transition-colors" title="엑셀 가져오기">
              <FileUp className="w-5 h-5" />
            </button>
            <input type="file" ref={fileRef} onChange={onImport} className="hidden" accept=".xlsx,.xls" />
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto space-y-4 px-1 mt-2 custom-scrollbar">
        {/* 신규 입력 섹션: 기록/비움 버튼 40% 축소 */}
        <div className="flex items-start gap-3 w-full bg-[#252535] border border-gray-700 rounded-2xl p-4 shadow-inner">
          <div className="flex-grow">
            <textarea 
              className="w-full bg-transparent p-1 text-lg md:text-2xl font-bold outline-none text-white placeholder-gray-600 overflow-hidden resize-none"
              placeholder="메모를 입력하세요..." 
              value={newInput} 
              onChange={(e) => { setNewInput(e.target.value); autoResize(e.target); }}
            />
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {/* 콤팩트 버튼: w-14 h-14 규격 */}
            <button onClick={handleSave} className="w-14 h-14 bg-emerald-600 text-white rounded-xl font-black shadow-lg active:scale-95 flex flex-col items-center justify-center transition-all group">
              <Save className="w-5 h-5" />
              <span className="text-[10px]">기록</span>
            </button>
            <button onClick={() => setNewInput('')} className="w-14 h-8 bg-gray-800 text-gray-500 rounded-lg font-bold text-[10px] flex items-center justify-center hover:text-white transition-colors">
              <Eraser className="w-3.5 h-3.5 mr-1" /> 비움
            </button>
          </div>
        </div>

        {/* 기존 데이터 리스트 */}
        {notes.map(note => (
          <div key={note.id} className="flex items-start gap-3 w-full bg-[#1a1a2e] border border-gray-800 rounded-2xl p-4 shadow-lg transition-all hover:border-gray-600">
            <div className="flex-grow min-h-[40px] cursor-text" onClick={() => { setEditingId(note.id); setEditBuffer(note.content); }}>
              {editingId === note.id ? (
                <textarea 
                  autoFocus 
                  className="w-full bg-black text-white p-2 outline-none border-2 border-blue-600 rounded-lg font-bold text-lg md:text-xl overflow-hidden resize-none"
                  value={editBuffer} 
                  onChange={(e) => { setEditBuffer(e.target.value); autoResize(e.target); }}
                  onFocus={(e) => autoResize(e.target)}
                />
              ) : (
                <div className="text-lg md:text-2xl font-bold whitespace-pre-wrap text-gray-300 leading-tight tracking-tight">{note.content}</div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 shrink-0">
              <button onClick={() => { if(editingId === note.id) { setNotes(notes.map(n => n.id === note.id ? {...n, content: editBuffer} : n)); setEditingId(null); } else { setEditingId(note.id); setEditBuffer(note.content); } }} className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-md active:scale-95">
                <Check className="w-5 h-5" />
              </button>
              <button onClick={() => { setEditingId(note.id); setEditBuffer(note.content); }} className="w-10 h-10 bg-gray-700 text-white rounded-lg flex items-center justify-center hover:bg-gray-600">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => { if(window.confirm("삭제하시겠습니까?")) setNotes(notes.filter(n => n.id !== note.id)) }} className="w-10 h-10 bg-red-900/50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-800">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NoteView;