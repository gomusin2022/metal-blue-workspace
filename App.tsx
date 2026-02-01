/**
 * App.tsx - 메인 컨트롤러 (좌측 잘림 방지 수정판)
 */

import React, { useState, useEffect } from 'react';
import { AppMode, Schedule, Member, Note } from './types';
import Header from './components/Header';
import CalendarView from './components/Calendar/CalendarView';
import ScheduleDetail from './components/Calendar/ScheduleDetail';
import MemberView from './components/Member/MemberView';
import NoteView from './components/Note/NoteView';

const App: React.FC = () => {
  // --- [1. 시스템 설정 및 타이틀 상태] ---
  const [mode, setMode] = useState<AppMode>(AppMode.CALENDAR);
  const [appTitle, setAppTitle] = useState('Smart Workspace'); 
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
    if (savedAppTitle) setAppTitle(savedAppTitle);
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
    /* 최상단 컨테이너에서 overflow-hidden을 제거하여 보더 잘림 현상을 방지합니다. */
    <div className="min-h-screen bg-[#121212] flex flex-col transition-colors duration-500 text-gray-200">
      <Header 
        mode={mode} 
        setMode={setMode} 
        title={appTitle}
        setTitle={setAppTitle} 
      />
      
      {/* main 태그의 px-1을 통해 달력의 보더가 화면 끝에 닿아 잘리지 않도록 보호합니다. 
          overflow-x-hidden을 설정하여 불필요한 가로 스크롤은 방지하면서 세로 공간은 확보합니다.
      */}
      <main className="flex-grow relative px-1 py-1 overflow-x-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;