/**
 * AccountingView.tsx - 범용 회계장부 모듈 (UI 복구 및 기능 개선판)
 * 1. 시간/분 입력창 너비 확장 (최소 2글자 시인성 확보)
 * 2. 엑셀 불러오기(Import) 버튼 및 로직 복구
 * 3. 장부 관리 도구 좌측 고정, 시트 이름 중앙 배치
 * 4. 장부 이름 클릭 시 즉시 수정(Inline Rename) 기능 추가
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Save, FileDown, FileUp, 
  Printer, X, Wallet, Check
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { AccountingEntry, AccountingSheet } from '../../types';

const AccountingView: React.FC = () => {
  // --- [1. 상태 관리] ---
  const [sheets, setSheets] = useState<AccountingSheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('');
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

  // --- [4. 핸들러: 시트 관리] ---
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

  const startRename = () => {
    if (!activeSheet) return;
    setIsRenaming(activeSheetId);
    setRenameValue(activeSheet.name);
  };

  const commitRename = () => {
    if (!renameValue.trim()) return setIsRenaming(null);
    setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, name: renameValue } : s));
    setIsRenaming(null);
  };

  // --- [5. 핸들러: 데이터 관리] ---
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

  // 엑셀 불러오기 복구
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

        if (window.confirm("기존 데이터를 유지하고 합치시겠습니까? (취소 시 덮어쓰기)")) {
          setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, entries: [...s.entries, ...importedEntries] } : s));
        } else {
          setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, entries: importedEntries } : s));
        }
      } catch (err) { alert("엑셀 형식 확인 필요: 날짜, 시간, 구분, 내역, 수입금액, 지출금액 컬럼이 필요합니다."); }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-gray-200 overflow-hidden font-sans">
      {/* 상단 장부 탭 영역: 좌측 고정 도구 + 중앙 타이틀 */}
      <div className="flex items-center bg-[#1a1a2e] border-b border-[#3a3a5e] px-4 py-2 relative h-14">
        {/* 좌측 관리 도구 고정 */}
        <div className="flex items-center gap-2 z-10">
          <button onClick={addSheet} className="p-2 bg-blue-600 hover:bg-blue-500 rounded text-white shadow-lg transition-all" title="장부 추가">
            <Plus className="w-5 h-5" />
          </button>
          <button onClick={deleteSheet} className="p-2 bg-red-900/50 hover:bg-red-800 rounded text-red-500 transition-all" title="현재 장부 삭제">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* 중앙 시트 이름 (클릭 시 수정) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">
            {isRenaming === activeSheetId ? (
              <div className="flex items-center gap-1 bg-[#2c2c2e] border border-blue-500 rounded px-2">
                <input 
                  autoFocus 
                  className="bg-transparent text-xl font-black text-white outline-none py-1 text-center"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && commitRename()}
                />
                <button onClick={commitRename} className="text-emerald-400"><Check className="w-5 h-5"/></button>
              </div>
            ) : (
              <div 
                onClick={startRename}
                className="flex items-center gap-2 cursor-pointer group hover:bg-[#2c2c2e] px-4 py-1 rounded-full transition-all"
              >
                <h2 className="text-2xl font-black text-white tracking-tighter drop-shadow-md">
                  {activeSheet?.name || '장부 선택'}
                </h2>
                <Edit2 className="w-4 h-4 text-gray-500 group-hover:text-blue-400" />
              </div>
            )}
          </div>
        </div>

        {/* 우측 탭 스크롤 영역 */}
        <div className="ml-auto flex gap-1 overflow-x-auto max-w-[40%] custom-scrollbar pl-4">
          {sheets.map(s => (
            <button 
              key={s.id} 
              onClick={() => setActiveSheetId(s.id)}
              className={`px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-all ${activeSheetId === s.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* 대시보드 및 컨트롤러 */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#151515] border-b border-[#2c2c2e]">
        <div className="flex items-center gap-6 bg-black/60 px-6 py-2.5 rounded-2xl border border-[#3a3a5e] shadow-2xl">
          <div className="flex flex-col"><span className="text-[10px] text-blue-400 font-bold uppercase">총수입</span><span className="text-xl md:text-2xl font-black text-emerald-400">+{summary.totalInc.toLocaleString()}</span></div>
          <div className="w-px h-8 bg-gray-800" />
          <div className="flex flex-col"><span className="text-[10px] text-blue-400 font-bold uppercase">총지출</span><span className="text-xl md:text-2xl font-black text-rose-500">-{summary.totalExp.toLocaleString()}</span></div>
          <div className="w-px h-8 bg-gray-800" />
          <div className="flex flex-col"><span className="text-[10px] text-cyan-400 font-bold uppercase">현재누계</span><span className="text-xl md:text-2xl font-black text-cyan-400">={summary.balance.toLocaleString()}</span></div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => window.print()} className="p-2.5 bg-orange-600 text-white rounded hover:bg-orange-500 transition-all flex items-center gap-2 font-bold"><Printer className="w-5 h-5"/> 인쇄</button>
          <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-gray-700 text-blue-400 rounded hover:bg-gray-600 transition-all flex items-center gap-2 font-bold"><FileUp className="w-5 h-5"/> 엑셀 불러오기</button>
          <input type="file" ref={fileInputRef} onChange={importFromExcel} className="hidden" accept=".xlsx,.xls" />
          <button onClick={() => {/* 엑셀 저장 로직 */}} className="p-2.5 bg-emerald-600 text-white rounded hover:bg-emerald-500 transition-all flex items-center gap-2 font-bold"><FileDown className="w-5 h-5"/> 최종 저장</button>
        </div>
      </div>

      {/* 테이블 영역 */}
      <div className="flex-grow overflow-auto custom-scrollbar bg-black">
        <table className="w-full border-collapse min-w-[900px]">
          <thead className="sticky top-0 z-10 bg-[#1c1c1e]">
            <tr className="text-orange-400 text-sm">
              <th className="p-3 border border-gray-800 w-36">날짜</th>
              <th className="p-3 border border-gray-800 w-28">시간</th>
              <th className="p-3 border border-gray-800 w-24">구분</th>
              <th className="p-3 border border-gray-800">수입/지출 내역</th>
              <th className="p-3 border border-gray-800 w-36 text-right">수입금액</th>
              <th className="p-3 border border-gray-800 w-36 text-right">지출금액</th>
              <th className="p-3 border border-gray-800 w-44 text-right">누계</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((e) => (
              <tr key={e.id} className="hover:bg-[#1a1a2e] transition-colors border-b border-gray-900">
                <td className="p-3 text-center text-blue-300 font-mono">{e.date}</td>
                <td className="p-3 text-center text-cyan-500 font-mono">{String(e.hour).padStart(2, '0')}:{String(e.minute).padStart(2, '0')}</td>
                <td className={`p-3 text-center font-black ${e.type === '수입' ? 'text-emerald-500' : 'text-rose-500'}`}>{e.type}</td>
                <td className="p-3 font-bold text-yellow-500 text-left pl-6">{e.item}</td>
                <td className="p-3 text-right text-emerald-400 font-mono">{e.incomeAmount > 0 ? e.incomeAmount.toLocaleString() : '-'}</td>
                <td className="p-3 text-right text-rose-400 font-mono">{e.expenseAmount > 0 ? e.expenseAmount.toLocaleString() : '-'}</td>
                <td className="p-3 text-right text-cyan-400 font-black text-lg">={e.balance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 하단 고정 입력창: 시간/분 너비 확장 */}
      <div className="bg-[#1a1a2e] border-t-2 border-blue-600 p-3 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
        <div className="flex flex-wrap items-center gap-3">
          <input type="date" value={inDate} onChange={e => setInDate(e.target.value)} className="bg-black border border-gray-700 p-2 rounded text-white w-36"/>
          
          <div className="flex items-center bg-black border border-gray-700 rounded p-1 gap-1">
            <input type="number" value={inHour} onChange={e => setInHour(Number(e.target.value))} className="w-14 text-center bg-transparent text-cyan-400 font-black text-lg outline-none" min="0" max="23"/>
            <span className="text-gray-500">:</span>
            <input type="number" value={inMin} onChange={e => setInMin(Number(e.target.value))} className="w-14 text-center bg-transparent text-cyan-400 font-black text-lg outline-none" min="0" max="59"/>
          </div>

          <select value={inType} onChange={e => setInType(e.target.value as '수입' | '지출')} className="bg-black border border-gray-700 p-2 rounded text-yellow-500 font-black w-24">
            <option value="수입">수입</option><option value="지출">지출</option>
          </select>

          <input type="text" value={inItem} onChange={e => setInItem(e.target.value)} placeholder="수입/지출 내역 입력" className="flex-grow bg-black border border-gray-700 p-2 rounded text-white font-bold min-w-[200px]"/>

          <div className="flex gap-2 w-full md:w-auto">
            <input 
              type="number" 
              value={inAmount} 
              onChange={e => setInAmount(e.target.value)} 
              placeholder={inType === '수입' ? "수입액" : "지출액"} 
              className={`w-40 bg-black border border-gray-700 p-2 rounded text-right font-black ${inType === '수입' ? 'text-emerald-400' : 'text-rose-400'}`}
            />
            <button onClick={handleSaveEntry} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded shadow-lg flex items-center gap-2 active:scale-95 transition-all">
              <Save className="w-5 h-5"/> 기록저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingView;