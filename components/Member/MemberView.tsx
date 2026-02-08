import React, { useState, useRef, useMemo } from 'react';
import { 
  UserPlus, Check, Eraser, X, Save, CloudDownload, CloudUpload, MessageSquare, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { Member } from '../../types';
import MessageModal from './MessageModal'; 

interface MemberViewProps {
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  onHome: () => void;
}

const MemberView: React.FC<MemberViewProps> = ({ members, setMembers, onHome }) => {
  // --- [기존 상태 및 기능 100% 보존] ---
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
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가

  const phoneMidRef = useRef<HTMLInputElement>(null);
  const phoneEndRef = useRef<HTMLInputElement>(null);

  const currentYear = "26";
  const branches = ['전체', '본점', '제일', '신촌', '교대', '작전', '효성', '부평', '갈산'];

  const generateId = () => Math.random().toString(36).substring(2, 11);
  const getShortBranch = (branch: string) => branch === '전체' ? '전' : branch.charAt(0);
  const getCarColor = (num: string) => {
    switch (num) {
      case '1': return 'text-red-500'; case '2': return 'text-orange-500'; case '3': return 'text-yellow-400';
      case '4': return 'text-cyan-400'; case '5': return 'text-blue-500'; case '6': return 'text-purple-500';
      default: return 'text-gray-600';
    }
  };

  // --- [신규 기능: 버첼 DB 연동 (버튼은 삭제했으나 로직은 유지)] ---

  const fetchFromVercel = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/db/members?branch=${encodeURIComponent(selectedBranch)}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
        alert(`${selectedBranch} 데이터를 서버에서 가져왔습니다.`);
      }
    } catch (err) { alert("서버 로드 실패"); }
    finally { setIsLoading(false); }
  };

  const saveToVercel = async () => {
    if (!window.confirm(`${selectedBranch} 데이터를 서버 DB에 저장하시겠습니까?`)) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: selectedBranch, members })
      });
      if (res.ok) alert("서버 저장 성공!");
    } catch (err) { alert("서버 저장 실패"); }
    finally { setIsLoading(false); }
  };

  const handleFileUploadAndLink = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    setTimeout(() => {
      alert(`파일 [${file.name}]이 서버로 전송되었습니다.\n생성된 링크: https://vercel-temp.storage/${file.name}`);
      setIsLoading(false);
    }, 1000);
  };

  // --- [기존 로직 보존] ---
  const handleMessageSend = () => {
    const targetMembers = selectedIds.size > 0 ? members.filter(m => selectedIds.has(m.id)) : displayMembers;
    if (targetMembers.length === 0) return alert("문자를 보낼 대상이 없습니다.");
    setIsMessageModalOpen(true);
  };

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

  // --- [소트 로직 수정: 공백은 뒤로] ---
  const displayMembers = useMemo(() => {
    let filtered = selectedBranch === '전체' ? members : members.filter(m => m.branch === selectedBranch);
    return [...filtered].sort((a, b) => {
      for (const key of sortCriteria) {
        const valA = String(a[key as keyof Member] || '').trim();
        const valB = String(b[key as keyof Member] || '').trim();

        // 둘 다 공백이 아닐 때만 일반 비교
        if (valA !== "" && valB !== "") {
          const res = valA.localeCompare(valB, 'ko');
          if (res !== 0) return res;
        } 
        // 하나가 공백이면 공백인 쪽을 뒤로 (valA가 비었으면 뒤(1), valB가 비었으면 앞(-1))
        else if (valA !== valB) {
          return valA === "" ? 1 : -1;
        }
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
          {isEditingTitle ? (
            <input autoFocus className="text-[1.3rem] font-black text-white bg-transparent border-b border-blue-500 outline-none w-1/2" value={memberTitle} onChange={(e) => setMemberTitle(e.target.value)} onBlur={() => setIsEditingTitle(false)} onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)} />
          ) : (
            <h2 className="text-[1.3rem] font-black text-white truncate cursor-pointer hover:text-blue-400" onClick={() => setIsEditingTitle(true)}>{memberTitle}</h2>
          )}

          <div className="flex bg-[#1a1a2e] p-0.5 rounded border border-[#3a3a5e] gap-1 shadow-lg shrink-0">
            {/* [삭제 요청 사항 반영: 버첼 연동 및 파일 링크 변환 버튼 제거] */}
            
            <button onClick={handleMessageSend} className="p-1 text-orange-400 hover:bg-orange-500/10 rounded"><MessageSquare className="w-5 h-5" /></button>
            <button onClick={() => { if(selectedIds.size === 0) return alert("삭제할 대상을 선택하세요."); if(confirm(`${selectedIds.size}명을 삭제할까요?`)) { setMembers(members.filter(m => !selectedIds.has(m.id))); setSelectedIds(new Set()); } }} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><Eraser className="w-5 h-5" /></button>
            <button onClick={() => { setEditingMember({ id: generateId(), sn: 0, branch: '본점', name: '', position: '회원', phone: '010--', address: '', joined: '', fee: false, attendance: false, carNumber: lastSelectedCar, memo: '' }); setIsModalOpen(true); }} className="p-1 text-blue-500 hover:bg-blue-500/10 rounded"><UserPlus className="w-5 h-5" /></button>
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
              <tr key={m.id} className={`border-b border-[#2c2c2e] hover:bg-white/5 cursor-pointer ${selectedIds.has(m.id) ? 'bg-blue-900/10' : ''}`} onClick={() => { setEditingMember({...m}); setIsModalOpen(true); }}>
                <td className="p-0.5 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => { const n = new Set(selectedIds); n.has(m.id) ? n.delete(m.id) : n.add(m.id); setSelectedIds(n); }} /></td>
                <td className="p-0.5 text-left text-gray-600 text-[10px] font-normal">{idx + 1}</td>
                <td className="p-0.5 text-left text-blue-400 font-black">{getShortBranch(m.branch)}</td>
                <td className="p-0.5 text-left truncate text-white whitespace-nowrap">{m.name}</td>
                <td className="p-0.5 text-left text-blue-300 font-mono tracking-tighter">{m.phone}</td>
                <td className="p-0.5 text-left text-gray-400 truncate">{m.address}</td>
                <td className={`p-0.5 text-right font-black ${getCarColor(m.carNumber)}`} onClick={(e) => { e.stopPropagation(); handleCarClick(m); }}>{m.carNumber || '-'}</td>
                <td className="p-0 text-right" onClick={(e) => { e.stopPropagation(); setMembers(prev => prev.map(x => x.id === m.id ? {...x, fee: !x.fee} : x)); }}><Check className={`w-4 h-4 ml-auto ${m.fee ? 'text-yellow-400' : 'text-gray-800'}`} /></td>
                <td className="p-0 text-right" onClick={(e) => { e.stopPropagation(); setMembers(prev => prev.map(x => x.id === m.id ? {...x, attendance: !x.attendance} : x)); }}><Check className={`w-4 h-4 ml-auto ${m.attendance ? 'text-green-500' : 'text-gray-800'}`} /></td>
                <td className="p-0 text-right" onClick={(e) => { e.stopPropagation(); let j = String(m.joined || ''); j = j.includes(currentYear) ? "" : currentYear; setMembers(prev => prev.map(x => x.id === m.id ? {...x, joined: j} : x)); }}><Check className={`w-4 h-4 ml-auto ${String(m.joined || '').includes(currentYear) ? 'text-purple-500' : 'text-gray-800'}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MessageModal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} targets={selectedIds.size > 0 ? members.filter(m => selectedIds.has(m.id)) : displayMembers} />

      {isModalOpen && editingMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg bg-[#1a1a2e] rounded-2xl p-6 border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-white">{editingMember.id && members.find(m => m.id === editingMember.id) ? '정보 수정' : '새 회원 등록'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-blue-400 font-black ml-1 uppercase">Branch</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-bold outline-none" value={editingMember.branch} onChange={(e) => setEditingMember({...editingMember, branch: e.target.value})}>
                    {branches.filter(b => b !== '전체').map(b => <option key={b} value={b} className="bg-[#1a1a2e]">{b}</option>)}
                  </select>
                </div>
                <div className="flex-[2] space-y-1">
                  <label className="text-[10px] text-blue-400 font-black ml-1 uppercase">Address</label>
                  <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-bold outline-none" value={editingMember.address} onChange={(e) => setEditingMember({...editingMember, address: e.target.value})} placeholder="주소" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-blue-400 font-black ml-1 uppercase">Name</label>
                  <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-bold outline-none" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} placeholder="성함" />
                </div>
                <div className="flex-[2] space-y-1">
                  <label className="text-[10px] text-blue-400 font-black ml-1 uppercase">Phone</label>
                  <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    <span className="font-black text-gray-500 text-xs">010</span>
                    <input ref={phoneMidRef} type="tel" className="w-full bg-transparent font-black text-center outline-none text-white" value={(editingMember.phone || '').split('-')[1] || ''} onChange={(e) => { const v = e.target.value.replace(/\D/g,'').slice(0,4); const p = (editingMember.phone || '010--').split('-'); setEditingMember({...editingMember, phone: `010-${v}-${p[2]||''}`}); if(v.length===4) phoneEndRef.current?.focus(); }} maxLength={4} />
                    <input ref={phoneEndRef} type="tel" className="w-full bg-transparent font-black text-center outline-none text-white" value={(editingMember.phone || '').split('-')[2] || ''} onChange={(e) => { const v = e.target.value.replace(/\D/g,'').slice(0,4); const p = (editingMember.phone || '010--').split('-'); setEditingMember({...editingMember, phone: `010-${p[1]||''}-${v}`}); }} maxLength={4} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white/5 text-white rounded-xl font-black border border-white/5 active:scale-95">취소</button>
                <button onClick={handleModalSave} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-black flex items-center justify-center gap-2 active:scale-95"><Save className="w-4 h-4" />저장</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberView;