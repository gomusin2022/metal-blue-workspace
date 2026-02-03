import React, { useState, useRef, useMemo } from 'react';
import { 
  UserPlus, Check, Eraser, X, Save, CloudDownload, CloudUpload, MessageSquare 
} from 'lucide-react';
import { format } from 'date-fns';
import { Member } from '../../types';
import { exportToExcel, readExcel } from '../../services/excelService';
import MessageModal from './MessageModal';

interface MemberViewProps {
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  onHome: () => void;
}

const MemberView: React.FC<MemberViewProps> = ({ members, setMembers, onHome }) => {
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

  const phoneMidRef = useRef<HTMLInputElement>(null);
  const phoneEndRef = useRef<HTMLInputElement>(null);

  const currentYear = "26";
  const branches = ['전체', '본점', '제일', '신촌', '교대', '작전', '효성', '부평', '갈산'];

  const generateId = () => Math.random().toString(36).substring(2, 11);
  const getShortBranch = (branch: string) => branch === '전체' ? '전' : branch.charAt(0);

  const getCarColor = (num: string) => {
    switch (num) {
      case '1': return 'text-red-500';
      case '2': return 'text-orange-500';
      case '3': return 'text-yellow-400';
      case '4': return 'text-cyan-400';
      case '5': return 'text-blue-500';
      case '6': return 'text-purple-500';
      default: return 'text-gray-600';
    }
  };

  const handleMessageSend = () => {
    const targetCount = selectedIds.size > 0 ? selectedIds.size : displayMembers.length;
    if (targetCount === 0) return alert("전송할 대상이 없습니다.");
    setIsMessageModalOpen(true);
  };

  const handleCarClick = (m: Member) => {
    let newValue;
    if (lastClickedMemberId === m.id) {
      const sequence = ['', '1', '2', '3', '4', '5', '6'];
      const currentIndex = sequence.indexOf(m.carNumber || '');
      const nextIndex = (currentIndex + 1) % sequence.length;
      newValue = sequence[nextIndex];
    } else {
      newValue = lastSelectedCar;
    }
    setLastSelectedCar(newValue);
    setLastClickedMemberId(m.id);
    setMembers(prev => prev.map(x => x.id === m.id ? { ...x, carNumber: newValue } : x));
  };

  const processImportedData = (newData: any[], mode: 'append' | 'overwrite') => {
    const validRows = Array.isArray(newData) ? newData : [];
    const currentPhoneKeys = new Set(members.map(m => m.phone.replace(/\D/g, '').slice(-8)));
    
    const formattedData: Member[] = validRows.map((d) => {
      const rawPhone = String(d.phone || d.연락처 || d.phone_number || '');
      const phoneKey = rawPhone.replace(/\D/g, '').slice(-8);
      if (mode === 'append' && currentPhoneKeys.has(phoneKey)) return null;

      return {
        id: generateId(),
        sn: Number(d.id || d.No || d.sn || 0),
        branch: d.branch || d.지점 || '본점',
        name: d.name || d.성명 || d.이름 || '무명',
        position: d.position || d.직책 || '회원',
        phone: rawPhone.includes('-') ? rawPhone : `010-${phoneKey.slice(0, 4)}-${phoneKey.slice(4)}`,
        address: d.addr || d.주소 || d.address || '',
        joined: String(d.join_year || d.가입연도 || d.joined || ''),
        fee: d.fee === "1" || d.참가비 === "1" || d.fee === true,
        attendance: d.attendance === "1" || d.attendance === "3" || d.출결 === "1" || d.attendance === true,
        carNumber: d.car_num || d.차량번호 || d.carNumber || '',
        memo: d.note || d.비고 || d.memo || ''
      };
    }).filter((m): m is Member => m !== null);

    if (mode === 'overwrite') {
      setMembers(formattedData.map((m, idx) => ({ ...m, sn: idx + 1 })));
    } else {
      setMembers([...members, ...formattedData].map((m, idx) => ({ ...m, sn: idx + 1 })));
    }
  };

  const handleDbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const mode = window.confirm("기존 데이터에 합치시겠습니까? (취소 시 덮어쓰기)") ? 'append' : 'overwrite';
        processImportedData(json, mode);
      } catch (err) { alert("디비 파일 파싱 실패"); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const displayMembers = useMemo(() => {
    let filtered = selectedBranch === '전체' ? members : members.filter(m => m.branch === selectedBranch);
    return [...filtered].sort((a, b) => {
      for (const key of sortCriteria) {
        if (key === 'memo') {
          const sA = (a.memo || '').includes('신규') ? 1 : 0;
          const sB = (b.memo || '').includes('신규') ? 1 : 0;
          if (sA !== sB) return sB - sA;
        } else if (key === 'carNumber') {
          const valA = a.carNumber || '9'; 
          const valB = b.carNumber || '9';
          if (valA !== valB) return valA.localeCompare(valB);
        } else if (key === 'name' || key === 'branch' || key === 'address') {
          const res = String(a[key as keyof Member] || '').localeCompare(String(b[key as keyof Member] || ''), 'ko');
          if (res !== 0) return res;
        } else {
          const nA = a[key as keyof Member] ? 1 : 0;
          const nB = b[key as keyof Member] ? 1 : 0;
          if (nA !== nB) return nB - nA;
        }
      }
      return 0;
    });
  }, [members, selectedBranch, sortCriteria]);

  const handleDbDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    const isSelected = selectedIds.size > 0;
    const targetMembers = isSelected ? members.filter(m => selectedIds.has(m.id)) : displayMembers;
    if (targetMembers.length === 0) return alert("저장할 데이터가 없습니다.");

    const defaultName = `${memberTitle}_${format(new Date(), 'yyyyMMdd')}`;
    const fileName = window.prompt("디비 파일명을 수정하세요", defaultName);
    if (!fileName) return;

    const dbData = targetMembers.map(m => ({
      id: m.sn.toString(), name: m.name, position: m.position, phone: m.phone,
      branch: m.branch, join_year: m.joined, addr: m.address, fee: m.fee ? "1" : "",
      car_num: m.carNumber, attendance: m.attendance ? (m.attendance === true ? "1" : m.attendance) : "", note: m.memo
    }));

    const blob = new Blob([JSON.stringify(dbData, null, 4)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.db`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleModalSave = () => {
    if (!editingMember) return;
    setLastSelectedCar(editingMember.carNumber || '');
    setMembers(prev => {
      const exists = prev.find(m => m.id === editingMember.id);
      let finalMember = { ...editingMember };
      if (!exists) {
        finalMember.memo = finalMember.memo ? `신규, ${finalMember.memo}` : "신규";
        finalMember.joined = finalMember.joined || currentYear;
      }
      return exists ? prev.map(m => m.id === editingMember.id ? finalMember : m) : [finalMember, ...prev];
    });
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] p-1.5 md:p-6 pt-0.5 text-gray-200 overflow-hidden font-sans">
      <div className="flex flex-col w-full mb-1">
        <div className="flex items-center justify-between w-full h-10">
          {isEditingTitle ? (
            <input 
              autoFocus
              className="text-[1.35rem] md:text-[1.8rem] font-black text-white bg-transparent border-b border-blue-500 outline-none w-1/2"
              value={memberTitle}
              onChange={(e) => setMemberTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => { if(e.key === 'Enter') setIsEditingTitle(false); }}
            />
          ) : (
            <h2 className="text-[1.35rem] md:text-[1.8rem] font-black text-white truncate cursor-pointer hover:text-blue-400" onClick={() => setIsEditingTitle(true)}>
              {memberTitle}
            </h2>
          )}

          <div className="flex bg-[#1a1a2e] p-1 rounded border border-[#3a3a5e] gap-1.5 shadow-lg shrink-0">
            <button title="문자전송" onClick={handleMessageSend} className="p-1.5 text-orange-400 hover:bg-orange-500/10 rounded">
                <MessageSquare className="w-5 h-5" />
            </button>
            <button title="선택삭제" onClick={() => { 
                if(selectedIds.size === 0) return alert("삭제할 대상을 선택하세요.");
                if(confirm(`${selectedIds.size}명을 삭제할까요?`)) { 
                    setMembers(members.filter(m => !selectedIds.has(m.id))); 
                    setSelectedIds(new Set()); 
                } 
            }} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded"><Eraser className="w-5 h-5" /></button>
            <button title="회원추가" onClick={() => { 
              setEditingMember({ id: generateId(), sn: 0, branch: '본점', name: '', position: '회원', phone: '010--', address: '', joined: '', fee: false, attendance: false, carNumber: lastSelectedCar, memo: '' }); 
              setIsModalOpen(true); 
            }} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded"><UserPlus className="w-5 h-5" /></button>
            <div className="w-px h-4 bg-[#3a3a5e] my-auto mx-0.5" />
            <button title="디비다운" onClick={handleDbDownload} className="p-1.5 text-indigo-400 hover:bg-indigo-500/10 rounded"><CloudDownload className="w-5 h-5" /></button>
            <label title="디비업" className="p-1.5 text-indigo-500 cursor-pointer hover:bg-indigo-500/10 rounded">
              <CloudUpload className="w-5 h-5" />
              <input type="file" className="hidden" accept=".db,.json" onChange={handleDbUpload} />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between w-full border-t border-[#3a3a5e]/20 pt-1.5">
          <div className="flex gap-1 overflow-x-auto no-scrollbar pr-2">
            {[ {label:'지점', key:'branch'}, {label:'이름', key:'name'}, {label:'차량', key:'carNumber'}, {label:'회비', key:'fee'}, {label:'출결', key:'attendance'}, {label:'가입', key:'joined'} ].map(btn => (
              <button key={btn.key} onClick={() => setSortCriteria(prev => prev.includes(btn.key) ? prev.filter(x => x !== btn.key) : [btn.key, ...prev])} className={`px-2 py-1 min-w-[44px] rounded border text-[10px] md:text-xs font-black transition-all ${sortCriteria.includes(btn.key) ? 'bg-blue-600 border-blue-400 text-white' : 'bg-[#1a1a2e] border-[#3a3a5e] text-gray-400'}`}>
                {btn.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-auto font-black text-[10px] text-gray-300">
            <select className="bg-[#1a1a2e] border border-blue-500/50 rounded px-1.5 py-1 text-blue-400 outline-none appearance-none" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              {branches.map(b => <option key={b} value={b} className="bg-[#121212]">{b}</option>)}
            </select>
            <span className="whitespace-nowrap">선택 {selectedIds.size} | 표시 {displayMembers.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-auto bg-[#1a1a2e] rounded-lg border border-[#3a3a5e]">
        <table className="w-full text-left table-fixed min-w-[500px] md:min-w-[900px]">
          <thead className="sticky top-0 z-10 bg-[#2c2c2e] text-blue-400 font-black text-[11px] border-b border-[#3a3a5e]">
            <tr>
              <th className="p-1 w-7 text-center"><input type="checkbox" checked={displayMembers.length > 0 && selectedIds.size === displayMembers.length} onChange={(e) => setSelectedIds(e.target.checked ? new Set(displayMembers.map(m => m.id)) : new Set())} /></th>
              <th className="p-1 w-6 text-left text-gray-500 font-normal">N</th>
              <th className="p-1 w-6 text-left">지</th>
              <th className="p-1 w-16 text-left">이름</th>
              <th className="p-1 w-[88px] text-left">연락처</th>
              <th className="p-1 text-left text-gray-400">주소</th>
              <th className="p-1 w-7 text-right text-emerald-400">차</th>
              <th className="p-1 w-7 text-right">비</th>
              <th className="p-1 w-7 text-right">출</th>
              <th className="p-1 w-7 text-right">가</th>
            </tr>
          </thead>
          <tbody className="text-sm font-bold">
            {displayMembers.map((m, idx) => (
              <tr key={m.id} className={`border-b border-[#2c2c2e] hover:bg-white/5 cursor-pointer ${selectedIds.has(m.id) ? 'bg-blue-900/10' : ''}`} onClick={() => { setEditingMember({...m}); setIsModalOpen(true); }}>
                <td className="p-1 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => { const n = new Set(selectedIds); n.has(m.id) ? n.delete(m.id) : n.add(m.id); setSelectedIds(n); }} /></td>
                <td className="p-1 text-left text-gray-600 text-[10px] font-normal">{idx + 1}</td>
                <td className="p-1 text-left text-blue-400 text-[11px] font-black">{getShortBranch(m.branch)}</td>
                <td className="p-1 text-left truncate text-white text-[12px]">{m.name}</td>
                <td className="p-1 text-left text-blue-300 text-[11px] font-mono">{m.phone}</td>
                <td className="p-1 text-left text-gray-400 text-[11px] truncate">{m.address}</td>
                <td className={`p-1 text-right text-[11px] font-black ${getCarColor(m.carNumber)}`} onClick={(e) => { e.stopPropagation(); handleCarClick(m); }}>{m.carNumber || '-'}</td>
                <td className="p-0 text-right" onClick={(e) => { e.stopPropagation(); setMembers(prev => prev.map(x => x.id === m.id ? {...x, fee: !x.fee} : x)); }}><Check className={`w-4 h-4 ml-auto ${m.fee ? 'text-yellow-400' : 'text-gray-800'}`} /></td>
                <td className="p-0 text-right" onClick={(e) => { e.stopPropagation(); setMembers(prev => prev.map(x => x.id === m.id ? {...x, attendance: !x.attendance} : x)); }}><Check className={`w-4 h-4 ml-auto ${m.attendance ? 'text-green-500' : 'text-gray-800'}`} /></td>
                <td className="p-0 text-right" onClick={(e) => { e.stopPropagation(); let j = String(m.joined || ''); j = j.includes(currentYear) ? "" : currentYear; setMembers(prev => prev.map(x => x.id === m.id ? {...x, joined: j} : x)); }}><Check className={`w-4 h-4 ml-auto ${String(m.joined || '').includes(currentYear) ? 'text-purple-500' : 'text-gray-800'}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MessageModal 
        isOpen={isMessageModalOpen} 
        onClose={() => setIsMessageModalOpen(false)}
        targets={selectedIds.size > 0 ? members.filter(m => selectedIds.has(m.id)) : displayMembers}
      />

      {isModalOpen && editingMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-[#1a1a2e] rounded-[2rem] p-8 border border-white/10 relative">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-white">{editingMember.sn === 0 ? '새 회원 등록' : '정보 수정'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] text-blue-400 font-black ml-1 uppercase">Branch</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white outline-none" value={editingMember.branch} onChange={(e) => setEditingMember({...editingMember, branch: e.target.value})}>
                    {branches.filter(b => b !== '전체').map(b => <option key={b} value={b} className="bg-[#1a1a2e]">{b}</option>)}
                  </select>
                </div>
                <div className="flex-[2] space-y-1.5">
                  <label className="text-[10px] text-blue-400 font-black ml-1 uppercase">Address</label>
                  <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white outline-none" value={editingMember.address} onChange={(e) => setEditingMember({...editingMember, address: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] text-blue-400 font-black ml-1 uppercase">Name</label>
                  <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white outline-none" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} />
                </div>
                <div className="flex-[2] space-y-1.5">
                  <label className="text-[10px] text-blue-400 font-black ml-1 uppercase">Phone</label>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white">
                    <span className="font-black text-gray-500 text-sm">010</span>
                    <input ref={phoneMidRef} type="tel" className="w-full bg-transparent font-black text-center outline-none" value={(editingMember.phone || '').split('-')[1] || ''} onChange={(e) => { const v = e.target.value.replace(/\D/g,'').slice(0,4); const p = (editingMember.phone || '010--').split('-'); setEditingMember({...editingMember, phone: `010-${v}-${p[2]||''}`}); if(v.length===4) phoneEndRef.current?.focus(); }} maxLength={4} />
                    <input ref={phoneEndRef} type="tel" className="w-full bg-transparent font-black text-center outline-none" value={(editingMember.phone || '').split('-')[2] || ''} onChange={(e) => { const v = e.target.value.replace(/\D/g,'').slice(0,4); const p = (editingMember.phone || '010--').split('-'); setEditingMember({...editingMember, phone: `010-${p[1]||''}-${v}`}); }} maxLength={4} />
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-[1.25rem] font-black border border-white/5">취소</button>
                <button onClick={handleModalSave} className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.25rem] font-black shadow-lg">저장하기</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberView;