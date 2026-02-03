import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  UserPlus, Check, Eraser, X, Save, CloudDownload, CloudUpload, MessageSquare, Loader2, Database, Lock 
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
  // --- [보안/인증 상태] ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginBranch, setLoginBranch] = useState(''); 
  const [isMaster, setIsMaster] = useState(false);
  const [inputPw, setInputPw] = useState('');
  const [selectedLoginBranch, setSelectedLoginBranch] = useState('본점');

  // --- [기존 상태 유지] ---
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

  const phoneMidRef = useRef<HTMLInputElement>(null);
  const phoneEndRef = useRef<HTMLInputElement>(null);

  const currentYear = "26";
  const branches = ['본점', '제일', '신촌', '교대', '작전', '효성', '부평', '갈산'];
  const allBranches = ['전체', ...branches];

  // --- [보안 로직] ---
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: selectedLoginBranch, password: inputPw })
      });
      const data = await res.json();
      if (data.success) {
        setIsLoggedIn(true);
        setIsMaster(data.isMaster);
        setLoginBranch(selectedLoginBranch);
        if (!data.isMaster) setSelectedBranch(selectedLoginBranch);
        fetchMembersFromDb(data.isMaster ? '전체' : selectedLoginBranch);
      } else { alert("비밀번호가 틀렸습니다."); }
    } catch (err) { alert("로그인 서버 에러"); }
    finally { setIsLoading(false); }
  };

  const fetchMembersFromDb = async (targetBranch: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/db/members?branch=${encodeURIComponent(targetBranch)}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) { console.error("데이터 로드 실패"); }
    finally { setIsLoading(false); }
  };

  const saveMembersToDb = async () => {
    const targetBranch = isMaster ? '전체' : loginBranch;
    if (!window.confirm(`${targetBranch} 데이터를 서버 DB에 저장하시겠습니까?`)) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: targetBranch, members })
      });
      if (res.ok) alert("DB 저장 완료!");
      else alert("저장 실패");
    } catch (err) { alert("통신 에러"); }
    finally { setIsLoading(false); }
  };

  // --- [기존 기능 로직 보존] ---
  const generateId = () => Math.random().toString(36).substring(2, 11);
  const getShortBranch = (branch: string) => branch === '전체' ? '전' : branch.charAt(0);
  const getCarColor = (num: string) => {
    switch (num) {
      case '1': return 'text-red-500'; case '2': return 'text-orange-500'; case '3': return 'text-yellow-400';
      case '4': return 'text-cyan-400'; case '5': return 'text-blue-500'; case '6': return 'text-purple-500';
      default: return 'text-gray-600';
    }
  };

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

  const handleDbDownload = () => {
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

  const handleDbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        setMembers(json.map((d: any) => ({
          id: generateId(), sn: Number(d.id || 0), branch: d.branch || '본점', name: d.name || '',
          position: d.position || '회원', phone: d.phone || '', address: d.addr || '',
          joined: d.join_year || '', fee: d.fee === "1", attendance: d.attendance === "1",
          carNumber: d.car_num || '', memo: d.note || ''
        })));
      } catch (err) { alert("파일 파싱 실패"); }
    };
    reader.readAsText(file);
  };

  const displayMembers = useMemo(() => {
    let filtered = selectedBranch === '전체' ? members : members.filter(m => m.branch === selectedBranch);
    return [...filtered].sort((a, b) => {
      for (const key of sortCriteria) {
        if (key === 'name' || key === 'branch') {
          const res = String(a[key as keyof Member] || '').localeCompare(String(b[key as keyof Member] || ''), 'ko');
          if (res !== 0) return res;
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

  // --- [렌더링: 로그인 화면] ---
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-full bg-[#121212] p-6">
        <div className="w-full max-w-sm bg-[#1a1a2e] rounded-3xl p-8 border border-white/10 shadow-2xl">
          <div className="flex justify-center mb-6 text-blue-500"><Lock className="w-12 h-12" /></div>
          <h2 className="text-xl font-black text-white text-center mb-8">지점 로그인</h2>
          <div className="space-y-4">
            <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none" value={selectedLoginBranch} onChange={(e) => setSelectedLoginBranch(e.target.value)}>
              <option value="마스터" className="bg-[#1a1a2e]">마스터(전체관리)</option>
              {branches.map(b => <option key={b} value={b} className="bg-[#1a1a2e]">{b}</option>)}
            </select>
            <input type="password" placeholder="비밀번호 입력" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500 text-center" value={inputPw} onChange={(e) => setInputPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
            <button onClick={handleLogin} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black transition-all">접속하기</button>
          </div>
        </div>
      </div>
    );
  }

  // --- [렌더링: 메인 화면] ---
  return (
    <div className="flex flex-col h-full bg-[#121212] p-1 text-gray-200 overflow-hidden font-sans">
      {isLoading && <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10" /></div>}
      
      <div className="flex flex-col w-full mb-1">
        <div className="flex items-center justify-between w-full h-10 px-1">
          <h2 className="text-[1.3rem] font-black text-white truncate">{loginBranch === '마스터' ? memberTitle : `${loginBranch} 모드`}</h2>
          <div className="flex bg-[#1a1a2e] p-0.5 rounded border border-[#3a3a5e] gap-1 shadow-lg shrink-0">
            <button onClick={handleMessageSend} className="p-1 text-orange-400"><MessageSquare className="w-5 h-5" /></button>
            <button onClick={saveMembersToDb} title="DB 저장" className="p-1 text-emerald-400"><Save className="w-5 h-5" /></button>
            <button onClick={() => fetchMembersFromDb(isMaster ? '전체' : loginBranch)} title="DB 로드" className="p-1 text-blue-400"><Database className="w-5 h-5" /></button>
            {isMaster && (
              <>
                <div className="w-px h-3 bg-[#3a3a5e] my-auto mx-0.5" />
                <button onClick={handleDbDownload} title="로컬 백업" className="p-1 text-indigo-400"><CloudDownload className="w-5 h-5" /></button>
                <label className="p-1 text-indigo-500 cursor-pointer">
                  <CloudUpload className="w-5 h-5" />
                  <input type="file" className="hidden" onChange={handleDbUpload} />
                </label>
              </>
            )}
            <div className="w-px h-3 bg-[#3a3a5e] my-auto mx-0.5" />
            <button onClick={() => setIsLoggedIn(false)} title="로그아웃" className="p-1 text-red-400"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex items-center justify-between w-full border-t border-[#3a3a5e]/20 pt-1">
          <div className="flex gap-0.5 overflow-x-auto no-scrollbar pr-2">
            {[{label:'지점', key:'branch'}, {label:'이름', key:'name'}].map(btn => (
              <button key={btn.key} onClick={() => setSortCriteria(prev => prev.includes(btn.key) ? prev.filter(x => x !== btn.key) : [btn.key, ...prev])} className={`px-2 py-0.5 rounded border text-[12px] font-black ${sortCriteria.includes(btn.key) ? 'bg-blue-600 border-blue-400 text-white' : 'bg-[#1a1a2e] border-[#3a3a5e] text-gray-400'}`}>
                {btn.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-auto font-black text-[11px] text-gray-300">
            {isMaster ? (
              <select className="bg-[#1a1a2e] border border-blue-500/50 rounded px-1 py-0.5 text-blue-400" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                {allBranches.map(b => <option key={b} value={b} className="bg-[#121212]">{b}</option>)}
              </select>
            ) : <span className="text-blue-400 px-2">{loginBranch} 필터 적용됨</span>}
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-auto bg-[#1a1a2e] rounded border border-[#3a3a5e]">
        <table className="w-full text-left table-fixed">
          <thead className="sticky top-0 z-10 bg-[#2c2c2e] text-blue-400 font-black text-[12px] border-b border-[#3a3a5e]">
            <tr>
              <th className="p-1 w-6 text-center"><input type="checkbox" checked={selectedIds.size === displayMembers.length} onChange={(e) => setSelectedIds(e.target.checked ? new Set(displayMembers.map(m => m.id)) : new Set())} /></th>
              <th className="p-1 w-12 text-left">지점</th>
              <th className="p-1 w-[60px] text-left">이름</th>
              <th className="p-1 text-left">연락처</th>
              <th className="p-1 w-8 text-right">차</th>
              <th className="p-1 w-8 text-right">비</th>
            </tr>
          </thead>
          <tbody className="text-[12px] font-bold">
            {displayMembers.map((m) => (
              <tr key={m.id} className="border-b border-[#2c2c2e] hover:bg-white/5 cursor-pointer" onClick={() => { setEditingMember({...m}); setIsModalOpen(true); }}>
                <td className="p-1 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => { const n = new Set(selectedIds); n.has(m.id) ? n.delete(m.id) : n.add(m.id); setSelectedIds(n); }} /></td>
                <td className="p-1 text-blue-400 font-black truncate">{getShortBranch(m.branch)}</td>
                <td className="p-1 text-white truncate">{m.name}</td>
                <td className="p-1 text-blue-300 font-mono tracking-tighter">{m.phone}</td>
                <td className={`p-1 text-right font-black ${getCarColor(m.carNumber)}`} onClick={(e) => { e.stopPropagation(); handleCarClick(m); }}>{m.carNumber || '-'}</td>
                <td className="p-1 text-right" onClick={(e) => { e.stopPropagation(); setMembers(prev => prev.map(x => x.id === m.id ? {...x, fee: !x.fee} : x)); }}>
                  <Check className={`w-4 h-4 ml-auto ${m.fee ? 'text-yellow-400' : 'text-gray-800'}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MessageModal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} targets={selectedIds.size > 0 ? members.filter(m => selectedIds.has(m.id)) : displayMembers} />

      {isModalOpen && editingMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg bg-[#1a1a2e] rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-white">회원 정보 수정</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} placeholder="성함" />
              <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold" value={editingMember.address} onChange={(e) => setEditingMember({...editingMember, address: e.target.value})} placeholder="주소" />
              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-white/5 text-white rounded-xl font-black">취소</button>
                <button onClick={handleModalSave} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-black">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberView;