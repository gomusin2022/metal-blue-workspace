import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  UserPlus, Check, Eraser, X, Save, MessageSquare, FileSpreadsheet, Loader2, Database, Upload
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
  // --- [상태 관리] ---
  const [memberTitle, setMemberTitle] = useState('회원관리 목록');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortCriteria, setSortCriteria] = useState<string[]>(['name']);
  const [selectedBranch, setSelectedBranch] = useState<string>('전체');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false); 
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // UX 개선: 최종 사용된 차량 데이터를 기억하여 신규 추가 시 기본값으로 제공
  const [lastSelectedCar, setLastSelectedCar] = useState<string>('');

  // --- [데이터 모드 보호 로직] ---
  const [currentFileType, setCurrentFileType] = useState<'EXCEL' | 'DB' | 'NONE'>(() => {
    if (members.length > 0) return members[0].id.includes('db_') ? 'DB' : 'EXCEL';
    return 'NONE';
  });

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTargetType, setSaveTargetType] = useState<'EXCEL' | 'DB'>('EXCEL');
  const [saveFileName, setSaveFileName] = useState('');

  // --- [Ref 및 상수] ---
  const phoneMidRef = useRef<HTMLInputElement>(null);
  const phoneEndRef = useRef<HTMLInputElement>(null);
  const branches = ['전체', '본점', '제일', '신촌', '교대', '작전', '효성', '부평', '갈산'];

  // UX 개선: 모달 오픈 시 중간 번호 첫 번째 자리에 커서 고정 (010 - |1234)
  useEffect(() => {
    if (isModalOpen && phoneMidRef.current) {
      const input = phoneMidRef.current;
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(0, 0); 
      }, 100);
    }
  }, [isModalOpen]);

  // --- [파일 업로드 핸들러] ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'EXCEL' | 'DB') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (members.length > 0) {
      if (!confirm("현재 작업 중인 데이터가 초기화됩니다. 계속하시겠습니까?")) {
        e.target.value = '';
        return;
      }
    }

    setIsLoading(true);
    try {
      if (type === 'DB') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const json = JSON.parse(event.target?.result as string);
          setCurrentFileType('DB');
          setMembers(json.map((d: any) => ({
            id: `db_${Math.random().toString(36).substring(2, 7)}`,
            sn: Number(d.id || 0), branch: d.branch || '본점', name: d.name || '',
            position: d.position || '회원', phone: d.phone || '', address: d.addr || '',
            joined: d.joined || d.join_year || '', fee: d.fee === "1", attendance: d.attendance === "1",
            carNumber: d.car_num || '', memo: d.note || ''
          })));
        };
        reader.readAsText(file);
      } else {
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
    } catch (err) { alert("파일 로드 실패"); }
    finally { setIsLoading(false); e.target.value = ''; }
  };

  // --- [저장 로직] ---
  const openSaveModal = (type: 'EXCEL' | 'DB') => {
    if (members.length === 0) return alert("저장할 데이터가 없습니다.");
    if (type === 'EXCEL' && currentFileType === 'DB') {
      return alert("보안 DB 모드에서는 엑셀 저장이 불가능합니다.");
    }
    setSaveTargetType(type);
    setSaveFileName(`${memberTitle}_${format(new Date(), 'yyyyMMdd')}`);
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = () => {
    if (!saveFileName.trim()) return alert("파일명을 입력하세요.");
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

  // --- [상태 색상 및 순차 변경] ---
  const getCarColor = (num: string) => {
    switch (num) {
      case '1': return 'text-red-500'; case '2': return 'text-orange-500'; case '3': return 'text-yellow-400';
      case '4': return 'text-cyan-400'; case '5': return 'text-blue-500'; case '6': return 'text-purple-500';
      default: return 'text-gray-600';
    }
  };

  const getNextCarNumber = (current: string) => {
    const sequence = ['', '1', '2', '3', '4', '5', '6'];
    const currentIndex = sequence.indexOf(current || '');
    const nextValue = sequence[(currentIndex + 1) % sequence.length];
    setLastSelectedCar(nextValue); // 최종 사용 데이터 업데이트
    return nextValue;
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
      
      {/* 상단 헤더 및 도구바 */}
      <div className="flex flex-col w-full mb-1">
        <div className="flex items-center justify-between w-full h-10 px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[1.3rem] font-black text-white truncate cursor-pointer" onClick={() => setIsEditingTitle(true)}>
              {isEditingTitle ? (
                <input autoFocus className="bg-transparent border-b border-blue-500 outline-none" value={memberTitle} onChange={(e) => setMemberTitle(e.target.value)} onBlur={() => setIsEditingTitle(false)} />
              ) : memberTitle}
            </h2>
          </div>
          <div className="flex bg-[#1a1a2e] p-0.5 rounded border border-[#3a3a5e] gap-1 shadow-lg shrink-0">
            <label className={`p-1 rounded cursor-pointer ${currentFileType === 'DB' ? 'opacity-10 cursor-not-allowed' : 'text-emerald-500 hover:bg-white/5'}`} title="엑셀 불러오기">
              <Upload className="w-5 h-5" />
              <input type="file" className="hidden" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, 'EXCEL')} disabled={currentFileType === 'DB'} />
            </label>
            <button onClick={() => openSaveModal('EXCEL')} disabled={currentFileType === 'DB'} className={`p-1 rounded ${currentFileType === 'DB' ? 'opacity-10 cursor-not-allowed' : 'text-emerald-400 hover:bg-white/5'}`} title="엑셀 저장">
              <FileSpreadsheet className="w-5 h-5" />
            </button>
            <div className="w-px h-3 bg-[#3a3a5e] my-auto mx-0.5" />
            <label className="p-1 text-indigo-500 cursor-pointer hover:bg-indigo-500/10 rounded" title="보안 DB 불러오기">
              <Database className="w-5 h-5" />
              <input type="file" className="hidden" accept=".db" onChange={(e) => handleFileUpload(e, 'DB')} />
            </label>
            <button onClick={() => openSaveModal('DB')} className="p-1 text-indigo-400 hover:bg-white/5 rounded" title="보안 DB 저장">
              <Save className="w-5 h-5" />
            </button>
            <div className="w-px h-3 bg-[#3a3a5e] my-auto mx-0.5" />
            <button onClick={() => setIsMessageModalOpen(true)} className="p-1 text-orange-400 hover:bg-orange-500/10 rounded"><MessageSquare className="w-5 h-5" /></button>
            <button onClick={() => { if(selectedIds.size === 0) return alert("대상 없음"); if(confirm("삭제?")) { setMembers(members.filter(m => !selectedIds.has(m.id))); setSelectedIds(new Set()); } }} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><Eraser className="w-5 h-5" /></button>
            <button onClick={() => { 
                setEditingMember({ 
                    id: Math.random().toString(36).substring(2, 11), 
                    sn: 0, 
                    branch: selectedBranch === '전체' ? '본점' : selectedBranch, 
                    name: '', position: '회원', phone: '010--', address: '', joined: '', fee: false, attendance: false, 
                    carNumber: lastSelectedCar, 
                    memo: '' 
                }); 
                setIsModalOpen(true); 
            }} className="p-1 text-blue-500 hover:bg-blue-500/10 rounded">
                <UserPlus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 테이블 데이터 목록 */}
      <div className="flex-grow overflow-auto bg-[#1a1a2e] rounded border border-[#3a3a5e]">
        <table className="w-full text-left table-fixed text-[12px] font-bold">
          <thead className="sticky top-0 z-10 bg-[#2c2c2e] text-blue-400 font-black border-b border-[#3a3a5e]">
            <tr>
              <th className="p-0.5 w-6 text-center"><input type="checkbox" checked={displayMembers.length > 0 && selectedIds.size === displayMembers.length} onChange={(e) => setSelectedIds(e.target.checked ? new Set(displayMembers.map(m => m.id)) : new Set())} /></th>
              <th className="p-0.5 w-4 text-left text-gray-700 text-[10px]">N</th>
              <th className="p-0.5 w-4 text-left">지</th>
              <th className="p-0.5 w-[54px] text-left">이름</th>
              <th className="p-0.5 w-[94px] text-left">연락처</th>
              <th className="p-0.5 w-5 text-right text-emerald-400">차</th>
              <th className="p-0.5 w-5 text-right text-yellow-400">비</th>
              <th className="p-0.5 w-5 text-right text-green-500">출</th>
              <th className="p-0.5 w-6 text-right text-purple-400 text-[11px]">가</th>
            </tr>
          </thead>
          <tbody>
            {displayMembers.map((m, idx) => (
              <tr key={m.id} className={`border-b border-[#2c2c2e] hover:bg-white/5 cursor-pointer ${selectedIds.has(m.id) ? 'bg-blue-900/10' : ''}`} onClick={() => { setEditingMember({...m}); setIsModalOpen(true); }}>
                <td className="p-0.5 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => { const n = new Set(selectedIds); n.has(m.id) ? n.delete(m.id) : n.add(m.id); setSelectedIds(n); }} /></td>
                <td className="p-0.5 text-left text-gray-700 text-[10px]">{idx + 1}</td>
                <td className="p-0.5 text-left text-blue-400">{m.branch.charAt(0)}</td>
                <td className="p-0.5 text-left truncate text-white">{m.name}</td>
                <td className="p-0.5 text-left text-blue-300 font-mono tracking-tighter">{m.phone}</td>
                <td className={`p-0.5 text-right font-black ${getCarColor(m.carNumber)}`}>{m.carNumber || '-'}</td>
                <td className="p-0.5 text-right"><Check className={`w-4 h-4 ml-auto ${m.fee ? 'text-yellow-400' : 'text-gray-800'}`} /></td>
                <td className="p-0.5 text-right"><Check className={`w-4 h-4 ml-auto ${m.attendance ? 'text-green-500' : 'text-gray-800'}`} /></td>
                <td className="p-0.5 text-right"><Check className={`w-4 h-4 ml-auto ${m.joined && m.joined.includes('26') ? 'text-purple-400' : 'text-gray-800'}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- [회원 추가/수정 모달: 요구사항 최종 반영] --- */}
      {isModalOpen && editingMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md bg-[#1a1a2e] rounded-2xl p-4 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4 text-white font-black text-xl border-b border-white/5 pb-2">
              <h3>{editingMember.id.includes('db_') || editingMember.sn > 0 ? '회원 정보 수정' : '신규 회원 등록'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-gray-500" /></button>
            </div>
            
            <div className="space-y-2">
              {/* 지점 및 성함 레이아웃 */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[14px] text-blue-400 font-black ml-1 mb-1 block">지점</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-bold outline-none text-sm" value={editingMember.branch} onChange={(e) => setEditingMember({...editingMember, branch: e.target.value})}>
                    {branches.filter(b => b !== '전체').map(b => <option key={b} value={b} className="bg-[#1a1a2e]">{b}</option>)}
                  </select>
                </div>
                <div className="flex-[2]">
                  <label className="text-[14px] text-blue-400 font-black ml-1 mb-1 block">성함</label>
                  <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-bold outline-none text-sm focus:border-blue-500" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} />
                </div>
              </div>

              {/* 연락처 입력 섹션 (010 고정 및 2칸 분할) */}
              <div>
                <label className="text-[14px] text-blue-400 font-black ml-1 mb-1 block">연락처 (010)</label>
                <div className="flex items-center gap-1">
                  <div className="w-14 bg-white/10 border border-white/5 rounded-xl py-2 text-center text-gray-400 font-black text-sm">010</div>
                  <span className="text-gray-600">-</span>
                  <input ref={phoneMidRef} type="tel" className="w-20 bg-white/5 border border-white/10 rounded-xl py-2 text-white text-center font-bold outline-none text-sm focus:border-blue-500" value={(editingMember.phone || '').split('-')[1] || ''} onChange={(e) => { 
                    const v = e.target.value.replace(/\D/g,'').slice(0,4); 
                    const p = (editingMember.phone || '010--').split('-'); 
                    setEditingMember({...editingMember, phone: `010-${v}-${p[2]||''}`}); 
                    if(v.length === 4) phoneEndRef.current?.focus(); 
                  }} maxLength={4} />
                  <span className="text-gray-600">-</span>
                  <input ref={phoneEndRef} type="tel" className="w-20 bg-white/5 border border-white/10 rounded-xl py-2 text-white text-center font-bold outline-none text-sm focus:border-blue-500" value={(editingMember.phone || '').split('-')[2] || ''} onChange={(e) => { 
                    const v = e.target.value.replace(/\D/g,'').slice(0,4); 
                    const p = (editingMember.phone || '010--').split('-'); 
                    setEditingMember({...editingMember, phone: `010-${p[1]||''}-${v}`}); 
                  }} maxLength={4} />
                </div>
              </div>

              {/* 차/비/출/가 통합 관리 (시인성 강화 버전) */}
              <div className="pt-1">
                <label className="text-[14px] text-blue-400 font-black ml-1 mb-1 block">차/비/출/가 통합 관리</label>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => setEditingMember({...editingMember, carNumber: getNextCarNumber(editingMember.carNumber)})} className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 border border-white/5 active:bg-white/10 transition-colors">
                    <span className="text-[11px] text-emerald-400 font-black mb-1">차량</span>
                    <span className={`text-2xl font-black ${getCarColor(editingMember.carNumber)}`}>{editingMember.carNumber || '-'}</span>
                  </button>
                  <button onClick={() => setEditingMember({...editingMember, fee: !editingMember.fee})} className={`flex flex-col items-center justify-center p-2 rounded-xl border ${editingMember.fee ? 'bg-yellow-400/20 border-yellow-400/50' : 'bg-white/5 border-white/5'}`}>
                    <span className="text-[11px] text-yellow-400 font-black mb-1">회비</span>
                    <Check className={`w-6 h-6 ${editingMember.fee ? 'text-yellow-400' : 'text-gray-700'}`} />
                  </button>
                  <button onClick={() => setEditingMember({...editingMember, attendance: !editingMember.attendance})} className={`flex flex-col items-center justify-center p-2 rounded-xl border ${editingMember.attendance ? 'bg-green-500/20 border-green-500/50' : 'bg-white/5 border-white/5'}`}>
                    <span className="text-[11px] text-green-500 font-black mb-1">출결</span>
                    <Check className={`w-6 h-6 ${editingMember.attendance ? 'text-green-500' : 'text-gray-700'}`} />
                  </button>
                  <button onClick={() => setEditingMember({...editingMember, joined: editingMember.joined?.includes('26') ? '' : '26'})} className={`flex flex-col items-center justify-center p-2 rounded-xl border ${editingMember.joined?.includes('26') ? 'bg-purple-400/20 border-purple-400/50' : 'bg-white/5 border-white/5'}`}>
                    <span className="text-[11px] text-purple-400 font-black mb-1">가입</span>
                    <Check className={`w-6 h-6 ${editingMember.joined?.includes('26') ? 'text-purple-400' : 'text-gray-700'}`} />
                  </button>
                </div>
              </div>

              {/* 하단 제어 버튼 */}
              <div className="flex gap-2 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-white/5 text-gray-400 rounded-xl font-black border border-white/5 active:scale-95 transition-all">취소</button>
                <button onClick={handleModalSave} className="flex-[2] py-3.5 bg-blue-600 text-white rounded-xl font-black shadow-lg active:scale-95 transition-all">정보 저장 완료</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MessageModal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} targets={selectedIds.size > 0 ? members.filter(m => selectedIds.has(m.id)) : displayMembers} />
    </div>
  );
};

export default MemberView;