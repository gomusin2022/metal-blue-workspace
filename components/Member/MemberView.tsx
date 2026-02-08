import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  UserPlus, Check, Eraser, X, Save, CloudDownload, CloudUpload, MessageSquare, Database, Share2, Loader2, Lock, ArrowLeftRight
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
  const [isLoading, setIsLoading] = useState(false);

  // --- [신규 상태: 농협 모드 및 보안 관리] ---
  const [isNonghyupMode, setIsNonghyupMode] = useState(false); // 농협 전용 모드 활성화 여부
  const [isAuthenticated, setIsAuthenticated] = useState(false); // 비밀번호 인증 완료 여부
  const [inputPassword, setInputPassword] = useState('');
  const [isDbSaveModalOpen, setIsDbSaveModalOpen] = useState(false);
  const [dbSaveFileName, setDbSaveFileName] = useState('');

  const phoneMidRef = useRef<HTMLInputElement>(null);
  const phoneEndRef = useRef<HTMLInputElement>(null);

  const branches = ['전체', '본점', '제일', '신촌', '교대', '작전', '효성', '부평', '갈산'];

  // 농협 모드 진입 시 비밀번호 확인 (매번 입력 지침 준수)
  const handleNonghyupAuth = async () => {
    setIsLoading(true);
    try {
      // 서버측 auth.ts를 호출하여 '신촌'(농협 예시) 지점 비밀번호와 대조
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: '신촌', password: inputPassword })
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        setSelectedBranch('신촌'); // 농협 모드 시 지점 고정
        setMemberTitle('농협 지점 관리');
      } else {
        alert("비밀번호가 틀렸습니다. 농협 모드에 접근할 수 없습니다.");
      }
    } catch (e) {
      alert("인증 서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
      setInputPassword('');
    }
  };

  // 모드 전환 핸들러
  const toggleMode = () => {
    if (isNonghyupMode) {
      // 농협 -> 범용 전환 시 인증 해제
      setIsNonghyupMode(false);
      setIsAuthenticated(false);
      setMemberTitle('회원관리 목록');
      setSelectedBranch('전체');
    } else {
      // 범용 -> 농협 전환 시 인증 대기 상태로
      setIsNonghyupMode(true);
    }
  };

  // --- [데이터 관리: 저장 및 불러오기 (DB/엑셀 대응)] ---
  const handleConfirmDbDownload = () => {
    if (!dbSaveFileName.trim()) return alert("파일명들을 입력해주세요.");
    const targetMembers = selectedIds.size > 0 ? members.filter(m => selectedIds.has(m.id)) : displayMembers;
    
    // DB 파일 구조로 변환
    const dbData = targetMembers.map(m => ({
      id: m.sn.toString(),
      name: m.name,
      position: m.position,
      phone: m.phone,
      branch: m.branch,
      join_year: m.joined,
      addr: m.address,
      fee: m.fee ? "1" : "",
      car_num: m.carNumber,
      attendance: m.attendance ? "1" : "",
      note: m.memo
    }));

    const blob = new Blob([JSON.stringify(dbData, null, 4)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // 농협 모드일 때는 .db를, 아닐 때는 .json이나 확장자 자유 선택
    link.download = isNonghyupMode ? `${dbSaveFileName}.db` : `${dbSaveFileName}.json`;
    link.click();
    setIsDbSaveModalOpen(false);
  };

  const handleDbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setMembers(json.map((d: any) => ({
          id: Math.random().toString(36).substring(2, 11),
          sn: Number(d.id || 0),
          branch: d.branch || (isNonghyupMode ? '신촌' : '본점'),
          name: d.name || '',
          position: d.position || '회원',
          phone: d.phone || '',
          address: d.addr || '',
          joined: d.join_year || '',
          fee: d.fee === "1",
          attendance: d.attendance === "1",
          carNumber: d.car_num || '',
          memo: d.note || ''
        })));
        alert(`${file.name} 데이터를 불러왔습니다.`);
      } catch (err) {
        alert("파일 형식이 올바르지 않습니다.");
      }
    };
    reader.readAsText(file);
  };

  // --- [기존 헬퍼 로직: 차량 색상, 정렬 등] ---
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
      if (exists) return prev.map(m => m.id === editingMember.id ? editingMember : m);
      return [editingMember, ...prev];
    });
    setIsModalOpen(false);
  };

  // --- [UI 렌더링] ---

  // 농협 모드 인증 화면
  if (isNonghyupMode && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#121212] p-6">
        <div className="w-full max-w-sm bg-[#1a1a2e] rounded-3xl p-8 border border-green-500/30 shadow-2xl text-center">
          <div className="bg-green-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2 font-notoSans">농협 지점 관리</h2>
          <p className="text-gray-400 text-sm mb-8 font-bold">보안을 위해 비밀번호를 입력하세요.</p>
          <input 
            type="password" 
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-black outline-none focus:border-green-500 transition-all text-center text-xl mb-6"
            value={inputPassword}
            onChange={(e) => setInputPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNonghyupAuth()}
            placeholder="비밀번호"
            autoFocus
          />
          <div className="flex gap-3">
            <button onClick={toggleMode} className="flex-1 py-4 bg-white/5 text-gray-400 rounded-2xl font-black">취소</button>
            <button onClick={handleNonghyupAuth} className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-black active:scale-95 transition-all">접속하기</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#121212] p-1 text-gray-200 overflow-hidden font-sans">
      {isLoading && <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}
      
      {/* 헤더 섹션 */}
      <div className="flex flex-col w-full mb-1">
        <div className="flex items-center justify-between w-full h-10 px-0.5">
          <div className="flex items-center gap-2 overflow-hidden">
            <h2 className="text-[1.3rem] font-black text-white truncate">{memberTitle}</h2>
            {/* 농협 모드 스위치 버튼 */}
            <button 
              onClick={toggleMode} 
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black transition-all ${isNonghyupMode ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-500 border border-white/10'}`}
            >
              <ArrowLeftRight className="w-3 h-3" />
              {isNonghyupMode ? '농협모드' : '범용모드'}
            </button>
          </div>

          <div className="flex bg-[#1a1a2e] p-0.5 rounded border border-[#3a3a5e] gap-1 shadow-lg shrink-0">
            <button onClick={() => setIsDbSaveModalOpen(true)} title="로컬 저장" className="p-1 text-indigo-400 hover:bg-white/5 rounded"><CloudDownload className="w-5 h-5" /></button>
            <label className="p-1 text-indigo-500 cursor-pointer hover:bg-indigo-500/10 rounded">
              <CloudUpload className="w-5 h-5" />
              <input type="file" className="hidden" accept=".db,.json" onChange={handleDbUpload} />
            </label>
            <div className="w-px h-3 bg-[#3a3a5e] my-auto mx-0.5" />
            <button onClick={() => setIsMessageModalOpen(true)} className="p-1 text-orange-400 hover:bg-orange-500/10 rounded"><MessageSquare className="w-5 h-5" /></button>
            <button onClick={() => { if(selectedIds.size === 0) return alert("선택된 대상이 없습니다."); if(confirm("삭제하시겠습니까?")) { setMembers(members.filter(m => !selectedIds.has(m.id))); setSelectedIds(new Set()); } }} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><Eraser className="w-5 h-5" /></button>
            <button onClick={() => { setEditingMember({ id: Math.random().toString(36).substring(2, 11), sn: 0, branch: selectedBranch === '전체' ? '본점' : selectedBranch, name: '', position: '회원', phone: '010--', address: '', joined: '', fee: false, attendance: false, carNumber: lastSelectedCar, memo: '' }); setIsModalOpen(true); }} className="p-1 text-blue-500 hover:bg-blue-500/10 rounded"><UserPlus className="w-5 h-5" /></button>
          </div>
        </div>

        {/* 정렬 및 필터 UI */}
        <div className="flex items-center justify-between w-full border-t border-[#3a3a5e]/20 pt-1">
          <div className="flex gap-0.5 overflow-x-auto no-scrollbar pr-2">
            {[{label:'지점', key:'branch'}, {label:'이름', key:'name'}, {label:'차량', key:'carNumber'}, {label:'회비', key:'fee'}, {label:'출결', key:'attendance'}].map(btn => (
              <button key={btn.key} onClick={() => setSortCriteria(prev => prev.includes(btn.key) ? prev.filter(x => x !== btn.key) : [btn.key, ...prev])} className={`px-2 py-0.5 min-w-[36px] rounded border text-[12px] font-black ${sortCriteria.includes(btn.key) ? 'bg-blue-600 border-blue-400 text-white' : 'bg-[#1a1a2e] border-[#3a3a5e] text-gray-400'}`}>
                {btn.label}
              </button>
            ))}
          </div>
          {/* 농협 모드일 때는 지점 선택 고정 (비활성화) */}
          <select 
            disabled={isNonghyupMode}
            className={`bg-[#1a1a2e] border border-blue-500/50 rounded px-1 py-0.5 text-blue-400 outline-none text-[11px] font-black ${isNonghyupMode ? 'opacity-50' : ''}`} 
            value={selectedBranch} 
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            {branches.map(b => <option key={b} value={b} className="bg-[#121212]">{b}</option>)}
          </select>
        </div>
      </div>

      {/* 테이블 영역 (기존 유지) */}
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
            </tr>
          </thead>
          <tbody className="text-[12px] font-bold">
            {displayMembers.map((m, idx) => (
              <tr key={m.id} className={`border-b border-[#2c2c2e] hover:bg-white/5 cursor-pointer ${selectedIds.has(m.id) ? 'bg-blue-900/10' : ''}`} onClick={() => { setEditingMember({...m}); setIsModalOpen(true); }}>
                <td className="p-0.5 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => { const n = new Set(selectedIds); n.has(m.id) ? n.delete(m.id) : n.add(m.id); setSelectedIds(n); }} /></td>
                <td className="p-0.5 text-left text-gray-600 text-[10px] font-normal">{idx + 1}</td>
                <td className="p-0.5 text-left text-blue-400 font-black">{m.branch.charAt(0)}</td>
                <td className="p-0.5 text-left truncate text-white">{m.name}</td>
                <td className="p-0.5 text-left text-blue-300 font-mono tracking-tighter">{m.phone}</td>
                <td className="p-0.5 text-left text-gray-400 truncate">{m.address}</td>
                <td className={`p-0.5 text-right font-black ${getCarColor(m.carNumber)}`}>{m.carNumber || '-'}</td>
                <td className="p-0 text-right"><Check className={`w-4 h-4 ml-auto ${m.fee ? 'text-yellow-400' : 'text-gray-800'}`} /></td>
                <td className="p-0 text-right"><Check className={`w-4 h-4 ml-auto ${m.attendance ? 'text-green-500' : 'text-gray-800'}`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모달: DB 저장 (확장자 가이드 포함) */}
      {isDbSaveModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#1a1a2e] rounded-3xl p-6 border border-indigo-500/40 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-2">로컬 저장</h3>
            <p className="text-indigo-400 text-xs mb-4 font-bold">{isNonghyupMode ? ".db 파일로 저장됩니다 (농협용)" : ".json 파일로 저장됩니다 (범용)"}</p>
            <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-black outline-none mb-4" value={dbSaveFileName} onChange={(e) => setDbSaveFileName(e.target.value)} placeholder="파일명 입력" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setIsDbSaveModalOpen(false)} className="flex-1 py-4 bg-white/5 text-gray-300 rounded-2xl font-black">취소</button>
              <button onClick={handleConfirmDbDownload} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black">저장 완료</button>
            </div>
          </div>
        </div>
      )}

      {/* 회원 수정 모달 (기존 소스 동일) */}
      {isModalOpen && editingMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg bg-[#1a1a2e] rounded-2xl p-6 border border-white/10 relative">
            <div className="flex items-center justify-between mb-6 text-white font-black text-lg">
              <h3>정보 수정</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-blue-400 font-black">BRANCH</label>
                  <select disabled={isNonghyupMode} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-bold outline-none" value={editingMember.branch} onChange={(e) => setEditingMember({...editingMember, branch: e.target.value})}>
                    {branches.filter(b => b !== '전체').map(b => <option key={b} value={b} className="bg-[#1a1a2e]">{b}</option>)}
                  </select>
                </div>
                <div className="flex-[2] space-y-1">
                  <label className="text-[10px] text-blue-400 font-black">NAME</label>
                  <input className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-bold" value={editingMember.name} onChange={(e) => setEditingMember({...editingMember, name: e.target.value})} />
                </div>
              </div>
              <button onClick={handleModalSave} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black mt-4 active:scale-95">저장하기</button>
            </div>
          </div>
        </div>
      )}

      <MessageModal 
        isOpen={isMessageModalOpen} 
        onClose={() => setIsMessageModalOpen(false)} 
        targets={selectedIds.size > 0 ? members.filter(m => selectedIds.has(m.id)) : displayMembers} 
      />
    </div>
  );
};

export default MemberView;