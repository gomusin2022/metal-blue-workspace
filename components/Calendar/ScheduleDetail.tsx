import React, { useState } from 'react';
import { ChevronLeft, Check, X, Edit2, Trash2, CalendarDays, Plus, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Schedule } from '../../types';

interface ScheduleDetailProps {
  selectedDate: Date;
  schedules: Schedule[];
  onBack: () => void;
  onSave: (newSchedules: Schedule[]) => void;
}

const ScheduleDetail: React.FC<ScheduleDetailProps> = ({ selectedDate, schedules, onBack, onSave }) => {
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localSchedules, setLocalSchedules] = useState<Schedule[]>(
    schedules.filter(s => s.date === dateStr)
  );
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  /** 시간 문자열을 분 단위 숫자로 변환 (계산용) */
  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return {
      period: h < 12 ? '오전' : '오후',
      hour: h % 12 === 0 ? 12 : h % 12,
      minute: m,
      totalMinutes: h * 60 + m
    };
  };

  /** 시간 객체를 HH:mm 문자열로 변환 */
  const buildTimeFromMinutes = (totalMinutes: number) => {
    // 자정(24:00) 예외 처리
    if (totalMinutes >= 1440) return '00:00';
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const buildTimeFromParts = (p: string, h: number, m: number) => {
    let h24 = p === '오후' && h !== 12 ? h + 12 : h;
    if (p === '오전' && h === 12) h24 = 0;
    return `${h24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  /** [개선] 시작 시간 변경 시 종료 시간 무조건 1시간 후로 강제 동기화 */
  const handleStartTimeChange = (id: string, p: string, h: number, m: number) => {
    const newStartTime = buildTimeFromParts(p, h, m);
    const startObj = parseTime(newStartTime);
    
    // 무조건 1시간 추가 (사용자 수정 여부 무시하고 자동 제안 우선)
    const newEndTime = buildTimeFromMinutes(startObj.totalMinutes + 60);

    const updatedList = localSchedules.map(s => 
      s.id === id ? { ...s, startTime: newStartTime, endTime: newEndTime } : s
    );

    setLocalSchedules(updatedList);
    if (error?.id === id) setError(null);
  };

  const handleEndTimeChange = (id: string, p: string, h: number, m: number) => {
    const newTime = buildTimeFromParts(p, h, m);
    const newList = localSchedules.map(s => s.id === id ? { ...s, endTime: newTime } : s);
    setLocalSchedules(newList);
    if (error?.id === id) setError(null);
  };

  const handleUpdateField = (id: string, field: keyof Schedule, value: string) => {
    const newList = localSchedules.map(s => s.id === id ? { ...s, [field]: value } : s);
    setLocalSchedules(newList);
  };

  /** [신규] 일정 추가 시 마지막 종료 시간을 시작 시간으로 제안 */
  const handleAddSchedule = () => {
    const newId = crypto.randomUUID();
    let nextStart = '09:00'; // 기본 시작값
    
    if (localSchedules.length > 0) {
      // 가장 늦은 종료 시간을 찾아서 시작 시간으로 제안
      const sorted = [...localSchedules].sort((a, b) => {
        const timeA = a.endTime === '00:00' ? 1440 : parseTime(a.endTime).totalMinutes;
        const timeB = b.endTime === '00:00' ? 1440 : parseTime(b.endTime).totalMinutes;
        return timeA - timeB;
      });
      nextStart = sorted[sorted.length - 1].endTime;
      // 만약 마지막 일정이 자정(00:00)에 끝났다면 다시 09:00으로 리셋
      if (nextStart === '00:00') nextStart = '09:00';
    }
    
    const startObj = parseTime(nextStart);
    const nextEnd = buildTimeFromMinutes(startObj.totalMinutes + 60);

    setLocalSchedules([...localSchedules, { 
      id: newId, 
      date: dateStr, 
      startTime: nextStart, 
      endTime: nextEnd, 
      title: '' 
    }]);
    setEditingId(newId);
  };

  const handleConfirm = (id: string) => {
    const current = localSchedules.find(s => s.id === id);
    if (!current) return;

    const startVal = parseTime(current.startTime).totalMinutes;
    let endVal = parseTime(current.endTime).totalMinutes;
    if (endVal === 0) endVal = 1440; // 00:00을 논리적 24:00으로 처리

    if (startVal >= endVal) {
      setError({ id, message: "종료 시간은 시작 시간보다 늦어야 합니다." });
      return;
    }
    
    const hasOverlap = localSchedules.some(other => 
      other.id !== id && 
      startVal < (other.endTime === '00:00' ? 1440 : parseTime(other.endTime).totalMinutes) && 
      endVal > parseTime(other.startTime).totalMinutes
    );

    if (hasOverlap) {
      setError({ id, message: "시간이 다른 일정과 겹칩니다." });
      return;
    }

    setEditingId(null);
    onSave([...schedules.filter(s => s.date !== dateStr), ...localSchedules]);
  };

  return (
    <div className="p-6 bg-[#121212] min-h-full flex flex-col text-gray-200 font-sans">
      <div className="flex items-center justify-between mb-8 border-b border-[#3a3a5e] pb-6">
        <h2 className="text-4xl font-black text-white flex items-center tracking-tight">
          {format(selectedDate, 'MM월 dd일')} 상세일정 <CalendarDays className="ml-3 w-7 h-7 text-blue-500" />
        </h2>
      </div>

      <div className="flex-grow overflow-y-auto space-y-6 pr-2 custom-scrollbar">
        {localSchedules.map((s) => {
          const isEditing = editingId === s.id;
          const start = parseTime(s.startTime);
          const end = parseTime(s.endTime);

          return (
            <div key={s.id} className={`p-6 rounded-3xl border transition-all duration-500 ${isEditing ? 'bg-[#1e1e3e] border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.2)] scale-[1.01]' : 'bg-[#1a1a2e] border-[#3a3a5e]'}`}>
              <div className="flex flex-col gap-3 mb-5">
                {isEditing ? (
                  <div className="flex flex-wrap items-center gap-4 bg-[#0f0f1a] p-4 rounded-2xl border border-blue-900/50 w-fit">
                    <div className="flex items-center gap-2">
                      <select value={start.period} onChange={(e) => handleStartTimeChange(s.id, e.target.value, start.hour, start.minute)} className="bg-transparent text-blue-400 font-bold outline-none cursor-pointer">
                        <option value="오전" className="bg-[#1a1a2e] text-white">오전</option>
                        <option value="오후" className="bg-[#1a1a2e] text-white">오후</option>
                      </select>
                      <select value={start.hour} onChange={(e) => handleStartTimeChange(s.id, start.period, Number(e.target.value), start.minute)} className="bg-transparent text-white font-bold outline-none cursor-pointer">
                        {[...Array(12)].map((_, i) => <option key={i+1} value={i+1} className="bg-[#1a1a2e] text-white">{i+1}시</option>)}
                      </select>
                      <select value={start.minute} onChange={(e) => handleStartTimeChange(s.id, start.period, start.hour, Number(e.target.value))} className="bg-transparent text-white font-bold outline-none cursor-pointer">
                        {[0, 10, 20, 30, 40, 50].map(m => <option key={m} value={m} className="bg-[#1a1a2e] text-white">{m.toString().padStart(2, '0')}분</option>)}
                      </select>
                    </div>
                    <span className="text-gray-700 font-black text-xl">→</span>
                    <div className="flex items-center gap-2">
                      <select value={end.period} onChange={(e) => handleEndTimeChange(s.id, e.target.value, end.hour, end.minute)} className="bg-transparent text-emerald-400 font-bold outline-none cursor-pointer">
                        <option value="오전" className="bg-[#1a1a2e] text-white">오전</option>
                        <option value="오후" className="bg-[#1a1a2e] text-white">오후</option>
                      </select>
                      <select value={end.hour} onChange={(e) => handleEndTimeChange(s.id, end.period, Number(e.target.value), end.minute)} className="bg-transparent text-white font-bold outline-none cursor-pointer">
                        {[...Array(12)].map((_, i) => <option key={i+1} value={i+1} className="bg-[#1a1a2e] text-white">{i+1}시</option>)}
                      </select>
                      <select value={end.minute} onChange={(e) => handleEndTimeChange(s.id, end.period, end.hour, Number(e.target.value))} className="bg-transparent text-white font-bold outline-none cursor-pointer">
                        {[0, 10, 20, 30, 40, 50].map(m => <option key={m} value={m} className="bg-[#1a1a2e] text-white">{m.toString().padStart(2, '0')}분</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-blue-400 px-1">
                    {start.period} {start.hour}:{start.minute.toString().padStart(2, '0')} <span className="text-gray-600 mx-2">~</span> {end.period} {end.hour}:{end.minute.toString().padStart(2, '0')}
                  </div>
                )}
                {error?.id === s.id && (
                  <div className="flex items-center text-red-400 text-sm font-bold mt-1 px-1 animate-pulse">
                    <AlertCircle className="w-4 h-4 mr-2" /> {error.message}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                {isEditing ? (
                  <input autoFocus className="flex-grow bg-[#2c2c2e] p-4 rounded-2xl outline-none border-2 border-blue-500 font-bold text-white text-xl shadow-inner" value={s.title} onChange={(e) => handleUpdateField(s.id, 'title', e.target.value)} placeholder="일정 제목을 입력하세요..." />
                ) : (
                  <div className="flex-grow text-3xl font-black text-white px-1 truncate tracking-tight">{s.title || '제목 없음'}</div>
                )}
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <>
                      <button onClick={() => handleConfirm(s.id)} className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg hover:bg-blue-500 active:scale-95 transition-all"><Check className="w-7 h-7"/></button>
                      <button onClick={() => { setLocalSchedules(schedules.filter(sc => sc.date === dateStr)); setEditingId(null); setError(null); }} className="p-4 bg-gray-700 text-gray-300 rounded-2xl hover:bg-gray-600 active:scale-95 transition-all"><X className="w-7 h-7"/></button>
                    </>
                  ) : (
                    <button onClick={() => setEditingId(s.id)} className="p-4 bg-blue-900/30 text-blue-400 rounded-2xl hover:bg-blue-600 hover:text-white active:scale-95 transition-all"><Edit2 className="w-7 h-7"/></button>
                  )}
                  <button onClick={() => { if(confirm("일정을 삭제할까요?")) { const newList = localSchedules.filter(ls => ls.id !== s.id); setLocalSchedules(newList); onSave([...schedules.filter(sc => sc.date !== dateStr), ...newList]); } }} className="p-4 bg-red-900/20 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white active:scale-95 transition-all"><Trash2 className="w-7 h-7"/></button>
                </div>
              </div>
            </div>
          );
        })}

        <div onClick={handleAddSchedule} className="p-12 border-2 border-dashed border-[#2c2c2e] rounded-[2rem] flex items-center justify-center text-gray-500 cursor-pointer hover:bg-[#1a1a2e] hover:border-blue-500/50 transition-all group shadow-sm">
          <Plus className="w-10 h-10 mr-4 group-hover:scale-125 group-hover:text-blue-500 transition-all" /><span className="font-bold text-2xl tracking-tighter">새로운 일정을 추가하려면 터치하세요</span>
        </div>
      </div>

      <div className="mt-10 flex justify-center border-t border-[#3a3a5e] pt-10">
        <button onClick={onBack} className="flex items-center px-16 py-6 bg-[#212121] rounded-3xl font-black text-2xl hover:bg-[#2c2c2e] text-gray-400 transition-all active:scale-95 shadow-2xl border border-white/5"><ChevronLeft className="w-9 h-9 mr-2" /> 달력으로 돌아가기</button>
      </div>
    </div>
  );
};

export default ScheduleDetail;