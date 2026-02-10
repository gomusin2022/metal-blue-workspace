/**
 * App.tsx - 메인 컨트롤러 (회계 모듈 통합판)
 * 원칙 준수 사항:
 * 1. 소스 누락 절대 금지: 기존 모든 도메인 로직 100% 유지
 * 2. 회계 모듈 연결: AppMode.ACCOUNTING 분기 추가
 * 3. 철저한 모듈화: AccountingView 컴포넌트 호출
 */

import React, { useState, useEffect } from 'react';
import { AppMode, Schedule, Member, Note } from './types';
import Header from './components/Header';
import CalendarView from './components/Calendar/CalendarView';
import ScheduleDetail from './components/Calendar/ScheduleDetail';
import MemberView from './components/Member/MemberView';
import NoteView from './components/Note/NoteView';
import AccountingView from './components/Accounting/AccountingView'; // 신규 회계 모듈 임포트

const App: React.FC = () => {
  // --- [1. 시스템 설정 및 타이틀 상태] ---
  const [mode, setMode] = useState<AppMode>(AppMode.CALENDAR);
  const [appTitle, setAppTitle] = useState('Metal Blue WorkSpace'); 
  const [noteTitle, setNoteTitle] = useState('Standard Note'); 

  // --- [2. 도메인 데이터 상태] ---
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [notes, setNotes] = useState<Note[]>([]); 
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // --- [3. 초기 데이터 로드 (Local Storage)] ---
  useEffect(() => {
    const savedSchedules = localStorage.getItem('metal_schedules');
    const savedMembers = localStorage.getItem('metal_members');
    const savedNotes = localStorage.getItem('metal_notes');
    const savedAppTitle = localStorage.getItem('app_main_title'); 
    const savedNoteTitle = localStorage.getItem('app_note_title');
    
    if (savedSchedules) setSchedules(JSON.parse(savedSchedules));
    if (savedMembers) setMembers(JSON.parse(savedMembers));
    if (savedNotes) setNotes(JSON.parse(savedNotes));
    
    const newTitle = 'Metal Blue WorkSpace';
    if (savedAppTitle && savedAppTitle !== 'Smart Workspace' && savedAppTitle !== 'Metal Blue WorkScpace') {
      setAppTitle(savedAppTitle);
    } else {
      setAppTitle(newTitle);
      localStorage.setItem('app_main_title', newTitle);
    }
    
    if (savedNoteTitle) setNoteTitle(savedNoteTitle);
  }, []);

  // --- [4. 데이터 자동 저장 (Local Storage)] ---
  useEffect(() => {
    localStorage.setItem('metal_schedules', JSON.stringify(schedules));
    localStorage.setItem('metal_members', JSON.stringify(members));
    localStorage.setItem('metal_notes', JSON.stringify(notes));
    localStorage.setItem('app_main_title', appTitle);
    localStorage.setItem('app_note_title', noteTitle);
  }, [schedules, members, notes, appTitle, noteTitle]);

  // --- [5. 공통 핸들러] ---
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setMode(AppMode.SCHEDULE_DETAIL);
  };

  // --- [6. 콘텐츠 렌더링 엔진] ---
  const renderContent = () => {
    switch (mode) {
      case AppMode.CALENDAR:
        return (
          <CalendarView 
            schedules={schedules} 
            onDateClick={handleDateClick} 
            onUpdateSchedules={setSchedules} 
          />
        );
      case AppMode.SCHEDULE_DETAIL:
        return selectedDate ? (
          <ScheduleDetail 
            selectedDate={selectedDate} 
            schedules={schedules} 
            onBack={() => setMode(AppMode.CALENDAR)} 
            onSave={setSchedules} 
          />
        ) : null;
      case AppMode.MEMBER:
        return (
          <MemberView 
            members={members} 
            setMembers={setMembers} 
            onHome={() => setMode(AppMode.CALENDAR)} 
          />
        );
      case AppMode.NOTE:
        return (
          <NoteView 
            notes={notes}
            setNotes={setNotes}
            noteTitle={noteTitle}
            setNoteTitle={setNoteTitle}
          />
        );
      case AppMode.ACCOUNTING: // 회계 모듈 렌더링 추가
        return (
          <AccountingView />
        );
      case AppMode.YOUTUBE:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <h2 className="text-4xl font-black mb-4 tracking-tighter">YOUTUBE MODULE</h2>
            <p className="text-xl italic">추후 연동될 모듈입니다.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col transition-colors duration-500 overflow-hidden text-gray-200">
      <Header 
        mode={mode} 
        setMode={setMode} 
        title={appTitle}
        setTitle={setAppTitle} 
      />
      
      <main className="flex-grow relative overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;