/**
 * CalendarView.tsx - 넓은 레이아웃 복구 및 보더 최적화 버전
 */
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
    onUpdateSchedules([...schedules, ...undoStack[undoStack.length - 1]]);
    setUndoStack(prev => prev.slice(0, -1));
  };

  return (
    /* 롤백 포인트: w-full로 가로를 꽉 채우고 mx-0으로 불필요한 마진을 제거 */
    <div className={`flex flex-col h-full bg-[#121212] px-2 md:px-4 pt-0 pb-2 text-gray-200 transition-all duration-500 border-4 rounded-[2rem] w-full box-border mx-0
      ${mode === 'copy' ? 'border-blue-500/30' : 
        mode === 'delete' ? 'border-rose-500/30' : 'border-transparent'}`}
    >
      <div className="flex flex-col w-full mb-1">
        <div className="flex items-center justify-between w-full h-10 px-1">
          <div className="flex-1 flex justify-start">
            {isEditingTitle ? (
              <input autoFocus className="bg-[#2c2c2e] border border-blue-500 rounded px-1.5 py-0.5 text-base font-black text-white outline-none w-fit" value={calendarTitle} onChange={(e) => setCalendarTitle(e.target.value)} onBlur={() => setIsEditingTitle(false)} onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)} />
            ) : (
              <h2 className="text-lg md:text-2xl font-black text-white cursor-pointer tracking-tighter w-fit hover:text-blue-400 transition-colors" onClick={() => setIsEditingTitle(true)}>{calendarTitle}</h2>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex bg-[#1a1a2e] p-0.5 rounded border border-[#3a3a5e] shadow-lg">
              <button onClick={() => { setMode('normal'); setClipboard([]); }} className={`p-1.5 rounded transition-all ${mode === 'normal' ? 'bg-blue-600' : 'hover:bg-[#2c2c2e]'}`}><MousePointer2 className="w-5 h-5 text-amber-400" /></button>
              <button onClick={() => setMode('copy')} className={`p-1.5 rounded transition-all ${mode === 'copy' ? 'bg-blue-600' : 'hover:bg-[#2c2c2e]'}`}><Copy className="w-5 h-5 text-cyan-400" /></button>
              <button onClick={() => setMode('delete')} className={`p-1.5 rounded transition-all ${mode === 'delete' ? 'bg-blue-600' : 'hover:bg-[#2c2c2e]'}`}><Trash2 className="w-5 h-5 text-rose-500" /></button>
            </div>
            <button onClick={handleUndo} className="p-1.5 bg-[#1a1a2e] border border-[#3a3a5e] rounded text-emerald-400"><RotateCcw className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex items-center justify-between w-full h-12 border-t border-[#3a3a5e]/20 pt-1 px-1">
          <div className="flex items-center bg-[#1a1a2e] rounded p-0.5 border border-[#3a3a5e]">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-[#2c2c2e] rounded"><ChevronLeft className="w-6 h-6 text-blue-400" /></button>
            <span className="text-xl md:text-3xl font-black px-4 text-white">{format(currentMonth, 'yyyy. MM', { locale: ko })}</span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-[#2c2c2e] rounded"><ChevronRight className="w-6 h-6 text-blue-400" /></button>
          </div>
        </div>
      </div>

      {/* 그리드 복구: gap을 유지하면서 각 셀이 화면 너비를 가득 채우도록 설정 */}
      <div className="flex-grow grid grid-cols-7 gap-1 md:gap-2 overflow-auto w-full">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
          <div key={day} className="text-center font-black py-0.5 text-[10px] md:text-sm" style={{ color: idx === 0 ? COLORS.SUNDAY : idx === 6 ? COLORS.SATURDAY : '#6b7280' }}>{day}</div>
        ))}
        {calendarDays.map((day) => {
          const daySchedules = schedules.filter(s => isSameDay(new Date(s.date), day));
          const isCurrentMonth = isSameMonth(day, monthStart);
          const { isRedDay, isSaturday, label } = getDayStatus(day);
          let dayColor = COLORS.TEXT_PRIMARY;
          if (isRedDay) dayColor = COLORS.SUNDAY; else if (isSaturday) dayColor = COLORS.SATURDAY;
          if (!isCurrentMonth) dayColor = 'rgba(156, 163, 175, 0.15)';

          return (
            <div key={day.toString()} onClick={() => { if (mode === 'normal') onDateClick(day); else if (mode === 'copy') handleCopyAction(day); else if (mode === 'delete') handleDeleteAction(day); }} 
                 className={`w-full min-h-[85px] md:min-h-[110px] p-1 md:p-2 rounded border transition-all cursor-pointer flex flex-col relative ${isCurrentMonth ? 'bg-[#1a1a2e] border-[#3a3a5e]' : 'bg-transparent border-transparent opacity-20'} ${mode === 'delete' && daySchedules.length > 0 ? 'hover:bg-rose-900/20 hover:border-rose-500' : 'hover:border-blue-500 hover:bg-[#252545]'} ${isSameDay(day, new Date()) ? 'ring-2 ring-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : ''}`}>
              <div className="flex items-baseline gap-1">
                <span className="text-lg md:text-2xl font-black" style={{ color: dayColor }}>{format(day, 'd')}</span>
                {isCurrentMonth && label && <span className="text-[7px] md:text-[10px] font-bold truncate" style={{ color: COLORS.SUNDAY }}>{label}</span>}
              </div>
              <div className="mt-1 space-y-1 overflow-hidden">
                {daySchedules.slice(0, 3).map((s) => (
                  <div key={s.id} className="w-full text-[8px] md:text-[11px] px-1.5 py-0.5 bg-blue-600/10 text-blue-300 rounded-md truncate font-bold border border-blue-500/10">{s.title}</div>
                ))}
                {daySchedules.length > 3 && <div className="text-[8px] text-gray-500 pl-1 font-black">+{daySchedules.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {clipboard.length > 0 && mode === 'copy' && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-blue-600 text-white rounded-full shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <ClipboardCheck className="w-4 h-4" /> {clipboard.length}개 복사됨 - 붙여넣을 날짜 클릭
        </div>
      )}
    </div>
  );
};

export default CalendarView;