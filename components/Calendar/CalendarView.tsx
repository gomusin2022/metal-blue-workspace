import React, { useState, useRef } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval, getDay
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, Copy, Trash2, MousePointer2, 
  RotateCcw, ClipboardCheck, FileDown, FileUp 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Schedule } from '../../types';
import { COLORS } from '../../constants';

interface CalendarViewProps {
  schedules: Schedule[];
  onDateClick: (date: Date) => void;
  onUpdateSchedules: (newSchedules: Schedule[]) => void;
}

type WorkMode = 'normal' | 'copy' | 'delete';

const HOLIDAY_LABELS_2026: Record<string, string> = {
  '2026-01-01': '신정', '2026-02-17': '설날', '2026-03-01': '삼일절',
  '2026-05-05': '어린이날', '2026-05-24': '석가탄신일', '2026-06-06': '현충일',
  '2026-08-15': '광복절', '2026-09-25': '추석', '2026-10-03': '개천절',
  '2026-10-09': '한글날', '2026-12-25': '성탄절',
};

const RED_DAYS_2026 = new Set([
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-01', 
  '2026-03-02', '2026-05-05', '2026-05-24', '2026-05-25', '2026-06-06',
  '2026-08-15', '2026-08-17', '2026-09-24', '2026-09-25', '2026-09-26',
  '2026-10-03', '2026-10-05', '2026-10-09', '2026-12-25',
]);

