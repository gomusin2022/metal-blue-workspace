/**
 * AccountingView.tsx - 시인성 강화 및 엑셀 저장 복구판
 * 1. 날짜, 시간, 금액, 누계 폰트 굵기 및 색상 강화 (가독성 수정)
 * 2. 기호(+/-/=) 뒤 여백 추가 및 테이블 내 '=' 제거
 * 3. 엑셀 최종 저장 버튼 기능 복구
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Save, FileDown, FileUp, 
  Printer, X, Wallet, Check, Copy
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { AccountingEntry, AccountingSheet } from '../../types';

type WorkMode = '추가' | '수정' | '복사' | '삭제';

const AccountingView: React.FC = () => {
  const [sheets, setSheets] = useState<AccountingSheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const [workMode, setWorkMode] = useState<WorkMode>('추가');
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  const [inDate, setInDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [inHour, setInHour] = useState(new Date().getHours());
  const [inMin, setInMin] = useState(new Date().getMinutes());
  const [inType, setInType] = useState<'수입' | '지출'>('수입');
  const [inItem, setInItem] = useState('');
  const [inAmount, setInAmount] = useState<number | string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('metal_accounting_sheets');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSheets(parsed);
      if (parsed.length > 0) setActiveSheetId(parsed[0].id);
    } else {
      const defaultSheet: AccountingSheet = { id: crypto.randomUUID(), name: '회계장부', entries: [] };
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

  // --- [핸들러 로직] ---
  const handleSaveEntry = () => {
    if (!inItem.trim() || !inAmount) return;
    const amt = Number(inAmount);
    const newEntry: AccountingEntry = {
      id: crypto.randomUUID(), date: inDate, hour: inHour, minute: inMin,
      type: inType, item: inItem, incomeAmount: inType === '수입' ? amt : 0,
      expenseAmount: inType === '지출' ? amt : 0, balance: 0
    };
    setSheets(sheets.map(s => s.id === activeSheetId ? { ...s, entries: [...s.entries, newEntry] } : s));
    setInItem(''); setInAmount('');
  };

  const exportToExcel = () => {
    if (!activeSheet || sortedEntries.length === 0) return;
    const wb = XLSX.utils.book_new();
    const data = sortedEntries.map(e => ({
      '날짜': e.date,
      '시간': `${String(e.hour).padStart(2, '0')}:${String(e.minute).padStart(2, '0')}`,
      '구분': e.type,
      '내역': e.item,
      '수입금액': e.incomeAmount,
      '지출금액': e.expenseAmount,
      '누계': e.balance
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, activeSheet.name);
    XLSX.writeFile(wb, `${activeSheet.name}_회계장부_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-gray-200 overflow-hidden font-sans select-none">
      
      {/* 1. 상단 장부명 및 탭 */}
      <div className="flex items-center bg-[#000] border-b border-[#1a1a2e] px-2 h-14 relative shrink-0">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h2 className="text-xl md:text-3xl font-black text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            {activeSheet?.name}
          </h2>
        </div>
        <div className="ml-auto flex gap-1 overflow-x-auto no-scrollbar pl-2 z-10">
          {sheets.map(s => (
            <button key={s.id} onClick={() => setActiveSheetId(s.id)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap ${activeSheetId === s.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* 2. 작업 모드 및 대시보드 (기호 뒤 한 칸 띄움 적용) */}
      <div className="flex flex-col bg-[#111] border-b border-[#222]">
        <div className="flex items-center justify-between p-2">
          <div className="flex bg-[#1c1c1e] p-1 rounded-lg gap-1 border border-[#333]">
            {(['추가', '수정', '복사', '삭제'] as WorkMode[]).map(m => (
              <button key={m} onClick={() => setWorkMode(m)} className={`px-4 py-1.5 rounded text-[12px] font-black transition-all ${workMode === m ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>{m}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="p-2 bg-orange-600 rounded text-white active:scale-95"><Printer className="w-5 h-5"/></button>
            <button onClick={exportToExcel} className="p-2 bg-emerald-600 rounded text-white active:scale-95 flex items-center gap-1 font-bold text-xs"><FileDown className="w-4 h-4"/> 저장</button>
          </div>
        </div>

        <div className="flex items-center justify-around py-3 bg-black/50 border-t border-[#222]">
          <div className="text-center"><p className="text-[10px] text-blue-400 font-bold">총수입</p><p className="text-[16px] md:text-2xl font-black text-emerald-400">+ {summary.totalInc.toLocaleString()}</p></div>
          <div className="text-center"><p className="text-[10px] text-blue-400 font-bold">총지출</p><p className="text-[16px] md:text-2xl font-black text-rose-500">- {summary.totalExp.toLocaleString()}</p></div>
          <div className="text-center"><p className="text-[10px] text-cyan-400 font-bold">현재누계</p><p className="text-[16px] md:text-2xl font-black text-cyan-400">= {summary.balance.toLocaleString()}</p></div>
        </div>
      </div>

      {/* 3. 데이터 영역 (가독성 강화: 굵기 및 색상) */}
      <div className="flex-grow overflow-auto no-scrollbar bg-black">
        {/* PC 테이블 */}
        <table className="hidden md:table w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-[#1c1c1e] text-orange-500 text-sm font-black">
            <tr>
              <th className="p-2 border border-gray-800">날짜</th>
              <th className="p-2 border border-gray-800">시간</th>
              <th className="p-2 border border-gray-800">구분</th>
              <th className="p-2 border border-gray-800">수입/지출 내역</th>
              <th className="p-2 border border-gray-800 text-right">수입금액</th>
              <th className="p-2 border border-gray-800 text-right">지출금액</th>
              <th className="p-2 border border-gray-800 text-right">누계</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map(e => (
              <tr key={e.id} className="hover:bg-[#1a1a2e] border-b border-gray-900 transition-colors">
                <td className="p-2 text-center text-blue-100 font-bold text-[15px]">{e.date}</td>
                <td className="p-2 text-center text-cyan-400 font-black text-[16px]">{String(e.hour).padStart(2,'0')}:{String(e.minute).padStart(2,'0')}</td>
                <td className={`p-2 text-center font-black ${e.type === '수입' ? 'text-emerald-500' : 'text-rose-500'}`}>{e.type}</td>
                <td className="p-2 font-black text-yellow-400 text-[16px]">{e.item}</td>
                <td className="p-2 text-right text-emerald-300 font-black text-[17px]">{e.incomeAmount > 0 ? e.incomeAmount.toLocaleString() : '-'}</td>
                <td className="p-2 text-right text-rose-300 font-black text-[17px]">{e.expenseAmount > 0 ? e.expenseAmount.toLocaleString() : '-'}</td>
                <td className="p-2 text-right text-cyan-300 font-black text-[18px]">{e.balance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 모바일 리스트 (시인성 수정) */}
        <div className="md:hidden flex flex-col">
          {sortedEntries.map(e => (
            <div key={e.id} className="p-3 border-b border-[#111] flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] text-blue-100 font-bold">{e.date.slice(5)} <span className="text-cyan-400 ml-1">{String(e.hour).padStart(2,'0')}:{String(e.minute).padStart(2,'0')}</span></span>
                <span className={`text-[12px] font-black ${e.type === '수입' ? 'text-emerald-500' : 'text-rose-500'}`}>{e.type}</span>
              </div>
              <div className="flex-grow px-3">
                <p className="text-[16px] font-black text-yellow-400 truncate">{e.item}</p>
                <p className={`text-[14px] font-black ${e.type === '수입' ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {(e.incomeAmount || e.expenseAmount).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-cyan-600 font-bold uppercase tracking-tighter">Balance</p>
                <p className="text-[17px] font-black text-cyan-300">{e.balance.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. 하단 입력창 (디자인 유지) */}
      <div className="bg-[#1a1a2e] border-t-2 border-blue-600 p-2 pb-safe shadow-2xl shrink-0">
        <div className="grid grid-cols-4 md:flex items-center gap-2">
          <input type="date" value={inDate} onChange={e => setInDate(e.target.value)} className="col-span-2 md:w-40 bg-black border border-gray-700 p-2 rounded text-sm text-white font-bold"/>
          <div className="col-span-1 flex items-center bg-black border border-gray-700 rounded px-1">
            <input type="number" value={inHour} onChange={e => setInHour(Number(e.target.value))} className="w-full text-center bg-transparent text-cyan-400 font-black text-lg" min="0" max="23"/>
            <span className="text-gray-500 font-bold">:</span>
            <input type="number" value={inMin} onChange={e => setInMin(Number(e.target.value))} className="w-full text-center bg-transparent text-cyan-400 font-black text-lg" min="0" max="59"/>
          </div>
          <select value={inType} onChange={e => setInType(e.target.value as '수입' | '지출')} className="col-span-1 bg-black border border-gray-700 p-2 rounded text-yellow-500 font-black text-sm">
            <option value="수입">수입</option><option value="지출">지출</option>
          </select>
          <input type="text" value={inItem} onChange={e => setInItem(e.target.value)} placeholder="내역" className="col-span-3 md:flex-grow bg-black border border-gray-700 p-2 rounded text-white font-bold text-sm"/>
          <div className="col-span-4 md:w-auto flex gap-2">
            <input type="number" value={inAmount} onChange={e => setInAmount(e.target.value)} placeholder="금액" className={`flex-grow md:w-44 bg-black border border-gray-700 p-2 rounded text-right font-black text-lg ${inType === '수입' ? 'text-emerald-400' : 'text-rose-400'}`}/>
            <button onClick={handleSaveEntry} className="px-6 py-2 bg-blue-600 text-white font-black rounded active:scale-95 transition-all flex items-center gap-2">
              <Save className="w-5 h-5"/> <span className="hidden md:inline">저장</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingView;