import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  UserPlus, FileDown, FileUp, Image as ImageIcon, Trash2, Edit2, Check, 
  Loader2, Filter, Eraser, SendHorizontal, Users, CheckCircle2 
} from 'lucide-react';
import { format } from 'date-fns';
import { Member } from '../../types';
import { exportToExcel, readExcel } from '../../services/excelService';
import { extractMembersFromImage } from '../../services/geminiService';

interface MemberViewProps {
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  onHome: () => void;
}

const MemberView: React.FC<MemberViewProps> = ({ members, setMembers, onHome }) => {
  const [memberTitle, setMemberTitle] = useState('회원관리 목록');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [sortCriteria, setSortCriteria] = useState<string[]>(['name']);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (members.length > 0 && !members[0].name) {
      nameInputRef.current?.focus();
    }
  }, [members.length > 0 ? members[0].id : null]);

  const handleSortToggle = (key: string) => {
    setSortCriteria(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      return [key, ...prev];
    });
  };

  const sortedMembers = useMemo(() => {
    if (sortCriteria.length === 0) return members;
    return [...members].sort((a, b) => {
      for (const key of sortCriteria) {
        if (key === 'name') {
          const res = a.name.localeCompare(b.name, 'ko');
          if (res !== 0) return res;
        } else {
          const valA = a[key as keyof Member] ? 1 : 0;
          const valB = b[key as keyof Member] ? 1 : 0;
          if (valA !== valB) return valB - valA;
        }
      }
      return a.sn - b.sn;
    });
  }, [members, sortCriteria]);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let res = '';
    const cleanDigits = digits.length === 8 ? '010' + digits : (digits.startsWith('010') ? digits : '010' + digits);
    if (cleanDigits.length <= 3) res = cleanDigits;
    else if (cleanDigits.length <= 7) res = `${cleanDigits.slice(0, 3)}-${cleanDigits.slice(3)}`;
    else res = `${cleanDigits.slice(0, 3)}-${cleanDigits.slice(3, 7)}-${cleanDigits.slice(7, 11)}`;
    return res;
  };

  const handleExport = () => {
    const now = new Date();
    const fileName = window.prompt("엑셀 저장 파일명", `${memberTitle}_${format(now, 'yyyy_MM')}`);
    if (fileName) {
      const validMembers = sortedMembers.filter(m => m.name && m.name.trim() !== '');
      if (validMembers.length === 0) {
        alert("저장할 유효한 회원 데이터가 없습니다.");
        return;
      }
      const exportData = validMembers.map(m => ({
        '성명': m.name, '전화번호': m.phone, '주소': m.address,
        '회비': m.fee ? 'O' : 'X', '출석': m.attendance ? 'O' : 'X', '가입': m.joined ? 'O' : 'X'
      }));
      exportToExcel(exportData, fileName);
    }
  };

  const processImportedData = (newData: any[], mode: 'append' | 'overwrite') => {
    const formattedData: Member[] = newData.map((d) => ({
      id: crypto.randomUUID(), sn: 0,
      name: d['성명'] || d.name || '',
      phone: formatPhoneNumber(String(d['전화번호'] || d['전화'] || d.phone || '')),
      address: d['주소'] || d.address || '',
      fee: d['회비'] === 'O' || Boolean(d.fee),
      attendance: d['출석'] === 'O' || Boolean(d.attendance),
      joined: d['가입'] === 'O' || Boolean(d.joined)
    }));
    if (mode === 'overwrite') {
      setMembers(formattedData.map((m, idx) => ({ ...m, sn: idx + 1 })));
    } else {
      const currentPhones = new Set(members.map(m => m.phone));
      const nonDuplicates = formattedData.filter(m => !currentPhones.has(m.phone));
      setMembers([...members, ...nonDuplicates].map((m, idx) => ({ ...m, sn: idx + 1 })));
    }
  };

  const addMember = () => {
    if (members.length > 0 && !members[0].name.trim()) {
      alert("추가된 행의 성명을 먼저 입력해 주세요.");
      nameInputRef.current?.focus();
      return;
    }
    setSortCriteria([]);
    const newMember: Member = { 
      id: crypto.randomUUID(), sn: 0, name: '', phone: '010-', address: '', 
      fee: false, attendance: false, joined: false 
    };
    setMembers([newMember, ...members].map((m, idx) => ({ ...m, sn: idx + 1 })));
    setEditingId(newMember.id);
  };

  const handleClearAll = () => {
    if (window.confirm("현재 명단 목록을 모두 삭제하고 초기화하시겠습니까?")) {
      setMembers([]);
      setSelectedIds(new Set());
      setEditingId(null);
    }
  };

  const handleSendSMS = () => {
    if (selectedIds.size === 0) {
      alert("문자를 발송할 회원을 먼저 선택해 주세요.");
      return;
    }
    alert(`${selectedIds.size}명에게 단체 문자 발송을 시작합니다.`);
  };

  const updateMember = (id: string, field: keyof Member, value: any) => {
    setMembers(members.map(m => m.id === id ? { ...m, [field]: field === 'phone' ? formatPhoneNumber(value) : value } : m));
  };

  const deleteMember = (id: string) => {
    if (window.confirm("삭제하시겠습니까?")) {
      setMembers(members.filter(m => m.id !== id).map((m, idx) => ({ ...m, sn: idx + 1 })));
      if (editingId === id) setEditingId(null);
    }
  };

  const toggleAll = () => {
    if (selectedIds.size === members.length && members.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(members.map(m => m.id)));
  };

  const sortButtons = [
    { label: '이름순', key: 'name' },
    { label: '가입순', key: 'joined' },
    { label: '회비순', key: 'fee' },
    { label: '출결순', key: 'attendance' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#121212] p-4 md:p-6 pt-2 text-gray-200">
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center backdrop-blur-lg">
          <Loader2 className="w-20 h-20 text-blue-500 animate-spin mb-4" />
          <p className="text-3xl font-black text-white">AI 데이터 추출 중...</p>
        </div>
      )}

      {/* 2단 고정 타이틀바 영역 */}
      <div className="flex flex-col w-full gap-4 mb-4">
        
        {/* 첫째줄: 타이틀(좌) + 아이콘 5개(우) */}
        <div className="flex items-center justify-between w-full h-12">
          <div className="flex-1 flex justify-start overflow-hidden">
            {isEditingTitle ? (
              <input 
                autoFocus 
                className="bg-[#2c2c2e] border-2 border-blue-500 rounded-lg px-4 py-1 text-xl md:text-3xl font-black text-white outline-none w-full max-w-md" 
                value={memberTitle} 
                onChange={(e) => setMemberTitle(e.target.value)} 
                onBlur={() => setIsEditingTitle(false)} 
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)} 
              />
            ) : (
              <h2 className="text-xl md:text-3xl font-black text-white cursor-pointer hover:text-blue-400 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => setIsEditingTitle(true)}>
                {memberTitle}
              </h2>
            )}
          </div>

          {/* 달력 모듈 아이콘 크기(w-5)에 맞춘 버튼 그룹 */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex bg-[#1a1a2e] p-1 rounded-xl border border-[#3a3a5e] shadow-xl">
              <button onClick={handleClearAll} className="p-1.5 hover:bg-[#2c2c2e] rounded-lg transition-all text-red-500" title="목록 초기화"><Eraser className="w-5 h-5" /></button>
              <button onClick={addMember} className="p-1.5 hover:bg-[#2c2c2e] rounded-lg transition-all text-blue-500" title="회원추가"><UserPlus className="w-5 h-5" /></button>
              <button onClick={handleExport} className="p-1.5 hover:bg-[#2c2c2e] rounded-lg transition-all text-emerald-400" title="엑셀저장"><FileDown className="w-5 h-5" /></button>
              <label className="p-1.5 hover:bg-[#2c2c2e] rounded-lg transition-all text-emerald-500 cursor-pointer" title="엑셀업로드">
                <FileUp className="w-5 h-5" />
                <input type="file" className="hidden" accept=".xlsx,.xls" onChange={(e) => { const mode = window.confirm("합치기(확인) / 덮어쓰기(취소)") ? 'append' : 'overwrite'; readExcel(e.target.files![0]).then(d => processImportedData(d, mode)); e.target.value=''; }} />
              </label>
              <label className="p-1.5 hover:bg-[#2c2c2e] rounded-lg transition-all text-blue-400 cursor-pointer" title="이미지읽기">
                <ImageIcon className="w-5 h-5" />
                <input type="file" className="hidden" accept="image/*" ref={fileInputRef} onChange={(e) => { const file = e.target.files![0]; if(!file) return; const mode = window.confirm("합치기(확인) / 덮어쓰기(취소)") ? 'append' : 'overwrite'; setIsLoading(true); const reader = new FileReader(); reader.onload = async (ev) => { const base64 = (ev.target?.result as string).split(',')[1]; try { const ext = await extractMembersFromImage(base64, file.type); processImportedData(ext, mode); } catch { alert("에러"); } finally { setIsLoading(false); } }; reader.readAsDataURL(file); e.target.value=''; }} />
              </label>
            </div>
          </div>
        </div>

        {/* 둘째줄: 소트버튼(좌) + 문자/인원현황(우) */}
        <div className="flex items-center justify-between w-full h-14 border-t border-[#3a3a5e]/30 pt-3">
          
          {/* 좌측: 소트버튼 (세로쓰기, 폭 50%, 여백 0) */}
          <div className="flex items-center h-full bg-[#1a1a2e] rounded-lg border border-[#3a3a5e] overflow-hidden">
            {sortButtons.map((btn) => (
              <button
                key={btn.key}
                onClick={() => handleSortToggle(btn.key)}
                className={`h-full px-2.5 border-r last:border-r-0 border-[#3a3a5e] transition-all flex items-center justify-center
                  ${sortCriteria.includes(btn.key) ? 'bg-blue-600 text-white' : 'hover:bg-[#2c2c2e] text-gray-400'}`}
              >
                <span className="text-[10px] md:text-xs font-black leading-none" style={{ writingMode: 'vertical-rl' }}>
                  {btn.label}
                </span>
              </button>
            ))}
          </div>

          {/* 우측: 문자발송 및 인원현황 */}
          <div className="flex items-center gap-4">
            <button 
              onClick={handleSendSMS}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-600/20 border border-orange-500/50 hover:bg-orange-600 rounded-xl text-orange-400 hover:text-white font-black text-xs md:text-sm transition-all"
            >
              <SendHorizontal className="w-4 h-4" />
              <span>문자발송</span>
            </button>
            <div className="flex flex-col items-end font-black tracking-tighter leading-tight border-l border-gray-800 pl-4">
              <span className="text-blue-400 text-sm md:text-base">선택 {selectedIds.size}</span>
              <span className="text-gray-500 text-[10px] md:text-xs">전체 {members.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 테이블 영역 */}
      <div className="flex-grow overflow-auto bg-[#1a1a2e] rounded-2xl border border-[#3a3a5e]">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead className="sticky top-0 bg-[#2c2c2e] text-blue-400 font-black text-lg z-10">
            <tr>
              <th className="p-4 w-16 text-center"><input type="checkbox" className="w-6 h-6 accent-blue-500 cursor-pointer" checked={selectedIds.size === members.length && members.length > 0} onChange={toggleAll} /></th>
              <th className="p-4 w-16">No.</th>
              <th className="p-4 w-40">성명</th>
              <th className="p-4 w-48">전화번호</th>
              <th className="p-4">주소</th>
              <th className="p-4 w-24 text-center">회비</th>
              <th className="p-4 w-24 text-center">출석</th>
              <th className="p-4 w-24 text-center">가입</th>
              <th className="p-4 w-32 text-center">작업</th>
            </tr>
          </thead>
          <tbody className="text-base font-bold">
            {sortedMembers.map((m, index) => {
              const isEditing = editingId === m.id;
              return (
                <tr key={m.id} className={`hover:bg-[#252545] border-b border-[#2c2c2e] ${selectedIds.has(m.id) ? 'bg-blue-900/10' : ''}`}>
                  <td className="p-3 text-center"><input type="checkbox" className="w-5 h-5 accent-blue-500 cursor-pointer" checked={selectedIds.has(m.id)} onChange={() => { const next = new Set(selectedIds); if (next.has(m.id)) next.delete(m.id); else next.add(m.id); setSelectedIds(next); }} /></td>
                  <td className="p-3 font-bold text-gray-500">{m.sn}</td>
                  <td className="p-3">
                    {isEditing ? (
                      <input ref={index === 0 ? nameInputRef : null} className="bg-[#2c2c2e] text-white w-full font-black outline-none border-b-2 border-blue-500 px-1" value={m.name} onChange={(e) => updateMember(m.id, 'name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)} />
                    ) : (
                      <span className="font-black text-white px-1">{m.name}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {isEditing ? (
                      <input className="bg-[#2c2c2e] text-blue-300 w-full outline-none border-b-2 border-blue-500 px-1" value={m.phone} onChange={(e) => updateMember(m.id, 'phone', e.target.value)} maxLength={13} />
                    ) : (
                      <span className="text-blue-300 px-1">{m.phone}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {isEditing ? (
                      <input className="bg-[#2c2c2e] text-gray-400 w-full outline-none border-b-2 border-blue-500 px-1" value={m.address} onChange={(e) => updateMember(m.id, 'address', e.target.value)} />
                    ) : (
                      <span className="text-gray-400 px-1">{m.address}</span>
                    )}
                  </td>
                  <td className="p-3 text-center"><button onClick={() => updateMember(m.id, 'fee', !m.fee)} className={`p-2 rounded-xl transition-colors ${m.fee ? 'bg-emerald-600' : 'bg-gray-800 text-gray-600'}`}><Check className="w-5 h-5 font-black" /></button></td>
                  <td className="p-3 text-center"><button onClick={() => updateMember(m.id, 'attendance', !m.attendance)} className={`p-2 rounded-xl transition-colors ${m.attendance ? 'bg-blue-600' : 'bg-gray-800 text-gray-600'}`}><Check className="w-5 h-5 font-black" /></button></td>
                  <td className="p-3 text-center"><button onClick={() => updateMember(m.id, 'joined', !m.joined)} className={`p-2 rounded-xl transition-colors ${m.joined ? 'bg-indigo-600' : 'bg-gray-800 text-gray-600'}`}><Check className="w-5 h-5 font-black" /></button></td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center space-x-2">
                      <button onClick={() => setEditingId(isEditing ? null : m.id)} className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-blue-600 text-white' : 'bg-[#2c2c2e] text-blue-400 hover:bg-blue-900/30'}`}>
                        {isEditing ? <Check className="w-5 h-5"/> : <Edit2 className="w-5 h-5"/>}
                      </button>
                      <button onClick={() => deleteMember(m.id)} className="p-2 bg-[#2c2c2e] text-red-500 rounded-lg hover:bg-red-900/30 transition-colors"><Trash2 className="w-5 h-5"/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MemberView;