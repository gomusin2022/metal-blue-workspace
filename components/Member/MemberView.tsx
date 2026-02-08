import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  UserPlus, Check, Eraser, X, Save, CloudDownload, CloudUpload, MessageSquare, FileSpreadsheet, Loader2, Database
} from 'lucide-react';
import { format } from 'date-fns';
import { Member } from '../../types';
import MessageModal from './MessageModal'; 
import { exportToExcel, readExcel } from '../../services/excelService';

interface MemberViewProps {
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  onHome: () => void;
}

const MemberView: React.FC<MemberViewProps> = ({ members, setMembers, onHome }) => {
  // --- [상태 관리: 기존 100% 보존] ---
  const [memberTitle, setMemberTitle] = useState('회원관리 목록');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortCriteria, setSortCriteria] = useState<string[]>(['name']);
  const [selectedBranch, setSelectedBranch] = useState<string>('전체');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false); 
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [lastSelectedCar, setLastSelectedCar] = useState<string>('');
  const [lastClickedMemberId, setLastClickedMemberId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- [데이터 모드 및 저장 모달 상태] ---
  const [currentFileType, setCurrentFileType] = useState<'EXCEL' | 'DB' | 'NONE'>('NONE'); 
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTargetType, setSaveTargetType] = useState<'EXCEL' | 'DB'>('EXCEL');
  const [saveFileName, setSaveFileName] = useState('');

  const phoneMidRef = useRef<HTMLInputElement>(null);
  const phoneEndRef = useRef<HTMLInputElement>(null);
  const branches = ['전체', '본점', '제일', '신촌', '교대', '작전', '효성', '부평', '갈산'];

  // --- [데이터 업로드 로직: 경고 시스템 포함] ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isNextDb = file.name.endsWith('.db');

    // 1. 데이터 덮어쓰기 경고
    if (members.length > 0) {
      if (!confirm("현재 작업 중인 데이터가 초기화됩니다. 계속하시겠습니까?")) {
        e.target.value = '';
        return;
      }
    }

    // 2. 모드 전환 경고 (엑셀 작업 중 DB 로드 시)
    if (currentFileType === 'EXCEL' && isNextDb) {
      if (!confirm("주의: 보안 DB(.db) 파일을 불러오면 엑셀 저장 기능을 사용할 수 없게 됩니다. 계속하시겠습니까?")) {
        e.target.value = '';
        return;
      }
    }

    setIsLoading(true);
    try {
      if (isNextDb) {
        // [DB 로드]
        const reader = new FileReader();
        reader.onload = (event) => {
          const json = JSON.parse(event.target?.result as string);
          setCurrentFileType('DB');
          setMembers(json.map((d: any) => ({
            id: Math.random().toString(36).substring(2, 11),
            sn: Number(d.id || 0), branch: d.branch || '본점', name: d.name || '',
            position: d.position || '회원', phone: d.phone || '', address: d.addr || '',
            joined: d.join_year || '', fee: d.fee === "1", attendance: d.attendance === "1",
            carNumber: d.car_num || '', memo: d.note || ''
          })));
        };
        reader.readAsText(file);
      } else {
        // [엑셀 로드]
        const data = await readExcel(file);
        setCurrentFileType('EXCEL');
        setMembers(data.map((d: any) => ({
          id: Math.random().toString(36).substring(2, 11),
          sn: Number(d.sn || d.id || 0), branch: d.branch || '본점', name: d.name || '',
          position: d.position || '회원', phone: d.phone || '', address: d.address || d.addr || '',
          joined: d.joined || d.join_year || '', fee: d.fee === "1" || d.fee === true,
          attendance: d.attendance === "1" || d.attendance === true,
          carNumber: d.carNumber || d.car_num || '', memo: d.memo || d.note || ''
        })));
      }
    } catch (err) {
      alert("파일 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  // --- [데이터 다운로드 모달 로직] ---
  const openSaveModal = (type: 'EXCEL' | 'DB') => {
    // 엑셀 저장 버튼은 DB 모드일 때 비활성화됨
    setSaveTargetType(type);
    setSaveFileName(`${memberTitle}_${format(new Date(), 'yyyyMMdd')}`);
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = () => {
    if (!saveFileName.trim()) return alert("파일명들을 입력해주세요.");
    const targetMembers = selectedIds.size > 0 ? members.filter(m => selectedIds.has(m.id)) : displayMembers;

    if (saveTargetType === 'EXCEL') {
      exportToExcel(targetMembers, saveFileName);
    } else {
      const dbData = targetMembers.map(m => ({
        id: m.sn.toString(), name: m.name, position: m.position, phone: m.phone, branch: m.branch,
        join_year: m.joined, addr: m.address, fee: m.fee ? "1" : "", car_num: m.carNumber,
        attendance: m.attendance ? "1" : "", note: m.memo
      }));
      const blob = new Blob([JSON.stringify(dbData, null, 4)], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `${saveFileName}.db`; link.click();
    }
    setIsSaveModalOpen(false);
  };

  // --- [기존 로직 보존: 차량 번호, 정렬 등] ---
  const handleCarClick = (m: Member) => {
    let newValue;
    if (lastClickedMemberId === m.id) {
      const sequence = ['', '1', '2', '3', '4', '5', '6'];
      const currentIndex = sequence.indexOf(m.carNumber || '');
      newValue = sequence[(currentIndex + 1) % sequence.length];
    } else { newValue = lastSelectedCar; }
    setLastSelectedCar(newValue);
    setLastClickedMemberId(m.id);
    setMembers(prev => prev.map(x => x.id === m.id ? { ...x, carNumber: newValue } : x));
  };

  const getCarColor = (num: string) => {
    switch (num) {
      case '1': return 'text-red-500'; case '2': return 'text-orange-500'; case '3': return 'text-yellow-400';
      case '4': return 'text-cyan-400'; case '5': return 'text-blue-500'; case '6': return 'text-purple-500';
      default: return 'text-gray-600';
    }
  };

  const displayMembers = useMemo(() => {
    let filtered = selectedBranch === '전체' ? members : members.filter(m => m.branch === selectedBranch);
    return [...filtered].sort((a, b) => {
      for (const key of sortCriteria) {
        const valA = String(a[key as keyof Member] || '');
        const valB = String(b[key as keyof Member] || '');
        const res = valA.localeCompare(valB, 'ko');
        if (res !== 0) return res;
      }
      return 0;
    });
  }, [members, selectedBranch, sortCriteria]);

  const handleModalSave = () => {
    if (!editingMember) return;
    setMembers(prev => {
      const exists = prev.find(m => m.id === editingMember.id);
      return exists ? prev.map(m => m.id === editingMember.id ? editingMember : m) : [editingMember, ...prev];
    });
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] p-1 text-gray-200 overflow-hidden font-sans">
      {isLoading && <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}
      
      <div className="flex flex-col w-full mb-1">
        <div className="flex items-center justify-between w-full h-10 px-0.5">
          <div className="flex items-center gap-2 overflow-hidden">
            <h2 className="text-[1.3rem] font-black text-white truncate cursor-pointer" onClick={() => setIsEditingTitle(true)}>
              {isEditingTitle ? (
                <input autoFocus className="bg-transparent border-b border-blue-500 outline-none" value={memberTitle} onChange={(e) => setMemberTitle(e.target.value)} onBlur={() => setIsEditingTitle(false)} onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)} />
              ) : memberTitle}
            </h2>
            {currentFileType === 'DB' && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-black rounded-full border border-red-500/30 whitespace-nowrap">SECURITY DB</span>}
          </div>

          <div className="flex bg-[#1a1a2e] p-0.5 rounded border border-[#3a3a5e] gap-1 shadow-lg shrink-0">
            {/* 엑셀 저장 버튼: 데이터가 있거나(초기 상태 포함) 엑셀 모드일 때 활성화 */}
            <button 
              onClick={() => openSaveModal('EXCEL')} 
              disabled={currentFileType === 'DB'}
              title={currentFileType === 'DB' ? "보안 모드에선 엑셀 저장이 불가능합니다" : "엑셀 저장"} 
              className={`p-1 rounded transition-all ${currentFileType === 'DB' ? 'opacity-20 cursor-not-allowed' : 'text-emerald-400 hover:bg-white/5'}`}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </button>

            {/* DB 저장 버튼: 항상 활성화 (비어있을 땐 모달 내 알림) */}
            <button 
              onClick={() => openSaveModal('DB')} 
              title="보안 DB 저장" 
              className="p-1 text-indigo-400 hover:bg-white/5 rounded"
            >
              <Database className="w-5 h-5" />
            </button>
            
            {/* [엑셀 업로드 통합 버튼] */}
            <label className="p-1 text-indigo-500 cursor-pointer hover:bg-indigo-500/10 rounded" title="파일 불러오기 (Excel/DB)">
              <CloudUpload className="w-5 h-5" />
              <input type="file" className="hidden" accept=".xlsx,.xls,.db" onChange={handleFileUpload} />
            </label>

            <div className="w-px h-3 bg-[#3a3a5e] my-auto mx-0.5" />
            <button onClick={() => setIsMessageModalOpen(true)} className="p-1 text-orange-400 hover:bg-orange-500/10 rounded"><MessageSquare className="w-5 h-5" /></button>
            <button onClick={() => { if(selectedIds.size === 0) return alert("선택된 대상이 없습니다."); if(confirm("삭제하시겠습니까?")) { setMembers(members.filter(m => !selectedIds.has(m.id))); setSelectedIds(new Set()); } }} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><Eraser className="w-5 h-5" /></button>
            <button onClick={() => { setEditingMember({ id: Math.random().toString(36).substring(2, 11), sn: 0, branch: '본점', name: '', position: '회원', phone: '010--', address: '', joined: '', fee: false, attendance: false, carNumber: lastSelectedCar, memo: '' }); setIsModalOpen(true); }} className="p-1 text-blue-500 hover:bg-blue-500/10 rounded"><UserPlus className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex items-center justify-between w-full border-t border-[#3a3a5e]/20 pt-1">
          <div className="flex gap-0.5 overflow-x-auto no-scrollbar pr-2">
            {[{label:'지점', key:'branch'}, {label:'이름', key:'name'}, {label:'차량', key:'carNumber'}, {label:'회비', key:'fee'}, {label:'출결', key:'attendance'}].map(btn => (
              <button key={btn.key} onClick={() => setSortCriteria(prev => prev.includes(btn.key) ? prev.filter(x => x !== btn.key) : [btn.key, ...prev])} className={`px-2 py-0.5 min-w-[36px] rounded border text-[12px] font-black ${sortCriteria.includes(btn.key) ? 'bg-blue-600 border-blue-400 text-white' : 'bg-[#1a1a2e] border-[#3a3a5e] text-gray-400'}`}>
                {btn.label}
              </button>
            ))}
          </div>
          
          {/* [UI 추가: 선택/전체 회원수 표시] */}
          <div className="flex items-center gap-2 shrink-0 ml-auto font-black text-[11px] text-gray-400">
            <span className="text-blue-400">{selectedIds.size}</span>
            <span className="text-gray-600">/</span>
            <span className="text-gray-300">{displayMembers.length}</span>
            <select className="bg-[#1a1a2e] border border-blue-500/50 rounded px-1 py-0.5 text-blue-400 outline-none font-black ml-1" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              {branches.map(b => <option key={b} value={b} className="bg-[#121212]">{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-auto bg-[#1a1a2e] rounded border border-[#3a3a5e]">
        <table className="w-full text-left table-fixed text-[12px] font-bold">
          <thead className="sticky top-0 z-10 bg-[#2c2c2e] text-blue-400 font-black border-b border-[#3a3a5e]">
            <tr>
              <th className="p-0.5 w-6 text-center"><input type="checkbox" checked={displayMembers.length > 0 && selectedIds.size === displayMembers.length} onChange={(e) => setSelectedIds(e.target.checked ? new Set(displayMembers.map(m => m.id)) : new Set())} /></th>
              <th className="p-0.5 w-4 text-left text-gray-500 text-[10px]">N</th>
              <th className="p-0.5 w-4 text-left">지</th>
              <th className="p-0.5 w-[54px] text-left">이름</th>
              <th className="p-0.5 w-[94px] text-left">연락처</th>
              <th className="p-0.5 w-12 text-left text-gray-400 truncate">주소</th>
              <th className="p-0.5 w-5 text-right text-emerald-400">차</th>
              <th className="p-0.5 w-5 text-right">비</th>
              <th className="p-0.5 w-5 text-right">출</th>
            </tr>
          </thead>
          <tbody>
            {displayMembers.map((m, idx) => (
              <tr key={m.id} className={`border-b border-[#2c2c2e] hover:bg-white/5 cursor-pointer ${selectedIds.has(m.id) ? 'bg-blue-900/10' : ''}`} onClick={() => { setEditingMember({...m}); setIsModalOpen(true); }}>
                <td className="p-0.5 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => { const n = new Set(selectedIds); n.has(m.id) ? n.delete(m.id) : n.add(m.id); setSelectedIds(n); }} /></td>
                <td className="p-0.5 text-left text-gray-600 text-[10px] font-normal">{idx + 1}</td>
                <td className="p-0.5 text-left text-blue-400">{m.branch.charAt(0)}</td>
                <td className="p-0.5 text-left truncate text-white">{m.name}</td>
                <td className="p-0.5 text-left text-blue-300 font-mono tracking-tighter">{m.phone}</td>
                <td className="p-0.5 text-left text-gray-400 truncate">{m.address}</td>
                <td className={`p-0.5 text-right font-black ${getCarColor(m.carNumber)}`} onClick={(e) => { e.stopPropagation(); handleCarClick(m); }}>{m.carNumber || '-'}</td>
                <td className="p-0 text-right"><Check className={`w-4 h-4 ml-auto ${m.fee ? 'text-yellow-400' : 'text-gray-800'}`} /></td>
                <td className="p-0 text-right"><Check className={`w-4 h-4 ml-auto ${m.attendance ? 'text-green-500' : 'text-gray-800'}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MessageModal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} targets={selectedIds.size > 0 ? members.filter(m => selectedIds.has(m.id)) : displayMembers} />

      {/* [통합 저장 모달] */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#1a1a2e] rounded-3xl p-6 border border-indigo-500/40 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <Save className="w-5 h-5 text-indigo-400" />
              {saveTargetType === 'EXCEL' ? '엑셀로 저장' : '보안 DB 파일 저장'}
            </h3>
            <p className="text-gray-400 text-[11px] mb-4 font-bold uppercase tracking-widest">
              Format: {saveTargetType === 'EXCEL' ? '.xlsx' : '.db'}
            </p>
            <div className="space-y-5">
              <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-black outline-none focus:border-indigo-500/50 transition-all text-lg" value={saveFileName} onChange={(e) => setSaveFileName(e.target.value)} placeholder="파일명 입력" autoFocus />
              <div className="flex gap-3">
                <button onClick={() => setIsSaveModalOpen(false)} className="flex-1 py-4 bg-white/5 text-gray-300 rounded-2xl font-black border border-white/5 active:scale-95">취소</button>
                <button onClick={handleConfirmSave} className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-indigo-900/20">저장 완료</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 회원 상세 수정 모달 (보존) */}
      {isModalOpen && editingMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg bg-[#1a1a2e] rounded-2xl p-6 border border-white/10 relative">
            <div className="flex items-center justify-between mb-6 text-white font-black text-lg">
              <h3>정보 수정</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-blue-400 font-black ml-1 uppercase">지점</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-bold outline-none" value={editingMember.branch} onChange={(e) => setEditingMember({...editingMember, branch: e.target.value})}>
                    {branches.filter(b => b !== '전체').map(b => <option key={b} value={b} className="bg-[#1a1a2e]">{b}</option>)}
                  </select>
                </div>
                <div className="flex-[2] space-y-1">
                  <label className="text-[10px] text-blue-400 font-black ml-1 uppercase">성함</label>
                  <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-bold outline-none" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-blue-400 font-black ml-1 uppercase">연락처 (010)</label>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                  <input ref={phoneMidRef} type="tel" className="flex-1 bg-transparent text-white text-center font-bold outline-none" value={(editingMember.phone || '').split('-')[1] || ''} onChange={(e) => { const v = e.target.value.replace(/\D/g,'').slice(0,4); const p = (editingMember.phone || '010--').split('-'); setEditingMember({...editingMember, phone: `010-${v}-${p[2]||''}`}); if(v.length===4) phoneEndRef.current?.focus(); }} maxLength={4} />
                  <input ref={phoneEndRef} type="tel" className="flex-1 bg-transparent text-white text-center font-bold outline-none" value={(editingMember.phone || '').split('-')[2] || ''} onChange={(e) => { const v = e.target.value.replace(/\D/g,'').slice(0,4); const p = (editingMember.phone || '010--').split('-'); setEditingMember({...editingMember, phone: `010-${p[1]||''}-${v}`}); }} maxLength={4} />
                </div>
              </div>
              <button onClick={handleModalSave} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black mt-4 shadow-lg active:scale-95 transition-all">수정 내용 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberView;