// src/services/apiService.ts

/**
 * 이미지를 구글 드라이브에 업로드하고 공유 링크를 반환합니다.
 */
export const uploadToGoogleDrive = async (files: FileList): Promise<string[]> => {
  // 실제 API 주소를 여기에 입력해야 합니다. (기존에 쓰시던 endpoint)
  const API_ENDPOINT = 'YOUR_GOOGLE_APPS_SCRIPT_URL_OR_SERVER_URL';
  
  const uploadPromises = Array.from(files).map(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // 이 부분은 기존에 사용하시던 API 규격에 맞춰 수정이 필요할 수 있습니다.
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) throw new Error('Upload failed');
    const data = await response.json();
    return data.url; // 생성된 드라이브 링크
  });

  return Promise.all(uploadPromises);
};

/**
 * 문자 전송 API를 호출합니다.
 */
export const sendSmsMessage = async (numbers: string[], content: string) => {
  // 문자 전송 서비스 연동 로직
  console.log("Sending SMS to:", numbers, "Content:", content);
  // 실제 호출부: return await fetch('/api/sms', { ... });
  return true;
};