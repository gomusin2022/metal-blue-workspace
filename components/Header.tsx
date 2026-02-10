/**
 * Header.tsx - 메인 타이틀바 및 네비게이션 (완전판)
 * 수정사항: AppMode.ACCOUNTING 버튼 추가 및 기존 기상/시계 로직 유지
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Users, MapPin, CloudSun, StickyNote, Youtube, Wallet } from 'lucide-react';
import { AppMode, WeatherInfo } from '../types';
import { getWeatherData } from '../services/geminiService';

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  title: string;
  setTitle: (title: string) => void;
}

const Header: React.FC<HeaderProps> = ({ mode, setMode, title, setTitle }) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);

  // 초기 타이틀 교정 로직 유지
  useEffect(() => {
    const correctedTitle = "Metal Blue WorkSpace";
    if (!title || title === "기본 타이틀" || title === "New Project" || title === "Smart Workspace" || title === "Metal Blue WorkScpace") {
      setTitle(correctedTitle);
    }
  }, []);

  // 실시간 시계 로직 유지
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 기상 정보 로치 유지
  useEffect(() => {
    const fetchWeather = async () => {
      setIsLoadingWeather(true);
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const data = await getWeatherData(pos.coords.latitude, pos.coords.longitude);
              if (data) setWeather(data);
            } catch (e) {
              console.error("날짜 정보 로드 실패:", e);
            } finally {
              setIsLoadingWeather(false);
            }
          },
          () => setIsLoadingWeather(false)
        );
      } else {
        setIsLoadingWeather(false);
      }
    };
    fetchWeather();
  }, []);

  const formatDate = (date: Date) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')} (${days[date.getDay()]})`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  return (
    <header className="sticky top-0 z-50 bg-[#1a1a2e] border-b border-[#3a3a5e] p-4 flex flex-col shadow-2xl gap-3">
      {/* 상단 라인: 타이틀 및 시계 */}
      <div className="flex items-center justify-between w-full">
        <div className="flex-grow flex justify-start overflow-hidden">
          {isEditingTitle ? (
            <input
              autoFocus
              className="bg-[#2c2c2e] border border-blue-500 rounded-lg px-2 py-1 text-2xl md:text-4xl font-black text-white outline-none w-full max-w-md"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
            />
          ) : (
            <h1 
              className="text-[26px] sm:text-3xl md:text-5xl lg:text-6xl font-black cursor-pointer tracking-tighter bg-gradient-to-r from-cyan-200 via-blue-300 to-cyan-100 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(147,197,253,0.5)] truncate"
              onClick={() => setIsEditingTitle(true)}
            >
              {title}
            </h1>
          )}
        </div>
        
        <div className="flex flex-col text-right shrink-0 min-w-[110px] md:min-w-[220px]">
          <span className="text-blue-400 text-[11px] md:text-xl font-bold mb-1">
            {formatDate(currentTime)}
          </span>
          <span className="text-blue-400 text-lg md:text-4xl font-black tracking-tighter tabular-nums">
            {formatTime(currentTime)}
          </span>
        </div>
      </div>

      {/* 하단 라인: 메뉴 버튼 및 날씨 정보 */}
      <div className="flex items-center justify-between w-full border-t border-[#3a3a5e]/30 pt-2">
        <div className="flex items-center space-x-2 md:space-x-4">
          {[
            { mode: AppMode.CALENDAR, Icon: Calendar },
            { mode: AppMode.MEMBER, Icon: Users },
            { mode: AppMode.NOTE, Icon: StickyNote },
            { mode: AppMode.ACCOUNTING, Icon: Wallet }, // 회계장부 버튼 (지시사항 반영)
            { mode: AppMode.YOUTUBE, Icon: Youtube }
          ].map(({ mode: itemMode, Icon }) => (
            <button
              key={itemMode}
              onClick={() => {
                if (itemMode === AppMode.YOUTUBE) {
                  window.open("https://www.youtube.com", "_blank");
                } else {
                  setMode(itemMode);
                }
              }}
              className={`p-2 md:p-3.5 rounded-lg transition-all active:scale-95 ${
                mode === itemMode 
                  ? 'bg-blue-600 scale-105 shadow-lg shadow-blue-900' 
                  : 'bg-[#2c2c2e] hover:bg-[#3a3a5e]'
              }`}
            >
              <Icon 
                className={`w-5 h-5 md:w-9 md:h-9 ${
                  itemMode === AppMode.YOUTUBE ? 'text-[#FF0000]' : 'text-white'
                }`} 
              />
            </button>
          ))}
        </div>

        <div className="flex flex-col text-right leading-tight shrink-0">
          {!weather || isLoadingWeather ? (
            <div className="animate-pulse flex flex-col items-end space-y-1">
              <div className="h-3 bg-[#2c2c2e] rounded w-20"></div>
              <div className="h-5 bg-[#2c2c2e] rounded w-24"></div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-end text-blue-400 text-[12px] md:text-lg font-bold whitespace-nowrap space-x-1 mb-0.5">
                <span className="text-blue-500">{weather.minTemp}°</span>
                <span className="text-gray-500">/</span>
                <span className="text-rose-500">{weather.maxTemp}°</span>
                <MapPin className="w-3.5 h-3.5 ml-0.5 text-blue-500" />
                <span>{weather.location}</span>
              </div>
              <div className="flex items-center justify-end text-emerald-400 text-[16px] md:text-[28px] font-black tracking-tighter">
                <CloudSun className="w-5 h-5 md:w-8 md:h-8 mr-1.5" />
                <span>{weather.temp}°C {weather.condition}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;