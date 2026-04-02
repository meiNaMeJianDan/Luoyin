import React from 'react';

interface ImageViewerProps {
  isOpen: boolean;
  src: string;
  alt: string;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ isOpen, src, alt, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-5xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} // 阻止点击图片时关闭
      >
        {/* 关闭按钮 */}
        <button
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
          onClick={onClose}
          aria-label="关闭图片"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
          </svg>
        </button>
        
        {/* 图片 */}
        <img 
          src={src} 
          alt={alt} 
          className="rounded-lg max-w-full max-h-[90vh] object-contain"
        />
      </div>
    </div>
  );
};

export default ImageViewer;