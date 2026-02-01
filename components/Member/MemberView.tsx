import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  UserPlus, FileDown, FileUp, Image as ImageIcon, Trash2, Edit2, Check, 
  Loader2, Eraser, SendHorizontal 
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

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      for (const criterion of sortCriteria) {
        if (criterion === 'name') {
          const res = (a.name || '').localeCompare(b.name || '');
          if (res !== 0) return res;
        } else if (criterion === 'date') {
          const res = (a.joinedDate || '').localeCompare(b.joinedDate || '');
          if (res !== 0) return res;
        }
      }
      return 0;
    });
  }, [members, sortCriteria]);

  const addMember = () => {
    const newMember: Member = {
      id: crypto.randomUUID(),
      name: '',
      joinedDate: format(new Date(), 'yyyy-MM-dd'),
      fee: false,
      attendance: false,
      joined: true
    };
    setMembers([newMember, ...members]);
    setEditingId(newMember.id);
  };

  const updateMember = (id: string, field: keyof Member, value: any) => {
    setMembers(members.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const deleteMember = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setMembers(members.filter(m => m.id !== id));
      selectedIds.delete(id);
      setSelectedIds(new Set(selectedIds));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`${selectedIds.size}명의 회원을 삭제하시겠습니까?`)) {
      setMembers(members.filter(m => !selectedIds.has(m.id)));
      setSelectedIds(new Set());
    }
  };

  const handleImageAnalysis = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const result = await extractMembersFromImage(file);
      if (result && result.members) {
        const newMembers: Member[] = result.members.map((m: any) => ({
          id: crypto.randomUUID(),
          name: m.name,
          joinedDate: m.joinedDate || format(new Date(), 'yyyy-MM-dd'),
          fee: false,
          attendance: false,
          joined: true
        }));
        setMembers([...newMembers, ...members]);
      }
    } catch (error) {
      console.error('이미지 분석 실패:', error);
      alert('이미지 분석 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleExcelExport = () => {
    const dataToExport = sortedMembers.map(m => ({
      이름: m.name,
      가입일: m.joinedDate,
      회비: m.fee ? '납부' : '미납',
      출석: m.attendance ? '출석' : '결석',
      상태: m.joined ? '활동' : '중단'
    }));
    exportToExcel(dataToExport, memberTitle);
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await readExcel(file);
      const importedMembers: Member[] = data.map((item: any) => ({
        id: crypto.randomUUID(),
        name: item.이름 || '',
        joinedDate: item.가입일 || format(new Date(), 'yyyy-MM-dd'),
        fee: item.회비 === '납부',
        attendance: item.출석 === '출석',
        joined: item.상태 === '활동'
      }));
      setMembers([...importedMembers, ...members]);
    } catch (error) {
      alert('엑셀 파일 읽기 실패');
    }
    if (e.target) e.target.value = '';
  };

  return (
    <div className=\"flex flex-col h-full bg-[#121212] text-gray-200\">
      <div className=\"flex flex-col gap-2 p-1.5 md:p-6 mb-1\">
        <div className=\"flex items-center justify-between\">
          <div className=\"flex-1\">
            {isEditingTitle ? (
              <input 
                autoFocus
                className=\"bg-[#2c2c2e] border border-blue-500 rounded px-2 py-1 text-xl font-black text-white outline-none w-full\"
                value={memberTitle}
                onChange={(e) => setMemberTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              />
            ) : (
              <h2 
                className=\"text-xl md:text-2xl font-black text-white cursor-pointer hover:text-blue-400 truncate\"
                onClick={() => setIsEditingTitle(true)}
              >
                {memberTitle}
              </h2>
            )}
          </div>
          
          <div className=\"flex items-center gap-1 md:gap-2 ml-4\">
            <button 
              onClick={addMember}
              className=\"flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg active:scale-95 whitespace-nowrap\"
            >
              <UserPlus className=\"w-4 h-4 md:w-5 h-5\" />
              <span className=\"text-sm md:text-base\">추가</span>
            </button>
            <button 
              onClick={deleteSelected}
              disabled={selectedIds.size === 0}
              className=\"flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-500 hover:text-white rounded-lg font-bold transition-all disabled:opacity-30 whitespace-nowrap\"
            >
              <Trash2 className=\"w-4 h-4 md:w-5 h-5\" />
              <span className=\"text-sm md:text-base\">삭제 ({selectedIds.size})</span>
            </button>
          </div>
        </div>

        {/* 상단 버튼 그룹 - 헤더 버튼 크기로 조정 */}
        <div className=\"flex items-center justify-between bg-[#1a1a2e] p-2 rounded-xl border border-[#3a3a5e]/50\">
          <div className=\"flex gap-1.5 md:gap-3\">
            <label className=\"w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg cursor-pointer transition-all border border-indigo-500/30\">
              {isLoading ? <Loader2 className=\"w-6 h-6 md:w-9 md:h-9 animate-spin\" /> : <ImageIcon className=\"w-6 h-6 md:w-9 md:h-9\" />}
              <input type=\"file\" className=\"hidden\" accept=\"image/*\" onChange={handleImageAnalysis} disabled={isLoading} />
            </label>
            <button 
              onClick={() => { if(confirm('모든 회원을 삭제하시겠습니까?')) setMembers([]); }}
              className=\"w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-amber-600/20 hover:bg-amber-600 text-amber-500 hover:text-white rounded-lg transition-all border border-amber-500/30\"
              title=\"목록 초기화\"
            >
              <Eraser className=\"w-6 h-6 md:w-9 md:h-9\" />
            </button>
          </div>
          
          <div className=\"flex gap-1.5 md:gap-3\">
            <button 
              onClick={handleExcelExport}
              className=\"w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-emerald-600/20 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-lg transition-all border border-emerald-500/30\"
              title=\"엑셀 저장\"
            >
              <FileDown className=\"w-6 h-6 md:w-9 md:h-9\" />
            </button>
            <label className=\"w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-blue-600/20 hover:bg-blue-600 text-blue-500 hover:text-white rounded-lg cursor-pointer transition-all border border-blue-500/30\" title=\"엑셀 업로드\">
              <FileUp className=\"w-6 h-6 md:w-9 md:h-9\" />
              <input type=\"file\" className=\"hidden\" accept=\".xlsx, .xls\" onChange={handleExcelImport} />
            </label>
          </div>
        </div>
      </div>

      <div className=\"flex-1 overflow-auto px-1.5 md:px-6 pb-6\">
        <table className=\"w-full border-collapse bg-[#1a1a2e] rounded-xl overflow-hidden shadow-2xl\">
          <thead className=\"sticky top-0 z-10\">
            <tr className=\"bg-[#252545] border-b border-[#3a3a5e] text-[#a0a0c0] font-bold text-xs md:text-sm\">
              <th className=\"p-2 md:p-4 text-center w-10\">
                <input 
                  type=\"checkbox\" 
                  className=\"w-4 h-4 rounded border-gray-600 bg-gray-700\"
                  checked={members.length > 0 && selectedIds.size === members.length}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(new Set(members.map(m => m.id)));
                    else setSelectedIds(new Set());
                  }}
                />
              </th>
              <th className=\"p-2 md:p-4 text-left cursor-pointer hover:text-white\" onClick={() => setSortCriteria(['name', 'date'])}>이름</th>
              <th className=\"p-2 md:p-4 text-left cursor-pointer hover:text-white\" onClick={() => setSortCriteria(['date', 'name'])}>가입일</th>
              <th className=\"p-2 md:p-4 text-center w-16 md:w-20\">회비</th>
              <th className=\"p-2 md:p-4 text-center w-16 md:w-20\">출석</th>
              <th className=\"p-2 md:p-4 text-center w-16 md:w-20\">상태</th>
              <th className=\"p-2 md:p-4 text-center w-20\">관리</th>
            </tr>
          </thead>
          <tbody className=\"divide-y divide-[#3a3a5e]/30\">
            {sortedMembers.map((m) => {
              const isEditing = editingId === m.id;
              return (
                <tr 
                  key={m.id} 
                  className={`
                    hover:bg-[#252545]/50 transition-colors
                    ${selectedIds.has(m.id) ? 'bg-blue-600/10' : ''}
                    ${!m.joined ? 'opacity-50' : ''}
                    text-sm md:text-xl
                  `}
                >
                  <td className=\"p-2 md:p-4 text-center\">
                    <input 
                      type=\"checkbox\" 
                      className=\"w-4 h-4 rounded border-gray-600 bg-gray-700\"
                      checked={selectedIds.has(m.id)}
                      onChange={() => toggleSelect(m.id)}
                    />
                  </td>
                  <td className=\"p-2 md:p-4\">
                    {isEditing ? (
                      <div className=\"flex items-center gap-1\">
                        <input
                          ref={nameInputRef}
                          className=\"bg-[#2c2c2e] border border-blue-500 rounded px-2 py-1 w-full text-white outline-none\"
                          value={m.name}
                          onChange={(e) => updateMember(m.id, 'name', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                        />
                        <button onClick={() => setEditingId(null)} className=\"text-emerald-500\"><SendHorizontal className=\"w-4 h-4\" /></button>
                      </div>
                    ) : (
                      <span className=\"font-bold text-gray-100\">{m.name || '이름 없음'}</span>
                    )}
                  </td>
                  <td className=\"p-2 md:p-4\">
                    {isEditing ? (
                      <input
                        type=\"date\"
                        className=\"bg-[#2c2c2e] border border-blue-500 rounded px-1 py-1 w-full text-white outline-none text-sm\"
                        value={m.joinedDate}
                        onChange={(e) => updateMember(m.id, 'joinedDate', e.target.value)}
                      />
                    ) : (
                      <span className=\"text-[#8080a0] font-medium\">{m.joinedDate}</span>
                    )}
                  </td>
                  <td className=\"p-0 text-center\"><button onClick={() => updateMember(m.id, 'fee', !m.fee)} className={`p-1 rounded transition-colors ${m.fee ? 'text-emerald-500' : 'text-gray-400/30'}`}><Check className=\"w-6 h-6 md:w-8 md:h-8\" /></button></td>
                  <td className=\"p-0 text-center\"><button onClick={() => updateMember(m.id, 'attendance', !m.attendance)} className={`p-1 rounded transition-colors ${m.attendance ? 'text-amber-500' : 'text-gray-400/30'}`}><Check className=\"w-6 h-6 md:w-8 md:h-8\" /></button></td>
                  <td className=\"p-0 text-center\"><button onClick={() => updateMember(m.id, 'joined', !m.joined)} className={`p-1 rounded transition-colors ${m.joined ? 'text-rose-500' : 'text-gray-400/30'}`}><Check className=\"w-6 h-6 md:w-8 md:h-8\" /></button></td>
                  <td className=\"p-0 text-center pr-1\">
                    <div className=\"flex justify-center gap-1.5\">
                      <button onClick={() => setEditingId(isEditing ? null : m.id)} className=\"text-blue-400 p-1 hover:bg-[#2c2c2e] rounded\">{isEditing ? <Check className=\"w-5 h-5 md:w-6 md:h-6\"/> : <Edit2 className=\"w-5 h-5 md:w-6 md:h-6\"/>}</button>
                      <button onClick={() => deleteMember(m.id)} className=\"text-rose-500 p-1 hover:bg-[#2c2c2e] rounded\"><Trash2 className=\"w-5 h-5 md:w-6 md:h-6\" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {members.length === 0 && (
          <div className=\"flex flex-col items-center justify-center py-20 text-[#4a4a6a]\">
            <UserPlus className=\"w-16 h-16 mb-4 opacity-20\" />
            <p className=\"text-lg font-bold\">등록된 회원이 없습니다.</p>
            <p className=\"text-sm\">이미지를 분석하거나 직접 추가해보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberView;