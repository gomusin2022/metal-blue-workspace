import React, { useState, useEffect } from 'react';
import { X, Send, Image as ImageIcon, Loader2, Users } from 'lucide-react';
import { Member } from '../../types';
import { sendSmsMessage } from '../../services/apiService';
import { upload } from '@vercel/blob/client'; // Vercel 전용 라이브러리

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  targets: Member[];
}

const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, targets }) => {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 파일 업로드 핸들러
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newLinks: string[] = [];
      for (const file of Array.from(files)) {
        // Vercel Blob 저장소로 직접 업로드
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload/blob', // 우리가 아까 쉘 명령어로 만든 경로
        });
        newLinks.push(blob.url);
      }

      // 업로드된 링크를 메시지 창에 자동 삽입
      const linkText = newLinks.join('\n');
      setMessage(prev => prev + (prev ? '\n\n' : '') + "[첨부이미지]\n" + linkText);
      
    } catch (error) {
      console.error("Upload error:", error);
      alert("업로드 실패: Vercel 스토리지 설정을 확인하세요.");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSend = async () => {
    const trimmedMsg = message.trim();
    if (!trimmedMsg || targets.length === 0) return;
    if (!window.confirm(`${targets.length}명에게 발송할까요?`)) return;

    setIsSending(true);
    try {
      const phoneNumbers = targets.map(m => m.phone.replace(/\D/g, ''));
      await sendSmsMessage(phoneNumbers, trimmedMsg);
      alert("전송 완료");
      onClose();
    } catch (error) {
      alert("전송 실패");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full max-w-md bg-[#1a1a2e] rounded-t-[2rem] md:rounded-[2rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg"><Users className="w-5 h-5 text-blue-400" /></div>
            <div>
              <h3 className="text-lg font-black text-white leading-tight">문자 전송</h3>
              <p className="text-[10px] text-blue-400 font-bold">대상: {targets.length}명</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative">
            <textarea
              className="w-full h-56 bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500/50 transition-all resize-none"
              placeholder="내용을 입력하거나 이미지를 추가하세요."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {isUploading && (
              <div className="absolute inset-0 bg-[#1a1a2e]/60 rounded-2xl flex flex-col items-center justify-center backdrop-blur-[2px]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <span className="text-xs font-black text-white">이미지 업로드 중...</span>
              </div>
            )}
          </div>

          <label className="flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl border border-white/5 cursor-pointer transition-all">
            <ImageIcon className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-black">이미지 추가 (Vercel Blob)</span>
            <input type="file" className="hidden" multiple accept="image/*" onChange={handleImageUpload} disabled={isUploading || isSending} />
          </label>
        </div>

        <div className="p-6 pt-2">
          <button
            onClick={handleSend}
            disabled={isSending || isUploading || !message.trim()}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white rounded-[1.25rem] font-black flex items-center justify-center gap-2 transition-all"
          >
            {isSending ? <span>발송 중...</span> : <span>메시지 전송하기</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;