import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  UserPlus, FileDown, FileUp, Image as ImageIcon, Trash2, Edit2, Check, 
  Loader2, Eraser, SendHorizontal, Users, CheckCircle2 
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
    { label: '이름', key: 'name' },
    { label: '가입', key: 'joined' },
    { label: '회비', key: 'fee' },
    { label: '출결', key: 'attendance' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#121212] p-2 md:p-6 pt-2 text-gray-200">
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center backdrop-blur-lg">
          <Loader2 className="w-20 h-20 text-blue-500 animate-spin mb-4" />
          <p className="text-3xl font-black text-white">AI 데이터 추출 중...</p>
        </div>
      )}

      {/* 2단 고정 타이틀바 */}
      <div className="flex flex-col w-full gap-3 mb-3">
        {/* 1단: 타이틀 + 관리 아이콘 */}
        <div className="flex items-center justify-between w-full h-10">
          <div className="flex-1 overflow-hidden">
            {isEditingTitle ? (
              <input autoFocus className="bg-[#2c2c2e] border border-blue-500 rounded px-2 py-1 text-lg font-black text-white outline-none w-full" value={memberTitle} onChange={(e) => setMemberTitle(e.target.value)} onBlur={() => setIsEditingTitle(false)} onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)} />
            ) : (
              <h2 className="text-xl md:text-3xl font-black text-white cursor-pointer tracking-tight truncate" onClick={() => setIsEditingTitle(true)}>{memberTitle}</h2>
            )}
          </div>
          <div className="flex bg-[#1a1a2e] p-1 rounded-xl border border-[#3a3a5e] shadow-xl shrink-0">
            <button onClick={handleClearAll} className="p-1.5 text-red-500"><Eraser className="w-5 h-5" /></button>
            <button onClick={addMember} className="p-1.5 text-blue-500"><UserPlus className="w-5 h-5" /></button>
            <button onClick={handleExport} className="p-1.5 text-emerald-400"><FileDown className="w-5 h-5" /></button>
            <label className="p-1.5 text-emerald-500 cursor-pointer"><FileUp className="w-5 h-5" /><input type="file" className="hidden" accept=".xlsx,.xls" onChange={(e) => { const mode = window.confirm("합치기(확인) / 덮어쓰기(취소)") ? 'append' : 'overwrite'; readExcel(e.target.files![0]).then(d => processImportedData(d, mode)); e.target.value=''; }} /></label>
            <label className="p-1.5 text-blue-400 cursor-pointer"><ImageIcon className="w-5 h-5" /><input type="file" className="hidden" accept="image/*" ref={fileInputRef} onChange={(e) => { const file = e.target.files![0]; if(!file) return; const mode = window.confirm("합치기(확인) / 덮어쓰기(취소)") ? 'append' : 'overwrite'; setIsLoading(true); const reader = new FileReader(); reader.onload = async (ev) => { const base64 = (ev.target?.result as string).split(',')[1]; try { const ext = await extractMembersFromImage(base64, file.type); processImportedData(ext, mode); } catch { alert("에러"); } finally { setIsLoading(false); } }; reader.readAsDataURL(file); e.target.value=''; }} /></label>
          </div>
        </div>

        {/* 2단: 소트버튼(정사각형) + 문자/인원 */}
        <div className="flex items-center justify-between w-full border-t border-[#3a3a5e]/30 pt-2">
          <div className="flex gap-1">
            {sortButtons.map(btn => (
              <button
                key={btn.key}
                onClick={() => handleSortToggle(btn.key)}
                className={`w-9 h-9 md:w-12 md:h-12 flex items-center justify-center rounded-lg border text-[10px] md:text-xs font-black transition-all
                  ${sortCriteria.includes(btn.key) ? 'bg-blue-600 border-blue-400 text-white' : 'bg-[#1a1a2e] border-[#3a3a5e] text-gray-400'}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSendSMS} className="p-2 bg-orange-600/20 border border-orange-500/50 rounded-lg text-orange-400 text-[10px] md:text-xs font-black"><SendHorizontal className="w-4 h-4 mx-auto mb-0.5" />문자</button>
            <div className="text-right leading-none shrink-0 font-black">
              <div className="text-blue-400 text-[10px] md:text-sm">선택 {selectedIds.size}</div>
              <div className="text-gray-600 text-[8px] md:text-xs">전체 {members.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 회원 목록 테이블 (휴대폰 콤팩트 최적화) */}
      <div className="flex-grow overflow-auto bg-[#1a1a2e] rounded-xl border border-[#3a3a5e]">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="sticky top-0 bg-[#2c2c2e] text-blue-400 font-black text-[10px] md:text-sm z-10">
            <tr>
              <th className="p-1 w-8 text-center"><input type="checkbox" className="w-4 h-4 accent-blue-500" checked={selectedIds.size === members.length && members.length > 0} onChange={toggleAll} /></th>
              <th className="p-1 w-[15%] md:w-20">성명</th>
              <th className="p-1 w-[25%] md:w-32">전화번호</th>
              <th className="p-1 w-[20%] md:w-auto">주소</th>
              <th className="p-1 w-7 text-center">회</th>
              <th className="p-1 w-7 text-center">출</th>
              <th className="p-1 w-7 text-center">가</th>
              <th className="p-1 w-16 text-center">작업</th>
            </tr>
          </thead>
          <tbody className="text-[11px] md:text-sm font-bold">
            {sortedMembers.map((m, index) => {
              const isEditing = editingId === m.id;
              return (
                <tr key={m.id} className={`border-b border-[#2c2c2e] ${selectedIds.has(m.id) ? 'bg-blue-900/10' : ''}`}>
                  <td className="p-1 text-center"><input type="checkbox" className="w-4 h-4 accent-blue-500" checked={selectedIds.has(m.id)} onChange={() => { const next = new Set(selectedIds); if (next.has(m.id)) next.delete(m.id); else next.add(m.id); setSelectedIds(next); }} /></td>
                  <td className="p-1 truncate">
                    {isEditing ? (
                      <input ref={index === 0 ? nameInputRef : null} className="bg-[#2c2c2e] text-white w-full outline-none border-b border-blue-500" value={m.name} onChange={(e) => updateMember(m.id, 'name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)} />
                    ) : (
                      <span className="text-white">{m.name}</span>
                    )}
                  </td>
                  <td className="p-1 truncate text-blue-300">
                    {isEditing ? (
                      <input className="bg-[#2c2c2e] w-full outline-none border-b border-blue-500" value={m.phone} onChange={(e) => updateMember(m.id, 'phone', e.target.value)} maxLength={13} />
                    ) : (
                      m.phone
                    )}
                  </td>
                  <td className="p-1 truncate text-gray-500">
                    {isEditing ? (
                      <input className="bg-[#2c2c2e] w-full outline-none border-b border-blue-500" value={m.address} onChange={(e) => updateMember(m.id, 'address', e.target.value)} />
                    ) : (
                      m.address
                    )}
                  </td>
                  <td className="p-0 text-center"><button onClick={() => updateMember(m.id, 'fee', !m.fee)} className={`p-1 rounded ${m.fee ? 'text-emerald-500' : 'text-gray-800'}`}><Check className="w-4 h-4" /></button></td>
                  <td className="p-0 text-center"><button onClick={() => updateMember(m.id, 'attendance', !m.attendance)} className={`p-1 rounded ${m.attendance ? 'text-blue-500' : 'text-gray-800'}`}><Check className="w-4 h-4" /></button></td>
                  <td className="p-0 text-center"><button onClick={() => updateMember(m.id, 'joined', !m.joined)} className={`p-1 rounded ${m.joined ? 'text-indigo-500' : 'text-gray-800'}`}><Check className="w-4 h-4" /></button></td>
                  <td className="p-1 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => setEditingId(isEditing ? null : m.id)} className="text-blue-400">{isEditing ? <Check className="w-4 h-4"/> : <Edit2 className="w-4 h-4"/>}</button>
                      <button onClick={() => deleteMember(m.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button>
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