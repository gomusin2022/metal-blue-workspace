# 구현 계획 - SMS 파일 첨부 기능

문자 메시지 발송 시 파일 업로드를 필수 기능으로 구현합니다.

## 사용자 검토 필요

> [!IMPORTANT]
> 이 계획은 현재 로컬 서버에서 실행 중인 `server.js`의 `/api/upload` 엔드포인트를 사용한다고 가정합니다.
> `sendSmsMessage` 함수는 현재 실제로 문자를 발송하지 않고 콘솔에 로그만 출력합니다. 이 함수를 수정하여 파일 URL을 포함하도록 업데이트할 예정입니다.

## 변경 제안

### 백엔드 (Backend)
`server.js`는 이미 `/api/upload`를 지원하므로 변경할 필요가 없습니다.

### 서비스 (Services)

#### [수정] [apiService.ts](file:///c:/Users/roi/Desktop/metal-dark-dulregil/services/apiService.ts)
- `uploadFiles`: `/api/upload` 엔드포인트로 파일을 업로드하는 함수를 추가합니다.
- `sendSmsMessage`: `attachments: string[]` (첨부 파일 URL 배열)을 인자로 받도록 함수 시그니처를 수정합니다.
- `sendSmsMessage`: 요청 본문에 `attachments`를 포함하도록 수정합니다.

### UI 컴포넌트 (UI Components)

#### [수정] [MessageModal.tsx](file:///c:/Users/roi/Desktop/metal-dark-dulregil/components/Member/MessageModal.tsx)
- `files`: 선택된 파일들을 관리하기 위한 상태(State)를 추가합니다.
- **파일 선택 UI**: 클립 아이콘 등을 사용하여 파일 선택 버튼을 추가합니다.
- **파일 목록 UI**: 선택된 파일을 보여주고, 필요 시 삭제할 수 있는 기능을 추가합니다.
- `handleSend`: 전송 버튼 클릭 시 동작을 다음과 같이 수정합니다:
    1. `uploadFiles`를 호출하여 선택된 파일을 먼저 업로드합니다.
    2. 업로드된 파일의 URL을 받아 `sendSmsMessage`에 전달합니다.

## 검증 계획

### 수동 검증
1.  애플리케이션을 실행합니다.
2.  회원 관리(User/Member management) 페이지로 이동합니다.
3.  회원을 선택하고 "메시지 보내기(Send Message)" 버튼을 클릭합니다.
4.  모달 창에서 첨부 파일 버튼을 클릭하고 파일을 선택합니다 (이미지 또는 테스트 파일).
5.  선택한 파일이 UI 목록에 표시되는지 확인합니다.
6.  "전송(Send)" 버튼을 클릭합니다.
7.  브라우저 콘솔을 확인하여 `sendSmsMessage` 로그에 파일 URL이 포함되어 있는지 확인합니다.
8.  `server.js` 콘솔 출력을 확인하여 파일이 `uploads` 디렉토리에 저장되었는지 확인합니다.
