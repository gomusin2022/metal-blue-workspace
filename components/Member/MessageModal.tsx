import React, { useState, useEffect } from 'react';
import { X, Send, Users, MessageSquare } from 'lucide-react';
import { Member } from '../../types';
import { sendSmsMessage } from '../../services/apiService';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  targets: Member[];
}

const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, targets }) => {
  // --- [상태 관리] ---
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // 모달이 열릴 때마다 메시지 초기화
  useEffect(() => {
    if (isOpen) {
      setMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /**
   * [메시지 전송 핸들러]
   * 작성된 텍스트 메시지를 선택된 회원들의 연락처로 발송합니다.
   * DB 파일이나 이미지는 사용자가 직접 문자 앱의 첨부 기능을 이용해 전송하는 방식입니다.
   */
  const handleSend = async () => {
    const trimmedMsg = message.trim();
    if (!trimmedMsg || targets.length === 0) {
      return alert("메시지 내용이 없거나 전송 대상이 없습니다.");
    }
    
    if (!window.confirm(`${targets.length}명에게 문자를 발송하시겠습니까?`)) return;

    setIsSending(true);
    try {
      // 연락처에서 숫자만 추출
      const phoneNumbers = targets.map(m => m.phone.replace(/\D/g, ''));
      
      // API 서비스 호출 (기존 로직 보존)
      const success = await sendSmsMessage(phoneNumbers, trimmedMsg);
      
      if (success) {
        alert("성공적으로 발송되었습니다.");
        onClose();
      } else {
        throw new Error("발송 실패");
      }
    } catch (error) {
      console.error("SMS Send Error:", error);
      alert("전송 중 오류가 발생했습니다. 네트워크 상태를 확인하세요.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full max-w-md bg-[#1a1a2e] rounded-t-[2rem] md:rounded-[2rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* 헤더 섹션 */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <MessageSquare className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white leading-tight">메시지 작성</h3>
              <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                전송 대상: {targets.length}명
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

        {/* 본문 섹션 */}
        <div className="p-6 space-y-4">
          <div className="relative">
            <textarea
              className="w-full h-64 bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-orange-500/50 transition-all resize-none font-medium text-sm leading-relaxed"
              placeholder="전송할 내용을 입력하세요. DB 파일이나 이미지는 문자 발송 시 해당 앱에서 첨부하여 보내주세요."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
            />
          </div>

          <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-4">
            <p className="text-[11px] text-orange-300 font-bold leading-normal">
              💡 알림: 보안이 필요한 농협 지점 데이터(.db)는 내 PC에 저장한 후, 
              문자나 카카오톡 파일 첨부 기능을 통해 직접 전송하는 것이 가장 안전합니다.
            </p>
          </div>
        </div>

        {/* 푸터 섹션 */}
        <div className="p-6 pt-2">
          <button
            onClick={handleSend}
            disabled={isSending || !message.trim()}
            className="w-full py-4 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-800 text-white rounded-[1.25rem] font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-orange-900/20"
          >
            {isSending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                발송 중...
              </span>
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