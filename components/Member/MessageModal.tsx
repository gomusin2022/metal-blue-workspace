import React, { useState, useEffect } from 'react';
import { X, Send, Image as ImageIcon, Link as LinkIcon, Loader2, Users } from 'lucide-react';
import { Member } from '../../types';
import { sendSmsMessage } from '../../services/apiService';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  targets: Member[];
}

const MessageModal: React.FC<MessageModalProps> = ({ isOpen, onClose, targets }) => {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [fileLinks, setFileLinks] = useState<string[]>([]);

  // 본인의 Cloudinary 설정값 입력 (환경변수 권장)
  const CLOUD_NAME = "본인의_CLOUD_NAME"; 
  const UPLOAD_PRESET = "본인의_UPLOAD_PRESET"; 

  useEffect(() => {
    if (isOpen) {
      setMessage('');
      setFileLinks([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Cloudinary 직접 업로드 처리
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newLinks: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) throw new Error('업로드 실패');
        
        const data = await response.json();
        newLinks.push(data.secure_url); // 생성된 퍼블릭 URL
      }

      setFileLinks(prev => [...prev, ...newLinks]);
      const linkText = newLinks.join('\n');
      setMessage(prev => prev + (prev ? '\n\n' : '') + "[첨부파일]\n" + linkText);
      
    } catch (error) {
      console.error("Upload error:", error);
      alert("파일 업로드 중 오류가 발생했습니다. 설정값을 확인하세요.");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSend = async () => {
    const trimmedMsg = message.trim();
    if (!trimmedMsg) return alert("전송할 메시지 내용을 입력하세요.");
    if (targets.length === 0) return alert("수신 대상이 없습니다.");

    if (!window.confirm(`${targets.length}명에게 문자를 발송할까요?`)) return;

    setIsSending(true);
    try {
      const phoneNumbers = targets.map(m => m.phone.replace(/\D/g, ''));
      await sendSmsMessage(phoneNumbers, trimmedMsg);
      alert("전송 요청을 완료했습니다.");
      onClose();
    } catch (error) {
      console.error("Send error:", error);
      alert("문자 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full max-w-md bg-[#1a1a2e] rounded-t-[2rem] md:rounded-[2rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white leading-tight">문자 전송</h3>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                Target: {targets.length} Members
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="relative">
            <label className="text-[10px] text-gray-500 font-black mb-1.5 ml-1 block uppercase">Message Content</label>
            <textarea
              className="w-full h-56 bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium outline-none focus:border-blue-500/50 transition-all resize-none"
              placeholder="파일을 추가하면 여기에 링크가 자동으로 삽입됩니다."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {isUploading && (
              <div className="absolute inset-0 bg-[#1a1a2e]/60 rounded-2xl flex flex-col items-center justify-center backdrop-blur-[2px] z-10">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <span className="text-xs font-black text-white">클라우드 업로드 중...</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <label className="flex-grow flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl border border-white/5 cursor-pointer transition-all">
              <ImageIcon className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-black">이미지 추가</span>
              <input 
                type="file" 
                className="hidden" 
                multiple 
                accept="image/*"
                onChange={handleImageUpload} 
                disabled={isUploading || isSending} 
              />
            </label>
            <div className="px-4 flex items-center bg-white/5 rounded-2xl border border-white/5">
              <span className="text-xs font-black text-blue-400">{message.length}자</span>
            </div>
          </div>

          {fileLinks.length > 0 && (
            <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Public Links</span>
              </div>
              <div className="max-h-20 overflow-y-auto">
                {fileLinks.map((link, i) => (
                  <p key={i} className="text-[10px] text-gray-500 truncate font-mono">{link}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pt-2">
          <button
            onClick={handleSend}
            disabled={isSending || isUploading || !message.trim()}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-[1.25rem] font-black flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(37,99,235,0.3)] transition-all"
          >
            {isSending ? (
              <><Loader2 className="w-5 h-5 animate-spin" /><span>발송 중...</span></>
            ) : (
              <><Send className="w-5 h-5" /><span>메시지 전송하기</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;