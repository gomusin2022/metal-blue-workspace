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

    const isAppend = window.confirm("합치기(확인) / 덮어쓰기(취소)를 선택해주세요.");

    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const data = XLSX.read(ev.target?.result, { type: 'binary' });
        const rows = XLSX.utils.sheet_to_json(data.Sheets[data.SheetNames[0]]) as any[];
        
        const importedData: Note[] = rows.map(r => ({ 
          id: crypto.randomUUID(), 
          content: String(r['내용'] || r['content'] || ''), 
          createdAt: String(r['시간'] || r['createdAt'] || format(new Date(), 'yyyy-MM-dd HH:mm:ss')) 
        }));

        if (isAppend) {
          setNotes(prev => [...importedData, ...prev]);
        } else {
          setNotes(importedData);
        }
      } catch (error) {
        alert("엑셀 파일 읽기 중 오류가 발생했습니다.");
      }
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
    <div className="flex flex-col h-full bg-[#121212] p-1.5 md:p-6 pt-0.5 text-gray-200 overflow-hidden font-sans">
      
      {/* 상단 타이틀바 (여백 mb-1로 최적화) */}
      <div className="flex flex-col w-full mb-1">
        <div className="flex items-center justify-between w-full h-10">
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
          
          {/* 타이틀 우측 아이콘: p-1.5, rounded 규격 통일 */}
          <div className="flex bg-[#1a1a2e] p-1 rounded border border-[#3a3a5e] shadow-lg shrink-0 transition-all">
            <button onClick={onExport} className="p-1.5 text-emerald-400 hover:bg-[#2c2c2e] rounded transition-colors" title="엑셀 내보내기">
              <FileDown className="w-5 h-5" />
            </button>
            <button onClick={() => fileRef.current?.click()} className="p-1.5 text-blue-400 hover:bg-[#2c2c2e] rounded transition-colors" title="엑셀 가져오기">
              <FileUp className="w-5 h-5" />
            </button>
            <input type="file" ref={fileRef} onChange={onImport} className="hidden" accept=".xlsx,.xls" />
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto space-y-4 px-1 mt-1 custom-scrollbar">
        {/* 신규 입력 섹션: 기록/비움 버튼을 문자전송 버튼 규격으로 변경 */}
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
            {/* 기록 버튼: 문자전송 버튼 스타일 적용 */}
            <button 
              onClick={handleSave} 
              className="p-1.5 bg-emerald-600 border border-emerald-400/50 rounded text-white shadow-lg active:scale-95 flex flex-col items-center justify-center transition-all"
              title="기록"
            >
              <Save className="w-5 h-5" />
              <span className="text-[9px] font-black mt-0.5">기록</span>
            </button>
            {/* 비움 버튼: 문자전송 버튼 스타일 적용 */}
            <button 
              onClick={() => setNewInput('')} 
              className="p-1.5 bg-gray-800 border border-gray-600/50 rounded text-gray-400 hover:text-white transition-colors flex flex-col items-center justify-center"
              title="비움"
            >
              <Eraser className="w-5 h-5" />
              <span className="text-[9px] font-black mt-0.5">비움</span>
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
              {/* 리스트 내 액션 버튼: p-1.5, rounded 규격 통일 */}
              <button 
                onClick={() => { 
                  if(editingId === note.id) { 
                    setNotes(notes.map(n => n.id === note.id ? {...n, content: editBuffer} : n)); 
                    setEditingId(null); 
                  } else { 
                    setEditingId(note.id); 
                    setEditBuffer(note.content); 
                  } 
                }} 
                className="p-1.5 bg-blue-600 text-white rounded flex items-center justify-center shadow-md active:scale-95"
              >
                <Check className="w-5 h-5" />
              </button>
              <button 
                onClick={() => { setEditingId(note.id); setEditBuffer(note.content); }} 
                className="p-1.5 bg-gray-700 text-white rounded flex items-center justify-center hover:bg-gray-600"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => { if(window.confirm("삭제하시겠습니까?")) setNotes(notes.filter(n => n.id !== note.id)) }} 
                className="p-1.5 bg-red-900/50 text-red-500 rounded flex items-center justify-center hover:bg-red-800"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NoteView;