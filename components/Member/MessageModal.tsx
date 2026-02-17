import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Users, MessageSquare, Paperclip, FileText, Trash2 } from 'lucide-react';
import { Member } from '../../types';
import { sendSmsMessage, uploadFiles, uploadToVercelBlob, shortenUrl, openMobileSmsApp } from '../../services/apiService';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  targets: Member[];
}

const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, targets }) => {
  // --- [상태 관리] ---
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // [신규 추가] 첨부 파일 관리 상태
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // [신규 추가] 파일 입력 요소 참조
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 모달이 열릴 때마다 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setSelectedFiles([]); // 파일 목록 초기화
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // [신규 추가] 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      // 기존 파일 목록에 추가 (중복 제거 로직은 필요 시 추가)
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  // [신규 추가] 선택된 파일 삭제 핸들러
  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  /**
   * [메시지 전송 핸들러] - 로직 업데이트
   * 1. 메시지 유효성 검사
   * 2. (파일 존재 시) 파일 업로드 수행 -> URL 획득
   * 3. 메시지 + 파일 URL 전송
   */
  const handleSend = async () => {
    const trimmedMsg = message.trim();

    // 내용이나 파일 중 하나라도 있으면 전송 가능하도록 조건 완화
    if ((!trimmedMsg && selectedFiles.length === 0) || targets.length === 0) {
      return alert("메시지 내용이나 첨부 파일이 없거나 전송 대상이 없습니다.");
    }

    // 첨부 파일 개수 확인
    const attachmentMsg = selectedFiles.length > 0 ? ` (+파일 ${selectedFiles.length}개)` : '';

    if (!window.confirm(`${targets.length}명에게 문자를 발송하시겠습니까?${attachmentMsg}\n(스마트폰의 문자 앱이 실행됩니다.)`)) return;

    setIsSending(true);
    try {
      // 연락처에서 숫자만 추출
      const phoneNumbers = targets.map(m => m.phone.replace(/\D/g, ''));

      let attachmentUrls: string[] = [];

      // [신규 로직] 첨부 파일이 있는 경우 업로드 진행 (Vercel Blob)
      if (selectedFiles.length > 0) {
        try {
          // 1. Vercel Blob 업로드
          const uploadPromises = selectedFiles.map(file => uploadToVercelBlob(file));
          attachmentUrls = await Promise.all(uploadPromises);

          console.log("파일 업로드 성공 (원본 URL 사용):", attachmentUrls);
        } catch (uploadError: any) {
          console.error("파일 업로드 실패:", uploadError);
          alert(`파일 업로드 실패: ${uploadError.message || "알 수 없는 오류"}`);
          setIsSending(false);
          return;
        }
      }

      // [변경] API 호출 대신 내 폰 문자 앱 실행
      openMobileSmsApp(phoneNumbers, trimmedMsg, attachmentUrls);

      // 모달 닫기
      onClose();

    } catch (error) {
      console.error("SMS App Launch Error:", error);
      alert("문자 앱 실행 중 오류가 발생했습니다.");
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
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="relative">
            <textarea
              className="w-full h-48 bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-orange-500/50 transition-all resize-none font-medium text-sm leading-relaxed"
              placeholder="전송할 내용을 입력하세요."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
            />

            {/* [신규 추가] 파일 첨부 버튼 (텍스트 영역 우하단) */}
            <div className="absolute bottom-3 right-3">
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-gray-300 hover:text-white transition-colors"
                title="파일 첨부"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* [신규 추가] 첨부 파일 목록 표시 */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 font-medium ml-1">
                첨부된 파일 ({selectedFiles.length})
              </p>
              <div className="bg-white/5 rounded-xl p-2 space-y-2 max-h-32 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-black/20 rounded-lg p-2 pr-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      <span className="text-xs text-gray-300 truncate max-w-[180px]">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        ({(file.size / 1024).toFixed(1)}KB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-4">
            <p className="text-[11px] text-orange-300 font-bold leading-normal">
              💡 알림: 보안이 필요한 농협 지점 데이터(.db)는 파일 첨부 기능을 통해
              안전하게 전송할 수 있습니다. 이미지는 자동으로 업로드됩니다.
            </p>
          </div>
        </div>

        {/* 푸터 섹션 */}
        <div className="p-6 pt-2 mt-auto">
          <button
            onClick={handleSend}
            disabled={isSending || (!message.trim() && selectedFiles.length === 0)}
            className="w-full py-4 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-800 text-white rounded-[1.25rem] font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-orange-900/20"
          >
            {isSending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                발송 및 업로드 중...
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