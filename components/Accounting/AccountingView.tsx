import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Save, FileDown, FileUp, 
  Printer, X, Wallet, Check, ChevronDown 
} from 'lucide-react';
import { format, addHours, parse } from 'date-fns';
import * as XLSX from 'xlsx';
import { AccountingEntry, AccountingSheet } from '../../types';

type WorkMode = '추가' | '수정' | '복사' | '삭제';

const AccountingView: React.FC = () => {
  // --- [상태 관리] ---
  const [sheets, setSheets] = useState<AccountingSheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const [workMode, setWorkMode] = useState<WorkMode>('추가');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  const [inDate, setInDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [inHour, setInHour] = useState(new Date().getHours());
  const [inMin, setInMin] = useState(0);
  const [inType, setInType] = useState<'수입' | '지출'>('수입');
  const [inItem, setInItem] = useState('');
  const [inAmount, setInAmount] = useState<number | string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 데이터 로드/저장
  useEffect(() => {
    const saved = localStorage.getItem('metal_accounting_sheets');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSheets(parsed);
      if (parsed.length > 0) setActiveSheetId(parsed[0].id);
    } else {
      const defaultSheet: AccountingSheet = { id: crypto.randomUUID(), name: '운영비', entries: [] };
      setSheets([defaultSheet]);
      setActiveSheetId(defaultSheet.id);
    }
  }, []);

  useEffect(() => {
    if (sheets.length > 0) localStorage.setItem('metal_accounting_sheets', JSON.stringify(sheets));
  }, [sheets]);

  const activeSheet = useMemo(() => sheets.find(s => s.id === activeSheetId), [sheets, activeSheetId]);

  const sortedEntries = useMemo(() => {
    if (!activeSheet) return [];
    const sorted = [...activeSheet.entries].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.hour !== b.hour) return a.hour - b.hour;
      return a.minute - b.minute;
    });
    let bal = 0;
    return sorted.map(e => {
      bal += (e.incomeAmount - e.expenseAmount);
      return { ...e, balance: bal };
    });
  }, [activeSheet]);

  const summary = useMemo(() => {
    const totalInc = sortedEntries.reduce((s, e) => s + e.incomeAmount, 0);
    const totalExp = sortedEntries.reduce((s, e) => s + e.expenseAmount, 0);
    return { totalInc, totalExp, balance: totalInc - totalExp };
  }, [sortedEntries]);

  // --- [핸들러] ---
  const handleAddSheet = () => {
    const name = window.prompt("새 시트 이름", "");
    if (name) {
      const newSheet = { id: crypto.randomUUID(), name, entries: [] };
      setSheets([...sheets, newSheet]);
      setActiveSheetId(newSheet.id);
    }
  };

  const handleDeleteSheet = () => {
    if (sheets.length <= 1) return alert("최소 하나의 시트 필요");
    if (window.confirm(`[${activeSheet?.name}] 삭제?`)) {
      const filtered = sheets.filter(s => s.id !== activeSheetId);
      setSheets(filtered);
      setActiveSheetId(filtered[0].id);
    }
  };

  const commitRename = () => {
    if (renameValue.trim()) {
      setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, name: renameValue } : s));
    }
    setIsRenaming(null);
  };

  const handleSaveEntry = () => {
    if (!inItem.trim() || !inAmount) return;
    const amt = Number(inAmount);
    if (workMode === '수정' && editingEntryId) {
      setSheets(sheets.map(s => s.id === activeSheetId ? {
        ...s, entries: s.entries.map(e => e.id === editingEntryId ? {
          ...e, date: inDate, hour: inHour, minute: inMin, type: inType, item: inItem,
          incomeAmount: inType === '수입' ? amt : 0, expenseAmount: inType === '지출' ? amt : 0
        } : e)
      } : s));
      setEditingEntryId(null); setWorkMode('추가');
    } else {
      const newEntry = {
        id: crypto.randomUUID(), date: inDate, hour: inHour, minute: inMin,
        type: inType, item: inItem, incomeAmount: inType === '수입' ? amt : 0,
        expenseAmount: inType === '지출' ? amt : 0, balance: 0
      };
      setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, entries: [...s.entries, newEntry] } : s));
    }
    const currentDT = parse(`${inDate} ${inHour}:${inMin}`, 'yyyy-MM-dd H:m', new Date());
    const nextDT = addHours(currentDT, 1);
    setInDate(format(nextDT, 'yyyy-MM-dd')); setInHour(nextDT.getHours()); setInMin(0);
    setInItem(''); setInAmount('');
  };

  const exportToExcel = () => {
    if (!activeSheet || sortedEntries.length === 0) return;
    const defaultFileName = `회계장부_${activeSheet.name}_${format(new Date(), 'yyyyMMdd')}`;
    const customName = window.prompt("파일명 입력:", defaultFileName);
    if (!customName) return;
    const wb = XLSX.utils.book_new();
    const data = sortedEntries.map(e => ({
      '날짜': e.date, '시간': `${String(e.hour).padStart(2,'0')}:${String(e.minute).padStart(2,'0')}`,
      '구분': e.type, '내역': e.item, '수입금액': e.incomeAmount, '지출금액': e.expenseAmount, '누계': e.balance
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, activeSheet.name);
    XLSX.writeFile(wb, `${customName}.xlsx`);
  };

  const importFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSheet) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws);
        const imported = data.map(row => ({
          id: crypto.randomUUID(), date: String(row['날짜'] || inDate),
          hour: parseInt(String(row['시간'] || '0').split(':')[0]), 
          minute: parseInt(String(row['시간'] || '0').split(':')[1] || '0'),
          type: row['구분'] || '수입', item: String(row['내역'] || ''),
          incomeAmount: Number(row['수입금액'] || 0), expenseAmount: Number(row['지출금액'] || 0), balance: 0
        }));
        if (window.confirm("기존 내용을 삭제하고 덮어씌우시겠습니까?")) {
          setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, entries: imported } : s));
        } else {
          setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, entries: [...s.entries, ...imported] } : s));
        }
      } catch (err) { alert("오류"); }
    };
    reader.readAsBinaryString(file);
  };

  const handleRowClick = (entry: AccountingEntry) => {
    if (workMode === '삭제') {
      if (window.confirm(`[${entry.item}] 삭제?`)) {
        setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, entries: s.entries.filter(e => e.id !== entry.id) } : s));
      }
    } else if (workMode === '수정' || workMode === '복사') {
      setInDate(entry.date); setInHour(entry.hour); setInMin(entry.minute);
      setInType(entry.type); setInItem(entry.item);
      setInAmount(entry.incomeAmount || entry.expenseAmount);
      setEditingEntryId(workMode === '수정' ? entry.id : null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-gray-200 overflow-hidden font-sans select-none">
      
      {/* 1. 타이틀바 */}
      <div className="flex items-center bg-[#000] border-b border-[#1a1a2e] px-3 h-14 shrink-0">
        <div className="flex-grow pl-1">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tighter">회계장부</h2>
        </div>
        <div className="flex items-center gap-1 z-10">
          {isRenaming === activeSheetId ? (
            <div className="flex items-center bg-[#1c1c1e] border border-blue-500 rounded px-2">
              <input autoFocus className="bg-transparent text-sm font-bold text-white outline-none py-1 w-20" value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && commitRename()}/>
              <button onClick={commitRename} className="text-emerald-400 p-1"><Check className="w-4 h-4"/></button>
            </div>
          ) : (
            <div className="flex items-center">
              <select value={activeSheetId} onChange={(e) => setActiveSheetId(e.target.value)} className="bg-[#1c1c1e] text-blue-400 text-sm font-black outline-none border border-[#333] px-2 py-1.5 rounded-lg appearance-none">
                {sheets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button onClick={() => {setIsRenaming(activeSheetId); setRenameValue(activeSheet?.name || '');}} className="p-1.5 text-gray-600"><Edit2 className="w-4 h-4" /></button>
            </div>
          )}
          <button onClick={handleAddSheet} className="p-1.5 bg-blue-600 rounded active:scale-95"><Plus className="w-5 h-5" /></button>
          <button onClick={handleDeleteSheet} className="p-1.5 bg-red-900/40 text-red-500 rounded active:scale-95 ml-0.5"><Trash2 className="w-5 h-5" /></button>
        </div>
      </div>

      {/* 2. 대시보드 */}
      <div className="flex flex-col bg-[#111] border-b border-[#222]">
        <div className="flex items-center justify-between p-2">
          {/* 작업 버튼: 크기 줄임, 한글 강조 */}
          <div className="flex bg-[#1c1c1e] p-1 rounded-lg gap-1 border border-[#333]">
            {(['추가', '수정', '복사', '삭제'] as WorkMode[]).map(m => (
              <button key={m} onClick={() => { setWorkMode(m); if(m==='추가') setEditingEntryId(null); }} 
                      className={`px-3 py-1.5 rounded-md text-sm font-black transition-all ${workMode === m ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600'}`}>
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-indigo-600 rounded active:scale-95"><FileUp className="w-5 h-5"/></button>
            <input type="file" ref={fileInputRef} onChange={importFromExcel} className="hidden" accept=".xlsx,.xls"/>
            <button onClick={exportToExcel} className="p-2 bg-emerald-600 rounded active:scale-95"><FileDown className="w-5 h-5"/></button>
            <button onClick={() => window.print()} className="p-2 bg-orange-600 rounded active:scale-95"><Printer className="w-5 h-5"/></button>
          </div>
        </div>

        {/* 요약: 한글/숫자 크기 적절히 축소 */}
        <div className="flex items-center justify-around py-3 bg-black/50 border-t border-[#222]">
          <div className="text-center"><p className="text-[11px] text-blue-400 font-bold mb-0.5">총수입</p><p className="text-lg font-black text-emerald-400">+{summary.totalInc.toLocaleString()}</p></div>
          <div className="text-center"><p className="text-[11px] text-blue-400 font-bold mb-0.5">총지출</p><p className="text-lg font-black text-rose-500">-{summary.totalExp.toLocaleString()}</p></div>
          <div className="text-center"><p className="text-[11px] text-cyan-400 font-bold mb-0.5">현재누계</p><p className="text-lg font-black text-cyan-400">{summary.balance.toLocaleString()}</p></div>
        </div>
      </div>

      {/* 3. 데이터 테이블 (헤더 복구) */}
      <div className="flex-grow overflow-auto no-scrollbar bg-black">
        <table className="hidden md:table w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-[#1c1c1e] text-orange-500 font-black border-b border-orange-900">
            <tr>
              <th className="p-3 border border-gray-800 w-36 text-xs">날짜</th>
              <th className="p-3 border border-gray-800 w-28 text-xs">시간</th>
              <th className="p-3 border border-gray-800 w-24 text-xs">구분</th>
              <th className="p-3 border border-gray-800 text-left pl-6 text-xs">내역</th>
              <th className="p-3 border border-gray-800 text-right text-xs pr-4">수입</th>
              <th className="p-3 border border-gray-800 text-right text-xs pr-4">지출</th>
              <th className="p-3 border border-gray-800 text-right text-xs pr-4">누계</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map(e => (
              <tr key={e.id} onClick={() => handleRowClick(e)} className={`cursor-pointer border-b border-gray-900 transition-colors ${editingEntryId === e.id ? 'bg-blue-900/40' : 'hover:bg-[#1a1a2e]'}`}>
                <td className="p-3 text-center text-blue-100 font-bold text-base">{e.date}</td>
                <td className="p-3 text-center text-cyan-400 font-black text-base font-mono">{String(e.hour).padStart(2,'0')}:{String(e.minute).padStart(2,'0')}</td>
                <td className={`p-3 text-center font-black ${e.type === '수입' ? 'text-emerald-500' : 'text-rose-500'}`}>{e.type}</td>
                <td className="p-3 font-black text-yellow-400 text-base text-left pl-6 truncate">{e.item}</td>
                <td className="p-3 text-right text-emerald-300 font-black pr-4">{e.incomeAmount > 0 ? e.incomeAmount.toLocaleString() : '-'}</td>
                <td className="p-3 text-right text-rose-300 font-black pr-4">{e.expenseAmount > 0 ? e.expenseAmount.toLocaleString() : '-'}</td>
                <td className="p-3 text-right text-cyan-300 font-black text-base pr-4">{e.balance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 모바일 뷰 */}
        <div className="md:hidden flex flex-col">
          {sortedEntries.map(e => (
            <div key={e.id} onClick={() => handleRowClick(e)} className={`p-3 border-b border-[#111] flex items-center justify-between active:bg-[#1a1a2e] ${editingEntryId === e.id ? 'bg-blue-900/40' : ''}`}>
              <div className="flex flex-col shrink-0">
                <span className="text-[14px] text-blue-100 font-bold">{e.date.slice(5)} <span className="text-cyan-400 ml-1 font-black">{String(e.hour).padStart(2,'0')}:{String(e.minute).padStart(2,'0')}</span></span>
                <span className={`text-[11px] font-black uppercase ${e.type === '수입' ? 'text-emerald-500' : 'text-rose-500'}`}>{e.type}</span>
              </div>
              <div className="flex-grow px-3 overflow-hidden text-left">
                <p className="text-base font-black text-yellow-400 truncate">{e.item}</p>
                <p className="text-sm font-black text-gray-400">{(e.incomeAmount || e.expenseAmount).toLocaleString()}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-cyan-600 font-bold uppercase">누계</p>
                <p className="text-lg font-black text-cyan-300">{e.balance.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. 입력 푸터 */}
      <div className="bg-[#1a1a2e] border-t-2 border-blue-600 p-2 pb-safe shadow-2xl shrink-0">
        <div className="grid grid-cols-4 md:flex items-center gap-2">
          <input type="date" value={inDate} onChange={e => setInDate(e.target.value)} className="col-span-2 md:w-44 bg-black border border-gray-700 p-2 rounded text-sm text-white font-bold"/>
          <div className="col-span-2 md:w-32 flex gap-1">
            <select value={inHour} onChange={e => setInHour(Number(e.target.value))} className="flex-grow bg-black border border-gray-700 p-2 rounded text-cyan-400 font-black text-lg text-center appearance-none">
              {Array.from({length: 24}).map((_, i) => <option key={i} value={i}>{String(i).padStart(2,'0')}시</option>)}
            </select>
            <select value={inMin} onChange={e => setInMin(Number(e.target.value))} className="flex-grow bg-black border border-gray-700 p-2 rounded text-cyan-400 font-black text-lg text-center appearance-none">
              {[0, 10, 20, 30, 40, 50].map(m => <option key={m} value={m}>{String(m).padStart(2,'0')}분</option>)}
            </select>
          </div>
          <select value={inType} onChange={e => setInType(e.target.value as '수입' | '지출')} className="col-span-1 bg-black border border-gray-700 p-2 rounded text-yellow-500 font-black text-sm">
            <option value="수입">수입</option><option value="지출">지출</option>
          </select>
          <input type="text" value={inItem} onChange={e => setInItem(e.target.value)} placeholder="내역" className="col-span-3 md:flex-grow bg-black border border-gray-700 p-2 rounded text-white font-black text-sm"/>
          <div className="col-span-4 md:w-auto flex gap-2">
            <input type="number" value={inAmount} onChange={e => setInAmount(e.target.value)} placeholder="금액" className="flex-grow md:w-44 bg-black border border-gray-700 p-2 rounded text-right font-black text-lg"/>
            <button onClick={handleSaveEntry} className="px-6 py-2 bg-blue-600 text-white rounded active:scale-95"><Check className="w-6 h-6"/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingView;