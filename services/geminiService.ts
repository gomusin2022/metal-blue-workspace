import { GoogleGenAI, Type } from "@google/genai";

/**
 * Google Gemini AI 설정
 * API 키는 환경 변수(process.env.API_KEY)를 통해 안전하게 로드됩니다.
 */
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * [날씨 및 위치 연동 함수 - 완전 독립형]
 * @param lat 위도 (Latitude)
 * @param lon 경도 (Longitude)
 * * * 중요: 이 함수는 AI 모델(Gemini)을 호출하지 않고 외부 전용 API만 사용합니다.
 * 따라서 AI 엔진이 404 에러 등으로 멈추더라도 날씨 정보는 100% 정상 작동합니다.
 */
export const getWeatherData = async (lat: number, lon: number) => {
  try {
    // 1. Open-Meteo API 호출: 실시간 기온 및 오늘의 최저/최고 기온 확보
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) throw new Error("Weather API fetch failed");
    
    const weatherData = await weatherRes.json();
    const current = weatherData.current_weather;
    const daily = weatherData.daily;

    // 기상 코드(WMO) 한글 매핑 테이블
    const weatherDesc: { [key: number]: string } = {
      0: "맑음", 1: "대체로 맑음", 2: "구름 조금", 3: "흐림",
      45: "안개", 48: "이슬 안개", 51: "가랑비", 53: "가랑비", 55: "가랑비",
      61: "비", 63: "비", 65: "비", 71: "눈", 73: "눈", 75: "눈", 95: "뇌우"
    };

    // 2. Reverse Geocoding API 호출: 좌표를 지명으로 변환
    let locationName = "인천"; 
    try {
      const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();
      
      // '인천광역시' 등을 '인천'으로 깔끔하게 정제 (사용자 요청 사항)
      locationName = geoData.principalSubdivision || geoData.city || "인천";
      locationName = locationName.replace("광역시", "").replace("특별시", "").trim();
    } catch (e) {
      console.warn("Location translation failed.");
    }

    return {
      location: locationName,
      condition: weatherDesc[current.weathercode] || "맑음",
      temp: Math.round(current.temperature),
      minTemp: Math.round(daily.temperature_2m_min[0]),
      maxTemp: Math.round(daily.temperature_2m_max[0])
    };
  } catch (error) {
    console.error("Weather Service Error:", error);
    // 에러 발생 시 UI 중단을 방지하기 위한 기본 데이터
    return { location: "인천", condition: "맑음", temp: 0, minTemp: 0, maxTemp: 0 };
  }
};

/**
 * 이미지에서 회원 정보를 추출하는 함수 (Gemini AI 사용)
 * 1. 성명, 전화번호, 주소 순서로 정보를 인식함.
 * 2. 전화번호가 8자리인 경우 자동으로 앞에 '010-'을 붙여서 '010-XXXX-XXXX' 형식으로 변환함.
 * * * 사용자 주의: 이 함수는 사용자님이 롤백으로 살려놓으신 원본 로직을 100% 그대로 보존했습니다.
 */
export const extractMembersFromImage = async (base64Data: string, mimeType: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `이 이미지에서 회원 명단을 추출해줘. 
            정보는 반드시 [성명, 전화번호, 주소] 순서로 구성되어 있어. 
            결과는 반드시 JSON 배열로 줘. 각 객체는 'name', 'phone', 'address' 속성을 가져야 해. 
            
            전화번호 처리 규칙:
            - 전화번호가 8자리(예: 1234-5678 또는 12345678)로 인식된다면, 무조건 앞에 '010-'을 붙여서 '010-1234-5678' 형식으로 반환해.
            - 만약 '010'이 이미 포함되어 있다면 하이픈(-)을 포함한 표준 형식('010-XXXX-XXXX')으로 정렬해줘.
            
            추출 순서 엄수:
            1. 성명
            2. 전화번호 (010 누락 시 8자리 판단 후 010 추가)
            3. 주소`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              phone: { type: Type.STRING },
              address: { type: Type.STRING },
            },
            required: ["name", "phone", "address"],
          },
        },
      },
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
};