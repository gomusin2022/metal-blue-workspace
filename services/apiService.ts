// src/services/apiService.ts

/**
 * 이미지를 구글 드라이브에 업로드하고 공유 링크를 반환합니다.
 */
export const uploadToGoogleDrive = async (files: FileList): Promise<string[]> => {
  // 1. 이미지에서 [키 표시]를 눌러 나온 AIza...로 시작하는 키를 아래 작은따옴표 사이에 넣으세요.
  const API_KEY = 'AIzaSyAI7VWPxYup1dJrbcJ20Aq199hWis9UK8s'; 
  
  // 2. 주신 폴더 주소에서 추출한 ID입니다.
  const FOLDER_ID = '1Un2C7fDMjMS18As41yJAMPlY-xU57MhJ';

  // 3. 구글 드라이브 정식 업로드 엔드포인트
  const API_ENDPOINT = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&key=${API_KEY}`;
  
  const uploadPromises = Array.from(files).map(async (file) => {
    // 구글 API 규격에 맞는 메타데이터 설정 (부모 폴더 지정)
    const metadata = {
      name: file.name,
      parents: [FOLDER_ID]
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', file);
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        console.error("Google Drive API 오류 상세:", errorData);
        throw new Error('구글 드라이브 업로드 실패');
    }

    const data = await response.json();
    // 생성된 파일 ID를 바탕으로 접근 가능한 URL 반환
    return `https://drive.google.com/file/d/${data.id}/view?usp=sharing`;
  });

  return Promise.all(uploadPromises);
};

/**
 * 문자 전송 API를 호출합니다.
 */
export const sendSmsMessage = async (numbers: string[], content: string) => {
  // 현재는 로그만 출력하도록 되어 있습니다. 필요 시 실제 SMS API 연동 코드를 추가하세요.
  console.log("문자 전송 대상:", numbers, "내용:", content);
  return true;
};