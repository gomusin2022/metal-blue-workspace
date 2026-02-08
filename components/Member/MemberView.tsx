import React, { useState, useRef, useMemo } from 'react';
import { 
  UserPlus, Check, Eraser, X, Save, CloudDownload, CloudUpload, MessageSquare, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { Member } from '../../types';
import MessageModal from './MessageModal'; 

// [전역 변수] 최종 사용한 차량 번호를 컴포넌트 외부에서 영구 기억 (공백 포함)
let GLOBAL_LAST_CAR_NUMBER = ''; 

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

  const phoneMidRef = useRef<HTMLInputElement>(null);
  const phoneEndRef = useRef<HTMLInputElement>(null);

  const currentYear = "26";
  const branches = ['전체', '본점', '제일', '신촌', '교대', '작전', '효성', '부평', '갈산'];

  // --- [유틸리티 및 핸들러] ---
  const generateId = () => Math.random().toString(36).substring(2, 11);
  const getShortBranch = (branch: string) => branch === '전체' ? '전' : branch.charAt(0);
  
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
    const nextVal = sequence[(currentIndex + 1) % sequence.length];
    // 클릭 즉시 전역 변수 업데이트 (공백인 경우 공백 저장)
    GLOBAL_LAST_CAR_NUMBER = nextVal; 
    return nextVal;
  };

  const handleMessageSend = () => {
    const targetMembers = selectedIds.size > 0 ? members.filter(m => selectedIds.has(m.id)) : displayMembers;
    if (targetMembers.length === 0) return alert("문자를 보낼 대상이 없습니다.");
    setIsMessageModalOpen(true);
  };

  const handleDbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setMembers(json.map((d: any) => ({
          id: generateId(), sn: Number(d.id || 0), branch: d.branch || '본점', name: d.name || '',
          position: d.position || '회원', phone: d.phone || '', address: d.addr || '',
          joined: d.join_year || '', fee: d.fee === "1", attendance: d.attendance === "1",
          carNumber: d.car_num || '', memo: d.note || ''
        })));
      } catch (err) { alert("디비 파일 파싱 실패"); }
    };
    reader.readAsText(file);
  };

  const handleDbDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    const targetMembers = selectedIds.size > 0 ? members.filter(m => selectedIds.has(m.id)) : displayMembers;
    const dbData = targetMembers.map(m => ({
      id: m.sn.toString(), name: m.name, position: m.position, phone: m.phone, branch: m.branch,
      join_year: m.joined, addr: m.address, fee: m.fee ? "1" : "", car_num: m.carNumber,
      attendance: m.attendance ? "1" : "", note: m.memo
    }));
    const blob = new Blob([JSON.stringify(dbData, null, 4)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `${memberTitle}_${format(new Date(), 'yyyyMMdd')}.db`; link.click();
  };

  // --- [데이터 정렬 로직] ---
  const displayMembers = useMemo(() => {
    let filtered = selectedBranch === '전체' ? members : members.filter(m => m.branch === selectedBranch);
    return [...filtered].sort((a, b) => {
      for (const key of sortCriteria) {
        let valA: any = a[key as keyof Member];
        let valB: any = b[key as keyof Member];
        if (typeof valA === 'boolean') valA = valA ? "1" : "";
        if (typeof valB === 'boolean') valB = valB ? "1" : "";
        const strA = String(valA || '').trim();
        const strB = String(valB || '').trim();
        if (key === 'joined') {
          if (strA === "26" && strB !== "26") return -1;
          if (strA !== "26" && strB === "26") return 1;
        } else {
          if (strA !== "" && strB === "") return -1;
          if (strA === "" && strB !== "") return 1;
        }
        const res = strA.localeCompare(strB, 'ko', { numeric: true });
        if (res !== 0) return res;
      }
      return 0;
    });
  }, [members, selectedBranch, sortCriteria]);

  const handleModalSave = () => {
    if (!editingMember) return;
    // 저장 시 최종 확정된 차량 번호를 전역 변수에 기록
    GLOBAL_LAST_CAR_NUMBER = editingMember.carNumber || '';
    setMembers(prev => {
      const exists = prev.find(m => m.id === editingMember.id);
      return exists ? prev.map(m => m.id === editingMember.id ? editingMember : m) : [editingMember, ...prev];
    });
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] p-1 text-gray-200 overflow-hidden font-sans">
      {isLoading && <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}
      
      {/* 상단 컨트롤 바 */}
      <div className="flex flex-col w-full mb-1">
        <div className="flex items-center justify-between w-full h-10 px-0.5">
          {isEditingTitle ? (
            <input autoFocus className="text-[1.3rem] font-black text-white bg-transparent border-b border-blue-500 outline-none w-1/2" value={memberTitle} onChange={(e) => setMemberTitle(e.target.value)} onBlur={() => setIsEditingTitle(false)} onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)} />
          ) : (
            <h2 className="text-[1.3rem] font-black text-white truncate cursor-pointer hover:text-blue-400" onClick={() => setIsEditingTitle(true)}>{memberTitle}</h2>
          )}

          <div className="flex bg-[#1a1a2e] p-0.5 rounded border border-[#3a3a5e] gap-1 shadow-lg shrink-0">
            <button onClick={handleMessageSend} className="p-1 text-orange-400 hover:bg-orange-500/10 rounded"><MessageSquare className="w-5 h-5" /></button>
            <button onClick={() => { if(selectedIds.size === 0) return alert("삭제할 대상을 선택하세요."); if(confirm(`${selectedIds.size}명을 삭제할까요?`)) { setMembers(members.filter(m => !selectedIds.has(m.id))); setSelectedIds(new Set()); } }} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><Eraser className="w-5 h-5" /></button>
            <button onClick={() => { 
              setEditingMember({ 
                id: generateId(), sn: 0, branch: '본점', name: '', position: '회원', phone: '010--', address: '', 
                joined: '', fee: false, attendance: false, 
                carNumber: GLOBAL_LAST_CAR_NUMBER, 
                memo: '' 
              }); 
              setIsModalOpen(true); 
            }} className="p-1 text-blue-500 hover:bg-blue-500/10 rounded"><UserPlus className="w-5 h-5" /></button>
            <div className="w-px h-3 bg-[#3a3a5e] my-auto mx-0.5" />
            <button onClick={(e) => handleDbDownload(e)} className="p-1 text-indigo-400 hover:bg-indigo-500/10 rounded"><CloudDownload className="w-5 h-5" /></button>
            <label className="p-1 text-indigo-500 cursor-pointer hover:bg-indigo-500/10 rounded">
              <CloudUpload className="w-5 h-5" />
              <input type="file" className="hidden" accept=".db,.json" onChange={handleDbUpload} />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between w-full border-t border-[#3a3a5e]/20 pt-1">
          <div className="flex gap-0.5 overflow-x-auto no-scrollbar pr-2">
            {[{label:'지점', key:'branch'}, {label:'이름', key:'name'}, {label:'차량', key:'carNumber'}, {label:'회비', key:'fee'}, {label:'출결', key:'attendance'}, {label:'가입', key:'joined'}].map(btn => (
              <button key={btn.key} onClick={() => setSortCriteria(prev => prev.includes(btn.key) ? prev.filter(x => x !== btn.key) : [btn.key, ...prev])} className={`px-2 py-0.5 min-w-[36px] rounded border text-[12px] font-black transition-all ${sortCriteria.includes(btn.key) ? 'bg-blue-600 border-blue-400 text-white' : 'bg-[#1a1a2e] border-[#3a3a5e] text-gray-400'}`}>
                {btn.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-auto font-black text-[11px] text-gray-300">
            <select className="bg-[#1a1a2e] border border-blue-500/50 rounded px-1 py-0.5 text-blue-400 outline-none" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              {branches.map(b => <option key={b} value={b} className="bg-[#121212]">{b}</option>)}
            </select>
            <span className="whitespace-nowrap">선택 {selectedIds.size} | 표시 {displayMembers.length}</span>
          </div>
        </div>
      </div>

      {/* 회원 목록 테이블: text-[12px] 유지 */}
      <div className="flex-grow overflow-auto bg-[#1a1a2e] rounded border border-[#3a3a5e]">
        <table className="w-full text-left table-fixed">
          <thead className="sticky top-0 z-10 bg-[#2c2c2e] text-blue-400 font-black text-[12px] border-b border-[#3a3a5e]">
            <tr>
              <th className="p-0.5 w-6 text-center"><input type="checkbox" checked={displayMembers.length > 0 && selectedIds.size === displayMembers.length} onChange={(e) => setSelectedIds(e.target.checked ? new Set(displayMembers.map(m => m.id)) : new Set())} /></th>
              <th className="p-0.5 w-4 text-left text-gray-500 text-[10px]">N</th>
              <th className="p-0.5 w-4 text-left">지</th>
              <th className="p-0.5 w-[54px] text-left">이름</th>
              <th className="p-0.5 w-[94px] text-left">연락처</th>
              <th className="p-0.5 w-12 text-left text-gray-400">주소</th>
              <th className="p-0.5 w-5 text-right text-emerald-400">차</th>
              <th className="p-0.5 w-5 text-right">비</th>
              <th className="p-0.5 w-5 text-right">출</th>
              <th className="p-0.5 w-5 text-right">가</th>
            </tr>
          </thead>
          <tbody className="text-[12px] font-bold">
            {displayMembers.map((m, idx) => (
              <tr key={m.id} className={`border-b border-[#2c2c2e] hover:bg-white/5 cursor-pointer ${selectedIds.has(m.id) ? 'bg-blue-900/10' : ''}`} onClick={() => { 
                // 수정 시에도 전역 변수의 현재 상태(공백 여부)를 즉시 주입하여 동기화
                setEditingMember({...m, carNumber: GLOBAL_LAST_CAR_NUMBER}); 
                setIsModalOpen(true); 
              }}>
                <td className="p-0.5 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => { const n = new Set(selectedIds); n.has(m.id) ? n.delete(m.id) : n.add(m.id); setSelectedIds(n); }} /></td>
                <td className="p-0.5 text-left text-gray-600 text-[10px] font-normal">{idx + 1}</td>
                <td className="p-0.5 text-left text-blue-400 font-black">{getShortBranch(m.branch)}</td>
                <td className="p-0.5 text-left truncate text-white whitespace-nowrap">{m.name}</td>
                <td className="p-0.5 text-left text-blue-300 font-mono tracking-tighter">{m.phone}</td>
                <td className="p-0.5 text-left text-gray-400 truncate">{m.address}</td>
                <td className={`p-0.5 text-right font-black ${getCarColor(m.carNumber)}`}>{m.carNumber || '-'}</td>
                <td className="p-0 text-right"><Check className={`w-4 h-4 ml-auto ${m.fee ? 'text-yellow-400' : 'text-gray-800'}`} /></td>
                <td className="p-0 text-right"><Check className={`w-4 h-4 ml-auto ${m.attendance ? 'text-green-500' : 'text-gray-800'}`} /></td>
                <td className="p-0 text-right"><Check className={`w-4 h-4 ml-auto ${String(m.joined || '').includes(currentYear) ? 'text-purple-500' : 'text-gray-800'}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MessageModal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} targets={selectedIds.size > 0 ? members.filter(m => selectedIds.has(m.id)) : displayMembers} />

      {/* 가입/수정 모달 (레이아웃 및 전역 변수 동기화 유지) */}
      {isModalOpen && editingMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 text-white">
          <div className="w-full max-w-lg bg-[#1a1a2e] rounded-2xl p-6 border border-white/10 relative shadow-2xl">
            <div className="space-y-4">
              {/* 1행: 성명(30%) / 주소(70%) */}
              <div className="flex gap-2">
                <div className="w-[30%]">
                  <label className="text-[14px] text-blue-400 font-black ml-1">성명</label>
                  <input className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-3 font-black text-xl outline-none" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} placeholder="이름" />
                </div>
                <div className="w-[70%]">
                  <label className="text-[14px] text-blue-400 font-black ml-1">주소</label>
                  <input className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-4 font-black text-xl outline-none" value={editingMember.address} onChange={(e) => setEditingMember({...editingMember, address: e.target.value})} placeholder="거주지 주소" />
                </div>
              </div>

              {/* 2행: 지점(30%) / 연락처(70%) */}
              <div className="flex gap-2">
                <div className="w-[30%]">
                  <label className="text-[14px] text-blue-400 font-black ml-1">지점</label>
                  <select className="w-full h-12 bg-white/5 border border-white/10 rounded-lg px-2 font-black text-xl outline-none appearance-none" value={editingMember.branch} onChange={(e) => setEditingMember({...editingMember, branch: e.target.value})}>
                    {branches.filter(b => b !== '전체').map(b => <option key={b} value={b} className="bg-[#1a1a2e]">{b}</option>)}
                  </select>
                </div>
                <div className="w-[70%]">
                  <label className="text-[14px] text-blue-400 font-black ml-1">연락처</label>
                  <div className="flex items-center gap-1 h-12 bg-white/5 border border-white/10 rounded-lg px-4">
                    <span className="font-black text-gray-400 text-xl">010</span>
                    <input ref={phoneMidRef} type="tel" className="w-full bg-transparent font-black text-center outline-none text-xl text-white" value={(editingMember.phone || '').split('-')[1] || ''} onChange={(e) => { const v = e.target.value.replace(/\D/g,'').slice(0,4); const p = (editingMember.phone || '010--').split('-'); setEditingMember({...editingMember, phone: `010-${v}-${p[2]||''}`}); if(v.length===4) phoneEndRef.current?.focus(); }} maxLength={4} />
                    <input ref={phoneEndRef} type="tel" className="w-full bg-transparent font-black text-center outline-none text-xl text-white" value={(editingMember.phone || '').split('-')[2] || ''} onChange={(e) => { const v = e.target.value.replace(/\D/g,'').slice(0,4); const p = (editingMember.phone || '010--').split('-'); setEditingMember({...editingMember, phone: `010-${p[1]||''}-${v}`}); }} maxLength={4} />
                  </div>
                </div>
              </div>

              {/* 차/비/출/가 (모달 내 큰 UI 및 공백 동기화) */}
              <div className="flex items-end justify-between p-4 bg-white/5 rounded-xl border border-white/5 gap-0.5">
                <div className="flex flex-col items-center flex-1 border-r border-white/10 h-full justify-between">
                  <span className="text-[15px] text-blue-400 font-black mb-1">차량</span>
                  <div 
                    onClick={() => setEditingMember({...editingMember, carNumber: getNextCarNumber(editingMember.carNumber || '')})}
                    className={`text-4xl font-black cursor-pointer select-none leading-none ${getCarColor(editingMember.carNumber || '')}`}
                  >
                    {editingMember.carNumber || '-'}
                  </div>
                </div>
                <div className="flex flex-col items-center flex-1 border-r border-white/10 h-full justify-between">
                  <span className="text-[15px] text-blue-400 font-black mb-1">회비</span>
                  <input type="checkbox" className="w-10 h-10 rounded border-gray-600 bg-transparent text-yellow-500 focus:ring-0 cursor-pointer mb-[-4px]" checked={editingMember.fee} onChange={(e) => setEditingMember({...editingMember, fee: e.target.checked})} />
                </div>
                <div className="flex flex-col items-center flex-1 border-r border-white/10 h-full justify-between">
                  <span className="text-[15px] text-blue-400 font-black mb-1">출결</span>
                  <input type="checkbox" className="w-10 h-10 rounded border-gray-600 bg-transparent text-green-500 focus:ring-0 cursor-pointer mb-[-4px]" checked={editingMember.attendance} onChange={(e) => setEditingMember({...editingMember, attendance: e.target.checked})} />
                </div>
                <div className="flex flex-col items-center flex-1 h-full justify-between">
                  <span className="text-[15px] text-blue-400 font-black mb-1">가입</span>
                  <input type="checkbox" className="w-10 h-10 rounded border-gray-600 bg-transparent text-purple-500 focus:ring-0 cursor-pointer mb-[-4px]" checked={String(editingMember.joined || '').includes(currentYear)} onChange={(e) => setEditingMember({...editingMember, joined: e.target.checked ? currentYear : ''})} />
                </div>
              </div>

              {/* 하단 버튼 (취소 | 저장) */}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-white/5 text-gray-400 rounded-xl font-black border border-white/10 active:scale-95 text-xl">취소</button>
                <button onClick={handleModalSave} className="flex-[2] py-4 bg-blue-600 text-white rounded-xl font-black flex items-center justify-center gap-2 active:scale-95 text-2xl shadow-lg shadow-blue-900/20"><Save className="w-7 h-7" />저장하기</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberView;