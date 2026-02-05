/**
 * Metal Dark Suite - 공통 타입 정의
 * * 원칙 준수 사항:
 * 1. 철저한 모듈화: 모든 데이터 모델을 인터페이스로 명확히 정의
 * 2. 꼼꼼한 주석: 각 필드의 용도와 데이터 포맷을 상세히 기술
 * 3. 누락 절대 금지: MemberView.tsx의 실 로직 및 에러 로그와 100% 동기화
 */

// 1. 애플리케이션 모드 (네비게이션)
export enum AppMode {
  CALENDAR = 'CALENDAR',         // 달력 보기
  MEMBER = 'MEMBER',             // 회원 관리
  SCHEDULE_DETAIL = 'SCHEDULE_DETAIL', // 상세 일정
  NOTE = 'NOTE',                 // 노트(메모) 관리
  YOUTUBE = 'YOUTUBE'            // 유튜브 연동
}

// 2. 일정(Schedule) 데이터 구조
export interface Schedule {
  id: string;
  date: string;      // ISO 포맷 (YYYY-MM-DD)
  startTime: string; // 시간 포맷 (HH:mm)
  endTime: string;   // 시간 포맷 (HH:mm)
  title: string;     // 일정 제목
}

// 3. 회원(Member) 데이터 구조
// MemberView.tsx의 실제 사용 로직 및 에러 로그(carNumber 등)와 100% 동기화됨
export interface Member {
  id: string;
  sn: number;        // 순번 (Serial Number)
  branch: string;    // 지점명 (MemberView에서 참조)
  name: string;      // 성명
  position: string;  // 직책 (회원, 총무 등)
  phone: string;     // 전화번호 (010-XXXX-XXXX)
  address: string;   // 주소
  fee: boolean;      // 회비 납부 여부
  attendance: boolean; // 출석 여부
  joined: string;    // 가입 정보 (MemberView에서 '26' 등의 연도 문자열로 처리됨)
  carNumber: string; // 차량 번호 (에러 로그 해결을 위한 필수 필드 추가)
  memo?: string;     // 추가 메모 (note 필드 매핑)
}

// 4. 노트(Note) 데이터 구조 (신규 추가)
// 누적 기록 및 엑셀 연동을 위한 구조
export interface Note {
  id: string;
  content: string;   // 메모 본문 내용
  createdAt: string; // 작성 시간 (YYYY-MM-DD HH:mm:ss 포맷)
}

// 5. 날씨(Weather) 정보 구조
// Header.tsx의 날씨 상세 표시 로직과 동기화됨
export interface WeatherInfo {
  location: string;  // 지역명
  condition: string; // 기상 상태 (예: 흐림, 맑음)
  temp: number;      // 현재 기온
  minTemp: number;   // 최저 기온
  maxTemp: number;   // 최고 기온
}