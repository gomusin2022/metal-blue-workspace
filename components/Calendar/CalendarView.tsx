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

    // 수정된 로직: 현재 타이틀(Schedule Board)을 파일명 앞에 포함
    const defaultFileName = `${calendarTitle}_${targetMonthStr}_일정관리`;
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
    <div className="flex flex-col h-full bg-[#121212] text-gray-200 w-full">
      <div className="flex flex-col w-full mb-1 px-0">
        
        {/* 첫 번째 줄: 타이틀 및 작업 모드 (높이 md:h-16 유지) */}
        <div className="flex items-center justify-between w-full h-10 md:h-16 px-1.5 md:px-6">
          <div className="flex-1 overflow-hidden">
            {isEditingTitle ? (
              <input 
                autoFocus 
                className="bg-[#2c2c2e] border border-blue-500 rounded-lg px-1.5 py-0.5 text-base font-black text-white outline-none w-fit max-w-full" 
                value={calendarTitle} 
                onChange={(e) => setCalendarTitle(e.target.value)} 
                onBlur={() => setIsEditingTitle(false)} 
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)} 
              />
            ) : (
              <h2 
                className="text-lg md:text-2xl font-black text-white cursor-pointer tracking-tighter truncate w-fit hover:text-blue-400 transition-colors" 
                onClick={() => setIsEditingTitle(true)}
              >
                {calendarTitle}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex bg-[#1a1a2e] p-1 rounded border border-[#3a3a5e] shadow-lg">
              <button onClick={() => { setMode('normal'); setClipboard([]); }} className={`w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded transition-all ${mode === 'normal' ? 'bg-blue-600 shadow-md' : 'hover:bg-[#2c2c2e]'}`}><MousePointer2 className="w-6 h-6 md:w-9 md:h-9 text-amber-400" /></button>
              <button onClick={() => setMode('copy')} className={`w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded transition-all ${mode === 'copy' ? 'bg-blue-600 shadow-md' : 'hover:bg-[#2c2c2e]'}`}><Copy className="w-6 h-6 md:w-9 md:h-9 text-cyan-400" /></button>
              <button onClick={() => setMode('delete')} className={`w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded transition-all ${mode === 'delete' ? 'bg-blue-600 shadow-md' : 'hover:bg-[#2c2c2e]'}`}><Trash2 className="w-6 h-6 md:w-9 md:h-9 text-rose-500" /></button>
            </div>
            <button onClick={handleUndo} className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-[#1a1a2e] border border-[#3a3a5e] rounded text-emerald-400 relative">
              <RotateCcw className="w-6 h-6 md:w-9 md:h-9" />
              {undoStack.length > 0 && <span className="absolute top-0.5 right-0.5 bg-emerald-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black">{undoStack.length}</span>}
            </button>
          </div>
        </div>

        {/* 두 번째 줄: 날짜 이동 및 엑셀 도구 (높이 md:h-16 유지) */}
        <div className="flex items-center justify-between w-full h-12 md:h-16 border-t border-[#3a3a5e]/20 pt-1.5 px-1.5 md:px-6">
          <div className="flex items-center bg-[#1a1a2e] rounded p-0.5 border border-[#3a3a5e] shadow-md">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-[#2c2c2e] rounded"><ChevronLeft className="w-6 h-6 text-blue-400" /></button>
            <span className="text-xl md:text-3xl font-black px-4 min-w-[120px] md:min-w-[180px] text-center text-white tabular-nums">
              {format(currentMonth, 'yyyy. MM', { locale: ko })}
            </span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-[#2c2c2e] rounded"><ChevronRight className="w-6 h-6 text-blue-400" /></button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={exportToExcel} className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-emerald-700 border border-emerald-500/50 rounded text-white shadow-sm" title="월간 저장"><FileDown className="w-6 h-6 md:w-9 md:h-9" /></button>
            <label className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-[#1a1a2e] border border-[#3a3a5e] rounded cursor-pointer hover:bg-[#3a3a5e]" title="엑셀 업로드">
              <FileUp className="w-6 h-6 md:w-9 md:h-9 text-emerald-400" />
              <input type="file" ref={fileInputRef} onChange={importFromExcel} accept=".xlsx, .xls" className="hidden" />
            </label>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-auto bg-[#1a1a2e] rounded-lg border border-[#3a3a5e] mx-0 mb-1.5 md:mb-6">
        <div className="grid grid-cols-7 gap-px md:gap-1 bg-[#252545] min-h-full">
          {/* 요일 글자 크기 유지 */}
          {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
            <div 
              key={day} 
              className="text-center font-black py-1.5 md:py-2 text-[14px] md:text-[1.2rem] bg-[#1a1a2e]" 
              style={{ color: idx === 0 ? COLORS.SUNDAY : idx === 6 ? COLORS.SATURDAY : '#6b7280' }}
            >
              {day}
            </div>
          ))}

          {calendarDays.map((day) => {
            const daySchedules = schedules.filter(s => isSameDay(new Date(s.date), day));
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            const { isRedDay, isSaturday, label } = getDayStatus(day);
            let dayColor = COLORS.TEXT_PRIMARY;
            if (isRedDay) dayColor = COLORS.SUNDAY; else if (isSaturday) dayColor = COLORS.SATURDAY;
            if (!isCurrentMonth) dayColor = 'rgba(156, 163, 175, 0.1)';

            return (
              <div 
                key={day.toString()} 
                onClick={() => { 
                  if (mode === 'normal') onDateClick(day); 
                  else if (mode === 'copy') handleCopyAction(day); 
                  else if (mode === 'delete') handleDeleteAction(day); 
                }} 
                className={`
                  min-h-[90px] md:min-h-[110px] lg:min-h-[130px]
                  p-1.5 md:p-2 
                  border border-[#3a3a5e]/70
                  transition-all cursor-pointer 
                  flex flex-col relative group
                  ${isCurrentMonth 
                    ? 'bg-[#1a1a2e]' 
                    : 'bg-[#0f0f1a] opacity-50'
                  }
                  ${mode === 'delete' && daySchedules.length > 0 
                    ? 'hover:bg-rose-900/30 hover:border-rose-600' 
                    : 'hover:border-blue-500/70 hover:bg-[#252545]'
                  }
                  ${isToday 
                    ? 'ring-2 ring-inset ring-blue-500/90 z-10 shadow-[inset_0_0_8px_rgba(59,130,246,0.5)]' 
                    : ''
                  }
                `}
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl md:text-2xl font-black" style={{ color: dayColor }}>
                    {format(day, 'd')}
                  </span>
                  {isCurrentMonth && label && (
                    <span className="text-[9px] md:text-xs font-bold truncate text-red-400/90">
                      {label}
                    </span>
                  )}
                </div>

                <div className="mt-1 space-y-1 overflow-hidden flex-1">
                  {daySchedules.slice(0, 4).map((s) => (
                    <div 
                      key={s.id} 
                      className="text-[9px] md:text-xs px-1.5 py-0.5 bg-blue-900/20 text-blue-200 rounded border border-blue-800/30 truncate font-medium"
                    >
                      {s.title}
                    </div>
                  ))}
                  {daySchedules.length > 4 && (
                    <div className="text-[9px] text-gray-500 pl-1 font-black">
                      +{daySchedules.length - 4}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 개발자 문구 크기 유지 */}
      <div className="pb-4 text-center text-blue-500/80 text-[14px] md:text-[1.2rem] font-bold tracking-tight">
        This app was developed by Yongkyu Kim in January 2026
      </div>

      {clipboard.length > 0 && mode === 'copy' && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 px-6 py-3 bg-[#2c2c2e] text-cyan-400 rounded-full shadow-2xl font-black border border-cyan-900/60 text-sm">
            <ClipboardCheck className="w-5 h-5" /> {clipboard.length}개 복사 대기 중
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;