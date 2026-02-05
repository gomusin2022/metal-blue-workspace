/**
 * Metal Dark Suite - 공통 타입 정의
 * * * 원칙 준수 사항:
 * 1. 철저한 모듈화: 모든 데이터 모델을 인터페이스로 명확히 정의
 * 2. 꼼꼼한 주석: 각 필드의 용도와 데이터 포맷을 상세히 기술
 * 3. 무결성 유지: MemberView.tsx의 실로직과 100% 동기화 (누락 방지)
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

/**
 * 3. 회원(Member) 데이터 구조
 * MemberView.tsx의 렌더링 및 편집 로직과 100% 일치하도록 구성
 */
export interface Member {
  id: string;        // 내부 고유 ID (generateId)
  sn: number;        // 순번 (DB 시퀀스: id 필드로도 매핑됨)
  branch: string;    // 지점 (본점, 제일, 신촌 등)
  name: string;      // 성명
  position: string;  // 직책 (회원, 총무 등)
  phone: string;     // 전화번호 (010-XXXX-XXXX)
  address: string;   // 주소 (addr 필드 매핑)
  joined: string;    // 가입 연도 (예: '26', 빈 문자열 가능)
  fee: boolean;      // 회비 납부 여부
  attendance: boolean; // 출석 여부
  carNumber: string; // 차량 번호 ('1'~'6', 에러 해결 핵심 필드)
  memo?: string;     // 메모 (note 필드 매핑)
}

// 4. 노트(Note) 데이터 구조
export interface Note {
  id: string;
  content: string;   // 메모 본문 내용
  createdAt: string; // 작성 시간 (YYYY-MM-DD HH:mm:ss 포맷)
}

// 5. 날씨(Weather) 정보 구조
export interface WeatherInfo {
  location: string;  // 지역명
  condition: string; // 기상 상태
  temp: number;      // 현재 기온
  minTemp: number;   // 최저 기온
  maxTemp: number;   // 최고 기온
}