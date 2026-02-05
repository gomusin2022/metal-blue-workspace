import React, { useState, useEffect } from 'react';
import { X, Send, Paperclip, Loader2, Users } from 'lucide-react';
import { Member } from '../../types';
import { sendSmsMessage, uploadToVercelBlob } from '../../services/apiService';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  targets: Member[];
}

const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, targets }) => {
  // --- [상태 관리] ---
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false); // 파일 업로드 진행 상태
  const [isSending, setIsSending] = useState(false);     // 문자 발송 진행 상태

  // 모달이 열릴 때마다 메시지 작성란 초기화
  useEffect(() => {
    if (isOpen) {
      setMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /**
   * [파일 업로드 및 본문 링크 삽입 핸들러]
   * Vercel Blob을 사용하여 파일을 업로드하고 반환된 URL을 메시지 본문에 자동 추가합니다.
   * 이미지뿐만 아니라 모든 일반 파일 형식을 지원합니다.
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true); // 업로드 로딩 시작
    try {
      const newLinks: string[] = [];
      
      // 다중 파일 선택 대응을 위한 루프 (필요 시 복수 업로드 가능)
      for (const file of Array.from(files)) {
        // apiService의 Vercel Blob 업로드 함수 호출
        const blobUrl = await uploadToVercelBlob(file);
        
        // 파일 타입(MIME)에 따라 구분 태그 생성
        const tag = file.type.startsWith('image/') ? '[이미지]' : '[파일]';
        newLinks.push(`${tag}\n${blobUrl}`);
      }

      // 기존 메시지 내용 하단에 생성된 링크들을 개행과 함께 추가
      const linkText = newLinks.join('\n\n');
      setMessage(prev => {
        const prefix = prev ? prev + '\n\n' : '';
        return `${prefix}${linkText}`;
      });
      
      // 성공 알림 (선택 사항)
      // alert("파일이 업로드되어 본문에 링크가 삽입되었습니다.");
      
    } catch (error) {
      console.error("Vercel Blob Upload Error:", error);
      alert("파일 업로드 중 오류가 발생했습니다. 서버 설정을 확인하세요.");
    } finally {
      setIsUploading(false); // 업로드 로딩 해제
      if (e.target) e.target.value = ''; // 동일 파일 재선택이 가능하도록 input 초기화
    }
  };

  /**
   * [메시지 전송 핸들러]
   * 최종 작성된 텍스트(링크 포함)를 선택된 회원들의 연락처로 발송합니다.
   */
  const handleSend = async () => {
    const trimmedMsg = message.trim();
    if (!trimmedMsg || targets.length === 0) {
      return alert("메시지 내용이 없거나 전송 대상이 없습니다.");
    }
    
    if (!window.confirm(`${targets.length}명에게 문자를 발송하시겠습니까?`)) return;

    setIsSending(true); // 전송 로딩 시작
    try {
      // 연락처에서 하이픈 제거 후 숫자만 추출
      const phoneNumbers = targets.map(m => m.phone.replace(/\D/g, ''));
      
      // SMS 발송 API 호출
      await sendSmsMessage(phoneNumbers, trimmedMsg);
      
      alert("성공적으로 발송되었습니다.");
      onClose(); // 발송 성공 시 모달 닫기
    } catch (error) {
      console.error("SMS Send Error:", error);
      alert("전송 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false); // 전송 로딩 해제
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4">
      {/* 모달 컨테이너 */}
      <div className="w-full max-w-md bg-[#1a1a2e] rounded-t-[2rem] md:rounded-[2rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* 헤더 섹션 */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white leading-tight">문자 전송</h3>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                Target: {targets.length} members
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 본문 섹션: 입력창 및 업로드 제어 */}
        <div className="p-6 space-y-4">
          <div className="relative">
            <textarea
              className="w-full h-64 bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500/50 transition-all resize-none font-medium text-sm leading-relaxed"
              placeholder="전송할 내용을 입력하세요. 파일을 첨부하면 링크가 자동으로 삽입됩니다."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
            />
            
            {/* 파일 업로드 시 오버레이 로더 */}
            {isUploading && (
              <div className="absolute inset-0 bg-[#1a1a2e]/60 rounded-2xl flex flex-col items-center justify-center backdrop-blur-[2px] z-10">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Uploading to Vercel Blob...
                </span>
              </div>
            )}
          </div>

          {/* 통합 파일 첨부 버튼 (Paperclip 아이콘 활용) */}
          <label className={`flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl border border-white/5 cursor-pointer transition-all ${isUploading || isSending ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}>
            <Paperclip className="w-5 h-5 text-orange-400" />
            <span className="text-sm font-black">파일 및 이미지 첨부</span>
            <input 
              type="file" 
              className="hidden" 
              multiple 
              onChange={handleFileUpload} 
              disabled={isUploading || isSending} 
            />
          </label>
        </div>

        {/* 푸터 섹션: 전송 버튼 */}
        <div className="p-6 pt-2">
          <button
            onClick={handleSend}
            disabled={isSending || isUploading || !message.trim()}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white rounded-[1.25rem] font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-900/20"
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>발송 중...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>메시지 전송하기</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;