const CalendarView: React.FC<CalendarViewProps> = ({ schedules, onDateClick, onUpdateSchedules }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarTitle, setCalendarTitle] = useState('Schedule Board');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [mode, setMode] = useState<WorkMode>('normal');
  const [clipboard, setClipboard] = useState<Schedule[]>([]); 
  const [undoStack, setUndoStack] = useState<Schedule[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayStatus = (day: Date) => {
    const formatted = format(day, 'yyyy-MM-dd');
    const dayOfWeek = getDay(day);
    const isRedDay = RED_DAYS_2026.has(formatted) || dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    const label = HOLIDAY_LABELS_2026[formatted];
    return { isRedDay, isSaturday, label };
  };

  const exportToExcel = () => {
    const targetMonthStr = format(currentMonth, 'yyyy-MM');
    const monthlyData = schedules
      .filter(s => s.date.startsWith(targetMonthStr))
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .map(s => ({ 날짜: s.date, 시작시간: s.startTime, 종료시간: s.endTime, 제목: s.title }));

    if (monthlyData.length === 0) {
      alert(`${targetMonthStr}에 등록된 일정이 없습니다.`);
      return;
    }

    const defaultFileName = `${targetMonthStr}_일정관리`;
    const fileName = prompt("저장할 엑셀 파일명을 입력하세요:", defaultFileName);
    if (fileName === null) return;

    const worksheet = XLSX.utils.json_to_sheet(monthlyData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "월간일정");
    XLSX.writeFile(workbook, `${fileName || defaultFileName}.xlsx`);
  };

  const importFromExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws) as any[];
      const importedSchedules: Schedule[] = data.map(item => ({
        id: crypto.randomUUID(),
        date: item.날짜 || item.date,
        startTime: item.시작시간 || item.startTime || '09:00',
        endTime: item.종료시간 || item.endTime || '10:00',
        title: item.제목 || item.title || '새 일정'
      }));
      onUpdateSchedules([...schedules, ...importedSchedules]);
    };
    reader.readAsBinaryString(file);
  };

  const handleCopyAction = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const daySchedules = schedules.filter(s => s.date === dateStr);
    if (daySchedules.length > 0) setClipboard(daySchedules);
    else if (clipboard.length > 0) {
      const newSchedules = clipboard.map(s => ({ ...s, id: crypto.randomUUID(), date: dateStr }));
      onUpdateSchedules([...schedules, ...newSchedules]);
    }
  };

  const handleDeleteAction = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const targetSchedules = schedules.filter(s => s.date === dateStr);
    if (targetSchedules.length === 0) return;
    setUndoStack(prev => [...prev, targetSchedules]);
    onUpdateSchedules(schedules.filter(s => s.date !== dateStr));
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const lastDeleted = undoStack[undoStack.length - 1];
    onUpdateSchedules([...schedules, ...lastDeleted]);
    setUndoStack(prev => prev.slice(0, -1));
  };

  return (
    <div className={`flex flex-col h-full bg-[#121212] p-2 md:p-6 pt-1 text-gray-200 transition-all duration-500 border-4 rounded-[2rem]
      ${mode === 'copy' ? 'border-cyan-500/20' : 
        mode === 'delete' ? 'border-rose-500/20' : 'border-transparent'}`}
    >
      {/* 달력 모듈 상단 영역 (여백 최소화) */}
      <div className="flex flex-col w-full mb-1">
        
        {/* 첫째줄: 타이틀(좌) + 작업 모드(우) - 높이 압축 */}
        <div className="flex items-center justify-between w-full h-10">
          <div className="flex-1 flex justify-start">
            {isEditingTitle ? (
              <input autoFocus className="bg-[#2c2c2e] border border-blue-500 rounded px-2 py-0.5 text-lg md:text-2xl font-black text-white outline-none" value={calendarTitle} onChange={(e) => setCalendarTitle(e.target.value)} onBlur={() => setIsEditingTitle(false)} onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)} />
            ) : (
              <h2 className="text-lg md:text-2xl font-black text-white cursor-pointer tracking-tighter whitespace-nowrap" onClick={() => setIsEditingTitle(true)}>{calendarTitle}</h2>
            )}
          </div>

          {/* 아이콘 크기 고정 및 간격 유지 */}
          <div className="flex items-center gap-1.5 scale-95 origin-right">
            <div className="flex bg-[#1a1a2e] p-0.5 rounded-lg border border-[#3a3a5e] shadow-lg">
              <button onClick={() => { setMode('normal'); setClipboard([]); }} className={`p-1.5 rounded transition-all ${mode === 'normal' ? 'bg-[#2c2c2e]' : 'hover:bg-[#2c2c2e]/50'}`}><MousePointer2 className="w-5 h-5 text-amber-400" /></button>
              <button onClick={() => setMode('copy')} className={`p-1.5 rounded transition-all ${mode === 'copy' ? 'bg-[#2c2c2e]' : 'hover:bg-[#2c2c2e]/50'}`}><Copy className="w-5 h-5 text-cyan-400" /></button>
              <button onClick={() => setMode('delete')} className={`p-1.5 rounded transition-all ${mode === 'delete' ? 'bg-[#2c2c2e]' : 'hover:bg-[#2c2c2e]/50'}`}><Trash2 className="w-5 h-5 text-rose-500" /></button>
            </div>
            <button onClick={handleUndo} className="p-1.5 bg-[#1a1a2e] border border-[#3a3a5e] rounded-lg text-emerald-400 relative">
              <RotateCcw className="w-5 h-5" />
              {undoStack.length > 0 && <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-black">{undoStack.length}</span>}
            </button>
          </div>
        </div>

        {/* 둘째줄: 연월이동(좌) + 엑셀(우) - 줄 간격 밀착 */}
        <div className="flex items-center justify-between w-full h-10 border-t border-[#3a3a5e]/20 pt-1">
          <div className="flex items-center bg-[#1a1a2e] rounded-lg p-0.5 border border-[#3a3a5e] shadow-md scale-95 origin-left">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-[#2c2c2e] rounded"><ChevronLeft className="w-4.5 h-4.5 text-blue-400" /></button>
            <span className="text-xs md:text-sm font-black px-3 min-w-[80px] md:min-w-[100px] text-center text-white">{format(currentMonth, 'yyyy. MM', { locale: ko })}</span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-[#2c2c2e] rounded"><ChevronRight className="w-4.5 h-4.5 text-blue-400" /></button>
          </div>

          <div className="flex items-center gap-1.5 scale-95 origin-right">
            <button onClick={exportToExcel} className="p-1.5 bg-emerald-700 rounded-lg text-white shadow-sm" title="월간 저장"><FileDown className="w-4.5 h-4.5" /></button>
            <label className="p-1.5 bg-[#1a1a2e] border border-[#3a3a5e] rounded-lg cursor-pointer hover:bg-[#3a3a5e]" title="엑셀 업로드">
              <FileUp className="w-4.5 h-4.5 text-emerald-400" />
              <input type="file" ref={fileInputRef} onChange={importFromExcel} accept=".xlsx, .xls" className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* 달력 그리드 영역 (상단 여백 최소화로 더 넓어진 영역) */}
      <div className="flex-grow grid grid-cols-7 gap-1 md:gap-2 overflow-auto">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
          <div key={day} className="text-center font-black py-0.5 text-xs md:text-sm" style={{ color: idx === 0 ? COLORS.SUNDAY : idx === 6 ? COLORS.SATURDAY : '#6b7280' }}>{day}</div>
        ))}
        {calendarDays.map((day) => {
          const daySchedules = schedules.filter(s => isSameDay(new Date(s.date), day));
          const isCurrentMonth = isSameMonth(day, monthStart);
          const { isRedDay, isSaturday, label } = getDayStatus(day);
          let dayColor = COLORS.TEXT_PRIMARY;
          if (isRedDay) dayColor = COLORS.SUNDAY; else if (isSaturday) dayColor = COLORS.SATURDAY;
          if (!isCurrentMonth) dayColor = 'rgba(156, 163, 175, 0.1)';

          return (
            <div key={day.toString()} onClick={() => { if (mode === 'normal') onDateClick(day); else if (mode === 'copy') handleCopyAction(day); else if (mode === 'delete') handleDeleteAction(day); }} className={`min-h-[85px] md:min-h-[105px] p-1 md:p-2 rounded-[1.2rem] md:rounded-[1.5rem] border transition-all cursor-pointer flex flex-col relative group ${isCurrentMonth ? 'bg-[#1a1a2e] border-[#3a3a5e]' : 'bg-transparent border-transparent opacity-30'} ${mode === 'delete' && daySchedules.length > 0 ? 'hover:bg-rose-900/20 hover:border-rose-500' : 'hover:border-blue-500 hover:bg-[#252545]'} ${isSameDay(day, new Date()) ? 'ring-2 ring-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : ''}`}>
              <div className="flex items-baseline gap-1"><span className="text-lg md:text-xl font-black" style={{ color: dayColor }}>{format(day, 'd')}</span>{isCurrentMonth && label && <span className="text-[7px] md:text-[9px] font-bold truncate" style={{ color: COLORS.SUNDAY }}>{label}</span>}</div>
              <div className="mt-0.5 space-y-0.5 overflow-hidden">{daySchedules.slice(0, 3).map((s) => (<div key={s.id} className="text-[8px] md:text-[10px] px-1.5 py-0.5 bg-blue-600/10 text-blue-300 rounded-md truncate font-bold border border-blue-500/10">{s.title}</div>))}{daySchedules.length > 3 && <div className="text-[8px] text-gray-500 pl-1 font-black">+{daySchedules.length - 3}</div>}</div>
            </div>
          );
        })}
      </div>

      {clipboard.length > 0 && mode === 'copy' && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 px-5 py-2.5 bg-[#2c2c2e] text-cyan-400 rounded-2xl shadow-2xl font-black border border-cyan-900/50 text-xs">
            <ClipboardCheck className="w-4 h-4" /> {clipboard.length}개 복사 대기 중
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;