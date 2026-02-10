/**
 * AccountingView.tsx - 범용 회계장부 모듈 (모바일 최적화 및 기능 복구판)
 * 원칙 준수 사항:
 * 1. 소스 누락 금지: 기존 엑셀 임포트, 인라인 수정, 대시보드 로직 유지
 * 2. 모바일 최적화: 좁은 화면에서 리스트형으로 전환하여 누계 시인성 확보
 * 3. 기능 복구: 추가/수정/복사/삭제 작업 모드 버튼 그룹 추가
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Save, FileDown, FileUp, 
  Printer, X, Wallet, Check, Copy, RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { AccountingEntry, AccountingSheet } from '../../types';

// 작업 모드 타입 정의
type WorkMode = '추가' | '수정' | '복사' | '삭제';

const AccountingView: React.FC = () => {
  // --- [1. 상태 관리] ---
  const [sheets, setSheets] = useState<AccountingSheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const [workMode, setWorkMode] = useState<WorkMode>('추가'); // 기능 버튼 상태
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  // 입력 폼 상태
  const [inDate, setInDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [inHour, setInHour] = useState(new Date().getHours());
  const [inMin, setInMin] = useState(new Date().getMinutes());
  const [inType, setInType] = useState<'수입' | '지출'>('수입');
  const [inItem, setInItem] = useState('');
  const [inAmount, setInAmount] = useState<number | string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- [2. 초기 로드 및 저장] ---
  useEffect(() => {
    const saved = localStorage.getItem('metal_accounting_sheets');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSheets(parsed);
      if (parsed.length > 0) setActiveSheetId(parsed[0].id);
    } else {
      const defaultSheet: AccountingSheet = {
        id: crypto.randomUUID(),
        name: '회계장부',
        entries: []
      };
      setSheets([defaultSheet]);
      setActiveSheetId(defaultSheet.id);
    }
  }, []);

  useEffect(() => {
    if (sheets.length > 0) {
      localStorage.setItem('metal_accounting_sheets', JSON.stringify(sheets));
    }
  }, [sheets]);

  // --- [3. 계산 엔진] ---
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

  // --- [4. 핸들러: 시트 및 모드 관리] ---
  const addSheet = () => {
    const name = window.prompt("새 장부 이름을 입력하세요", "새 장부");
    if (!name) return;
    const newSheet: AccountingSheet = { id: crypto.randomUUID(), name, entries: [] };
    setSheets([...sheets, newSheet]);
    setActiveSheetId(newSheet.id);
  };

  const deleteSheet = () => {
    if (sheets.length <= 1) return alert("최소 하나의 장부는 유지해야 합니다.");
    if (window.confirm(`현재 장부[${activeSheet?.name}]를 삭제하시겠습니까?`)) {
      const filtered = sheets.filter(s => s.id !== activeSheetId);
      setSheets(filtered);
      setActiveSheetId(filtered[0].id);
    }
  };

  const commitRename = () => {
    if (!renameValue.trim()) return setIsRenaming(null);
    setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, name: renameValue } : s));
    setIsRenaming(null);
  };

  // --- [5. 핸들러: 데이터 조작 및 작업 모드 로직] ---
  const handleRowClick = (entry: AccountingEntry) => {
    if (workMode === '삭제') {
      if (window.confirm("이 항목을 삭제하시겠습니까?")) {
        setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, entries: s.entries.filter(e => e.id !== entry.id) } : s));
      }
    } else if (workMode === '복사' || workMode === '수정') {
      setInDate(entry.date);
      setInHour(entry.hour);
      setInMin(entry.minute);
      setInType(entry.type);
      setInItem(entry.item);
      setInAmount(entry.type === '수입' ? entry.incomeAmount : entry.expenseAmount);
      
      if (workMode === '수정') {
        // 수정 시에는 기존 항목 제거 후 입력창으로 이동 (덮어쓰기 유도)
        setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, entries: s.entries.filter(e => e.id !== entry.id) } : s));
        setWorkMode('추가'); // 수정 후에는 추가 모드로 자동 전환
      }
    }
  };

  const handleSaveEntry = () => {
    if (!inItem.trim() || !inAmount) return;
    const amt = Number(inAmount);
    const newEntry: AccountingEntry = {
      id: crypto.randomUUID(),
      date: inDate,
      hour: inHour,
      minute: inMin,
      type: inType,
      item: inItem,
      incomeAmount: inType === '수입' ? amt : 0,
      expenseAmount: inType === '지출' ? amt : 0,
      balance: 0
    };
    setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, entries: [...s.entries, newEntry] } : s));
    setInItem(''); setInAmount('');
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
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        const importedEntries: AccountingEntry[] = data.map(row => {
          const timeParts = String(row['시간'] || '09:00').split(':');
          return {
            id: crypto.randomUUID(),
            date: String(row['날짜'] || inDate),
            hour: parseInt(timeParts[0]) || 9,
            minute: parseInt(timeParts[1]) || 0,
            type: row['구분'] === '지출' ? '지출' : '수입',
            item: String(row['내역'] || '수입/지출 내역'),
            incomeAmount: Number(row['수입금액']) || 0,
            expenseAmount: Number(row['지출금액']) || 0,
            balance: 0
          };
        });
        if (window.confirm("데이터를 합치시겠습니까? (취소 시 덮어쓰기)")) {
          setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, entries: [...s.entries, ...importedEntries] } : s));
        } else {
          setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, entries: importedEntries } : s));
        }
      } catch (err) { alert("엑셀 형식 오류"); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-gray-200 overflow-hidden font-sans select-none">
      
      {/* 1. 상단 장부 탭 영역 (모바일 간격 최적화) */}
      <div className="flex items-center bg-[#000] border-b border-[#1a1a2e] px-2 h-14 relative shrink-0">
        <div className="flex items-center gap-1 z-10">
          <button onClick={addSheet} className="p-2 bg-blue-600 rounded shadow-lg active:scale-95 transition-all"><Plus className="w-5 h-5" /></button>
          <button onClick={deleteSheet} className="p-2 bg-red-900/40 text-red-500 rounded active:scale-95"><Trash2 className="w-5 h-5" /></button>
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {isRenaming === activeSheetId ? (
            <div className="pointer-events-auto flex items-center gap-1 bg-[#2c2c2e] border border-blue-500 rounded px-2">
              <input autoFocus className="bg-transparent text-lg font-black text-white outline-none py-1 text-center" value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && commitRename()}/>
              <button onClick={commitRename} className="text-emerald-400"><Check className="w-5 h-5"/></button>
            </div>
          ) : (
            <h2 onClick={() => { setIsRenaming(activeSheetId); setRenameValue(activeSheet?.name || ''); }} className="pointer-events-auto text-xl md:text-2xl font-black text-white tracking-tighter cursor-pointer hover:text-blue-400 transition-colors">
              {activeSheet?.name || '장부 선택'}
            </h2>
          )}
        </div>

        <div className="ml-auto flex gap-1 overflow-x-auto max-w-[35%] no-scrollbar pl-2">
          {sheets.map(s => (
            <button key={s.id} onClick={() => setActiveSheetId(s.id)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${activeSheetId === s.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* 2. 기능 버튼 그룹 & 대시보드 */}
      <div className="flex flex-col bg-[#111] border-b border-[#222]">
        <div className="flex items-center justify-between p-2">
          <div className="flex bg-[#1c1c1e] p-1 rounded-lg gap-1 border border-[#333]">
            {(['추가', '수정', '복사', '삭제'] as WorkMode[]).map(m => (
              <button key={m} onClick={() => setWorkMode(m)} className={`px-4 py-1.5 rounded text-[12px] font-black transition-all ${workMode === m ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800'}`}>
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="p-2 bg-orange-600 rounded text-white active:scale-95"><Printer className="w-5 h-5"/></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-[#2c2c2e] text-blue-400 rounded active:scale-95"><FileUp className="w-5 h-5"/></button>
            <input type="file" ref={fileInputRef} onChange={importFromExcel} className="hidden" accept=".xlsx,.xls" />
          </div>
        </div>

        {/* 요약 현황판 (모바일 텍스트 압축) */}
        <div className="flex items-center justify-around py-2 bg-black/50 border-t border-[#222]">
          <div className="text-center"><p className="text-[9px] text-blue-400 font-bold">총수입</p><p className="text-[14px] md:text-xl font-black text-emerald-400">+{summary.totalInc.toLocaleString()}</p></div>
          <div className="w-[1px] h-6 bg-gray-800" />
          <div className="text-center"><p className="text-[9px] text-blue-400 font-bold">총지출</p><p className="text-[14px] md:text-xl font-black text-rose-500">-{summary.totalExp.toLocaleString()}</p></div>
          <div className="w-[1px] h-6 bg-gray-800" />
          <div className="text-center"><p className="text-[9px] text-cyan-400 font-bold">현재누계</p><p className="text-[14px] md:text-xl font-black text-cyan-400">={summary.balance.toLocaleString()}</p></div>
        </div>
      </div>

      {/* 3. 데이터 영역 (PC는 테이블, 모바일은 압축 리스트) */}
      <div className="flex-grow overflow-auto no-scrollbar bg-black">
        {/* PC 화면용 테이블 (768px 이상) */}
        <table className="hidden md:table w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-[#1c1c1e] text-orange-400 text-sm">
            <tr>
              <th className="p-2 border border-gray-800">날짜</th>
              <th className="p-2 border border-gray-800">시간</th>
              <th className="p-2 border border-gray-800">구분</th>
              <th className="p-2 border border-gray-800">내역</th>
              <th className="p-2 border border-gray-800 text-right">수입</th>
              <th className="p-2 border border-gray-800 text-right">지출</th>
              <th className="p-2 border border-gray-800 text-right">누계</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map(e => (
              <tr key={e.id} onClick={() => handleRowClick(e)} className={`hover:bg-[#1a1a2e] border-b border-gray-900 cursor-pointer ${workMode === '삭제' ? 'hover:bg-red-900/20' : ''}`}>
                <td className="p-2 text-center text-blue-300 font-mono">{e.date}</td>
                <td className="p-2 text-center text-cyan-500 font-mono">{String(e.hour).padStart(2,'0')}:{String(e.minute).padStart(2,'0')}</td>
                <td className={`p-2 text-center font-black ${e.type === '수입' ? 'text-emerald-500' : 'text-rose-500'}`}>{e.type}</td>
                <td className="p-2 font-bold text-yellow-500">{e.item}</td>
                <td className="p-2 text-right text-emerald-400">{e.incomeAmount > 0 ? e.incomeAmount.toLocaleString() : '-'}</td>
                <td className="p-2 text-right text-rose-400">{e.expenseAmount > 0 ? e.expenseAmount.toLocaleString() : '-'}</td>
                <td className="p-2 text-right text-cyan-400 font-black">={e.balance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 모바일 화면용 리스트 (카드 타입) */}
        <div className="md:hidden flex flex-col">
          {sortedEntries.map(e => (
            <div key={e.id} onClick={() => handleRowClick(e)} className="p-3 border-b border-[#111] active:bg-[#1a1a2e] flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1 shrink-0">
                <span className="text-[10px] text-gray-500">{e.date.slice(5)} {String(e.hour).padStart(2,'0')}:{String(e.minute).padStart(2,'0')}</span>
                <span className={`text-[11px] font-black ${e.type === '수입' ? 'text-emerald-500' : 'text-rose-500'}`}>{e.type}</span>
              </div>
              <div className="flex-grow overflow-hidden px-1">
                <p className="text-[14px] font-bold text-yellow-500 truncate">{e.item}</p>
                <p className={`text-[12px] font-mono ${e.type === '수입' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {(e.incomeAmount || e.expenseAmount).toLocaleString()}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-cyan-600 font-bold uppercase">Balance</p>
                <p className="text-[15px] font-black text-cyan-400">={e.balance.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. 하단 고정 입력창 (모바일 대응 적층 레이아웃) */}
      <div className="bg-[#1a1a2e] border-t-2 border-blue-600 p-2 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="grid grid-cols-4 md:flex items-center gap-2">
          <input type="date" value={inDate} onChange={e => setInDate(e.target.value)} className="col-span-2 md:w-36 bg-black border border-gray-700 p-2 rounded text-xs text-white"/>
          <div className="col-span-1 flex items-center bg-black border border-gray-700 rounded px-1">
            <input type="number" value={inHour} onChange={e => setInHour(Number(e.target.value))} className="w-full text-center bg-transparent text-cyan-400 font-bold" min="0" max="23"/>
            <span className="text-gray-500">:</span>
            <input type="number" value={inMin} onChange={e => setInMin(Number(e.target.value))} className="w-full text-center bg-transparent text-cyan-400 font-bold" min="0" max="59"/>
          </div>
          <select value={inType} onChange={e => setInType(e.target.value as '수입' | '지출')} className="col-span-1 bg-black border border-gray-700 p-2 rounded text-yellow-500 font-bold text-xs">
            <option value="수입">수입</option><option value="지출">지출</option>
          </select>
          <input type="text" value={inItem} onChange={e => setInItem(e.target.value)} placeholder="내역" className="col-span-3 md:flex-grow bg-black border border-gray-700 p-2 rounded text-white font-bold text-xs"/>
          <div className="col-span-4 md:w-auto flex gap-2">
            <input type="number" value={inAmount} onChange={e => setInAmount(e.target.value)} placeholder="금액" className={`flex-grow md:w-40 bg-black border border-gray-700 p-2 rounded text-right font-black ${inType === '수입' ? 'text-emerald-400' : 'text-rose-400'}`}/>
            <button onClick={handleSaveEntry} className="px-6 py-2 bg-blue-600 text-white font-black rounded shadow-lg active:scale-95 flex items-center gap-2 transition-all">
              <Save className="w-5 h-5"/> <span className="hidden md:inline">저장</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingView;