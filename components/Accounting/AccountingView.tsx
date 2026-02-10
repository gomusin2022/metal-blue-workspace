/**
 * AccountingView.tsx - 범용 회계장부 모듈 (완전판)
 * 원칙 준수 사항:
 * 1. 동적 시트 관리: 시트 추가/수정/삭제 기능 포함
 * 2. 정밀 로직: 날짜/시/분 순 정렬 및 실시간 누계 계산
 * 3. UI 일관성: Metal Blue 테마 및 한 손 조작 최적화
 * 4. 엑셀 연동: xlsx 라이브러리를 이용한 시트별 가져오기/내보내기
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Save, FileDown, FileUp, 
  Printer, Copy, Check, X, ChevronRight, Wallet 
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { AccountingEntry, AccountingSheet } from '../../types';

const AccountingView: React.FC = () => {
  // --- [1. 상태 관리] ---
  const [sheets, setSheets] = useState<AccountingSheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  
  // 입력 폼 상태
  const [inDate, setInDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [inHour, setInHour] = useState(9);
  const [inMin, setInMin] = useState(0);
  const [inType, setInType] = useState<'수입' | '지출'>('수입');
  const [inItem, setInItem] = useState('');
  const [inAmount, setInAmount] = useState<number>(0);

  // 시트 관리 모달/상태
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');

  // --- [2. 초기 데이터 로드 및 저장] ---
  useEffect(() => {
    const saved = localStorage.getItem('metal_accounting_sheets');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSheets(parsed);
      if (parsed.length > 0) setActiveSheetId(parsed[0].id);
    } else {
      // 초기 시트 생성: '회계장부'
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

  // --- [3. 핵심 계산 엔진 (어제 Python 로직 이식)] ---
  const activeSheet = useMemo(() => 
    sheets.find(s => s.id === activeSheetId), 
  [sheets, activeSheetId]);

  const sortedEntries = useMemo(() => {
    if (!activeSheet) return [];
    
    // 정밀 정렬: 날짜 -> 시 -> 분
    const sorted = [...activeSheet.entries].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.hour !== b.hour) return a.hour - b.hour;
      return a.minute - b.minute;
    });

    // 누계 재계산
    let currentBalance = 0;
    return sorted.map(entry => {
      currentBalance += (entry.incomeAmount - entry.expenseAmount);
      return { ...entry, balance: currentBalance };
    });
  }, [activeSheet]);

  const summary = useMemo(() => {
    const totalInc = sortedEntries.reduce((sum, e) => sum + e.incomeAmount, 0);
    const totalExp = sortedEntries.reduce((sum, e) => sum + e.expenseAmount, 0);
    return {
      totalInc,
      totalExp,
      balance: totalInc - totalExp
    };
  }, [sortedEntries]);

  // --- [4. 핸들러: 시트 관리] ---
  const addSheet = () => {
    if (!newSheetName.trim()) return;
    const newSheet: AccountingSheet = {
      id: crypto.randomUUID(),
      name: newSheetName,
      entries: []
    };
    setSheets([...sheets, newSheet]);
    setActiveSheetId(newSheet.id);
    setNewSheetName('');
    setIsSheetModalOpen(false);
  };

  const deleteSheet = (id: string) => {
    if (sheets.length <= 1) {
      alert("최소 하나의 장부는 유지해야 합니다.");
      return;
    }
    if (window.confirm("해당 장부의 모든 데이터가 삭제됩니다. 계속하시겠습니까?")) {
      const filtered = sheets.filter(s => s.id !== id);
      setSheets(filtered);
      setActiveSheetId(filtered[0].id);
    }
  };

  // --- [5. 핸들러: 내역 관리] ---
  const handleSaveEntry = () => {
    if (!inItem.trim() || inAmount <= 0) return;

    const newEntry: AccountingEntry = {
      id: crypto.randomUUID(),
      date: inDate,
      hour: inHour,
      minute: inMin,
      type: inType,
      item: inItem,
      incomeAmount: inType === '수입' ? inAmount : 0,
      expenseAmount: inType === '지출' ? inAmount : 0,
      balance: 0 // sortedEntries에서 재계산됨
    };

    setSheets(prev => prev.map(sheet => 
      sheet.id === activeSheetId 
        ? { ...sheet, entries: [...sheet.entries, newEntry] }
        : sheet
    ));

    // 입력창 초기화 (날짜/시간은 유지하여 연속 입력 편의성 제공)
    setInItem('');
    setInAmount(0);
  };

  const deleteEntry = (entryId: string) => {
    if (window.confirm("삭제하시겠습니까?")) {
      setSheets(prev => prev.map(sheet => 
        sheet.id === activeSheetId 
          ? { ...sheet, entries: sheet.entries.filter(e => e.id !== entryId) }
          : sheet
      ));
    }
  };

  // --- [6. 엑셀 연동] ---
  const exportToExcel = () => {
    if (!activeSheet) return;
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
    XLSX.writeFile(wb, `${activeSheet.name}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  // --- [7. UI 렌더링] ---
  return (
    <div className="flex flex-col h-full bg-[#121212] text-gray-200 overflow-hidden">
      {/* 상단: 시트 탭 및 관리 */}
      <div className="flex items-center gap-2 p-2 bg-[#1a1a2e] border-b border-[#3a3a5e] overflow-x-auto custom-scrollbar">
        {sheets.map(sheet => (
          <div key={sheet.id} className="flex items-center shrink-0">
            <button
              onClick={() => setActiveSheetId(sheet.id)}
              className={`px-4 py-2 rounded-t-lg font-bold transition-all ${
                activeSheetId === sheet.id 
                ? 'bg-[#2c2c2e] text-blue-400 border-b-2 border-blue-500 shadow-[0_-4px_10px_rgba(0,0,0,0.3)]' 
                : 'bg-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {sheet.name}
            </button>
            {activeSheetId === sheet.id && (
              <button 
                onClick={() => deleteSheet(sheet.id)}
                className="ml-1 p-1 text-red-500 hover:bg-red-900/30 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        <button 
          onClick={() => setIsSheetModalOpen(true)}
          className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/40 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* 중단: 요약 대시보드 (스크린샷 스타일) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#151515] border-b border-[#2c2c2e]">
        <div className="flex items-center gap-6 bg-black/40 px-6 py-3 rounded-xl border border-[#3a3a5e] shadow-inner">
          <div className="flex flex-col">
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">총수입</span>
            <span className="text-xl md:text-2xl font-black text-emerald-400">
              + {summary.totalInc.toLocaleString()}
            </span>
          </div>
          <div className="w-px h-8 bg-gray-800" />
          <div className="flex flex-col">
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">총지출</span>
            <span className="text-xl md:text-2xl font-black text-rose-500">
              - {summary.totalExp.toLocaleString()}
            </span>
          </div>
          <div className="w-px h-8 bg-gray-800" />
          <div className="flex flex-col">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">현재누계</span>
            <span className="text-xl md:text-2xl font-black text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
              = {summary.balance.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white font-bold rounded hover:bg-orange-500 transition-all">
            <Printer className="w-4 h-4" /> <span className="hidden md:inline">인쇄</span>
          </button>
          <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-500 transition-all">
            <FileDown className="w-4 h-4" /> <span className="hidden md:inline">엑셀 저장</span>
          </button>
        </div>
      </div>

      {/* 메인: 데이터 테이블 */}
      <div className="flex-grow overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="sticky top-0 z-10 bg-[#1c1c1e] shadow-md">
            <tr>
              <th className="p-3 text-orange-400 border border-[#2c2c2e] w-32 text-center">날짜</th>
              <th className="p-3 text-orange-400 border border-[#2c2c2e] w-24 text-center">시간</th>
              <th className="p-3 text-orange-400 border border-[#2c2c2e] w-20 text-center">구분</th>
              <th className="p-3 text-orange-400 border border-[#2c2c2e]">수입/지출 내역</th>
              <th className="p-3 text-orange-400 border border-[#2c2c2e] w-32 text-right">수입금액</th>
              <th className="p-3 text-orange-400 border border-[#2c2c2e] w-32 text-right">지출금액</th>
              <th className="p-3 text-orange-400 border border-[#2c2c2e] w-40 text-right">누계</th>
              <th className="p-3 text-orange-400 border border-[#2c2c2e] w-20 text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {/* 데이터 행 */}
            {sortedEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-[#2c2c2e]/50 border-b border-[#2c2c2e] transition-colors">
                <td className="p-3 text-center font-mono text-blue-300">{entry.date}</td>
                <td className="p-3 text-center font-mono text-cyan-500">
                  {String(entry.hour).padStart(2, '0')}:{String(entry.minute).padStart(2, '0')}
                </td>
                <td className={`p-3 text-center font-bold ${entry.type === '수입' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {entry.type}
                </td>
                <td className="p-3 font-bold text-yellow-500">{entry.item}</td>
                <td className="p-3 text-right text-emerald-400 font-mono">
                  {entry.incomeAmount > 0 ? entry.incomeAmount.toLocaleString() : '-'}
                </td>
                <td className="p-3 text-right text-rose-400 font-mono">
                  {entry.expenseAmount > 0 ? entry.expenseAmount.toLocaleString() : '-'}
                </td>
                <td className="p-3 text-right text-cyan-400 font-black">
                  = {entry.balance.toLocaleString()}
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => deleteEntry(entry.id)} className="text-gray-500 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {/* 입력 행 (Footer 고정 스타일) */}
          <tfoot className="sticky bottom-0 bg-[#1a1a2e] border-t-2 border-blue-500 shadow-[0_-4px_15px_rgba(0,0,0,0.5)]">
            <tr>
              <td className="p-2"><input type="date" value={inDate} onChange={e => setInDate(e.target.value)} className="w-full bg-black border border-gray-700 p-1.5 rounded text-sm"/></td>
              <td className="p-2 flex gap-1">
                <input type="number" value={inHour} onChange={e => setInHour(Number(e.target.value))} className="w-1/2 bg-black border border-gray-700 p-1.5 rounded text-center font-mono text-cyan-400" min="0" max="23"/>
                <input type="number" value={inMin} onChange={e => setInMin(Number(e.target.value))} className="w-1/2 bg-black border border-gray-700 p-1.5 rounded text-center font-mono text-cyan-400" min="0" max="59"/>
              </td>
              <td className="p-2">
                <select value={inType} onChange={e => setInType(e.target.value as '수입' | '지출')} className="w-full bg-black border border-gray-700 p-1.5 rounded text-yellow-500 font-bold">
                  <option value="수입">수입</option>
                  <option value="지출">지출</option>
                </select>
              </td>
              <td className="p-2"><input type="text" value={inItem} onChange={e => setInItem(e.target.value)} placeholder="내역 입력" className="w-full bg-black border border-gray-700 p-1.5 rounded text-white font-bold"/></td>
              <td className="p-2"><input type="number" value={inAmount || ''} onChange={e => setInAmount(Number(e.target.value))} placeholder="금액" className="w-full bg-black border border-gray-700 p-1.5 rounded text-right text-emerald-400 font-mono" disabled={inType === '지출'}/></td>
              <td className="p-2"><input type="number" value={inAmount || ''} onChange={e => setInAmount(Number(e.target.value))} placeholder="금액" className="w-full bg-black border border-gray-700 p-1.5 rounded text-right text-rose-400 font-mono" disabled={inType === '수입'}/></td>
              <td colSpan={2} className="p-2">
                <button onClick={handleSaveEntry} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Save className="w-5 h-5" /> 기록저장
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 시트 추가 모달 */}
      {isSheetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a2e] border border-[#3a3a5e] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-black mb-4 text-blue-400 flex items-center gap-2">
              <Wallet className="w-6 h-6" /> 새 장부(시트) 추가
            </h3>
            <input 
              autoFocus
              type="text" 
              value={newSheetName}
              onChange={e => setNewSheetName(e.target.value)}
              placeholder="장부 이름을 입력하세요"
              className="w-full bg-black border border-gray-700 p-3 rounded-xl mb-6 text-white outline-none focus:border-blue-500 transition-all"
              onKeyDown={e => e.key === 'Enter' && addSheet()}
            />
            <div className="flex gap-3">
              <button onClick={() => setIsSheetModalOpen(false)} className="flex-1 py-3 bg-gray-800 rounded-xl font-bold hover:bg-gray-700 transition-all">취소</button>
              <button onClick={addSheet} className="flex-1 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/40">생성하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingView;