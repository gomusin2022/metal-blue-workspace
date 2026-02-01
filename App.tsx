/**
 * App.tsx - 메인 컨트롤러 (화면 꽉 찬 레이아웃 복구판)
 */

import React, { useState, useEffect } from 'react';
import { AppMode, Schedule, Member, Note } from './types';
import Header from './components/Header';
import CalendarView from './components/Calendar/CalendarView';
import ScheduleDetail from './components/Calendar/ScheduleDetail';
import MemberView from './components/Member/MemberView';
import NoteView from './components/Note/NoteView';

const App: React.FC = () => {
  // --- [1. 상태 관리] ---
  const [mode, setMode] = useState<AppMode>(AppMode.CALENDAR);
  const [appTitle, setAppTitle] = useState('Smart Workspace'); 
  const [noteTitle, setNoteTitle] = useState('Standard Note'); 

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [notes, setNotes] = useState<Note[]>([]); 
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // --- [2. 데이터 로드 및 저장] ---
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

  useEffect(() => {
    localStorage.setItem('metal_schedules', JSON.stringify(schedules));
    localStorage.setItem('metal_members', JSON.stringify(members));
    localStorage.setItem('metal_notes', JSON.stringify(notes));
    localStorage.setItem('app_main_title', appTitle);
    localStorage.setItem('app_note_title', noteTitle);
  }, [schedules, members, notes, appTitle, noteTitle]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setMode(AppMode.SCHEDULE_DETAIL);
  };

  const renderContent = () => {
    switch (mode) {
      case AppMode.CALENDAR:
        return <CalendarView schedules={schedules} onDateClick={handleDateClick} onUpdateSchedules={setSchedules} />;
      case AppMode.SCHEDULE_DETAIL:
        return selectedDate ? <ScheduleDetail selectedDate={selectedDate} schedules={schedules} onBack={() => setMode(AppMode.CALENDAR)} onSave={setSchedules} /> : null;
      case AppMode.MEMBER:
        return <MemberView members={members} setMembers={setMembers} onHome={() => setMode(AppMode.CALENDAR)} />;
      case AppMode.NOTE:
        return <NoteView notes={notes} setNotes={setNotes} noteTitle={noteTitle} setNoteTitle={setNoteTitle} />;
      case AppMode.YOUTUBE:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <h2 className="text-4xl font-black mb-4 tracking-tighter">YOUTUBE</h2>
            <p className="text-xl italic">추후 연동될 모듈입니다.</p>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col transition-colors duration-500 text-gray-200">
      <Header mode={mode} setMode={setMode} title={appTitle} setTitle={setAppTitle} />
      
      {/* [해결책] main에 p-1(약 4px)을 주어 자식의 border-4가 잘리지 않을 공간을 부모가 확보합니다. 
        너비는 다시 w-full 수준으로 꽉 차게 복구됩니다.
      */}
      <main className="flex-grow relative p-1 overflow-x-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;