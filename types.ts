/**
 * types.ts - Metal Blue WorkSpace 공통 타입 정의 (완전판)
 * 원칙 준수 사항:
 * 1. 기존 도메인(달력, 회원, 노트) 데이터 구조 100% 유지
 * 2. 회계 모듈(ACCOUNTING) 구조 통합 및 상세 주석 추가
 * 3. 누락 절대 금지 원칙 준수
 */

// 1. 애플리케이션 모드 (네비게이션)
export enum AppMode {
  CALENDAR = 'CALENDAR',         // 달력 보기
  MEMBER = 'MEMBER',             // 회원 관리
  SCHEDULE_DETAIL = 'SCHEDULE_DETAIL', // 상세 일정
  NOTE = 'NOTE',                 // 노트(메모) 관리
  YOUTUBE = 'YOUTUBE',           // 유튜브 연동
  ACCOUNTING = 'ACCOUNTING'      // 범용 회계장부 모듈 (신규 추가)
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
export interface Member {
  id: string;
  sn: number;        // 순번 (Serial Number)
  branch: string;    // 지점명
  name: string;      // 성명
  position: string;  // 직책
  phone: string;     // 전화번호
  address: string;   // 주소
  fee: boolean;      // 회비 납부 여부
  attendance: boolean; // 출석 여부
  joined: string;    // 가입 정보
  carNumber: string; // 차량 번호
  memo?: string;     // 추가 메모
}

// 4. 노트(Note) 데이터 구조
export interface Note {
  id: string;
  content: string;   // 메모 본문 내용
  createdAt: string; // 작성 시간 (YYYY-MM-DD HH:mm:ss)
}

// 5. 회계(Accounting) 데이터 구조 (신규 추가)
// 어제 분석한 엑셀 시트 컬럼 구조와 100% 동기화
export interface AccountingEntry {
  id: string;
  date: string;      // 날짜 (YYYY-MM-DD)
  hour: number;      // 시간 (시)
  minute: number;    // 시간 (분)
  type: '수입' | '지출'; // 구분
  item: string;      // 수입/지출 내역 (항목)
  incomeAmount: number; // 수입 금액
  expenseAmount: number; // 지출 금액
  balance: number;   // 누계 (실시간 계산)
}

// 다중 장부(시트) 관리를 위한 구조
export interface AccountingSheet {
  id: string;
  name: string;      // 시트 제목 (예: 운영비, 지원금)
  entries: AccountingEntry[]; // 해당 시트의 데이터 리스트
}

// 6. 날씨(Weather) 정보 구조
export interface WeatherInfo {
  location: string;  // 지역명
  condition: string; // 기상 상태
  temp: number;      // 현재 기온
  minTemp: number;   // 최저 기온
  maxTemp: number;   // 최고 기온
}