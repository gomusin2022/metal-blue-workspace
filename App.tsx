/**
 * App.tsx - 메인 컨트롤러 (너비 수정판)
 * 원칙 준수 사항:
 * 1. 소스 누락 금지: 기존 달력, 상세일정, 회원관리 로직 전체 유지
 * 2. 레이아웃 수정: main 영역의 너비 제약 해제
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

  // --- [3. 화면 렌더링 로직] ---
  const renderContent = () => {
    switch (mode) {
      case AppMode.CALENDAR:
        return (
          <CalendarView 
            schedules={schedules} 
            onDateClick={(date) => {
              setSelectedDate(date);
              setMode(AppMode.SCHEDULE_DETAIL);
            }} 
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
    /* 최상위 컨테이너에서 좌우 여백 발생 요인 제거 */
    <div className="min-h-screen bg-[#121212] flex flex-col transition-colors duration-500 overflow-x-hidden text-gray-200">
      <Header 
        mode={mode} 
        setMode={setMode} 
        title={appTitle}
        setTitle={setAppTitle}
      />
      
      {/* 수정 사항: 
        1. w-full을 명시하여 부모 너비를 꽉 채움
        2. flex-grow와 함께 overflow-hidden을 조정하여 자식이 삐져나가지 않으면서 풀사이즈 유지 
      */}
      <main className="flex-grow relative w-full overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;