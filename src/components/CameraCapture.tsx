import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, RefreshCcw, Check } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, // Prefer back camera for scanning
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Aduh Nak, Ibu tidak bisa mengakses kameramu. Pastikan kamu sudah memberi izin ya.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-black flex flex-col"
    >
      <div className="p-4 flex justify-between items-center bg-black/50 backdrop-blur-md absolute top-0 w-full z-10">
        <h3 className="text-white font-bold uppercase tracking-widest text-xs">Kamera Pendeteksi Jawaban</h3>
        <button onClick={onClose} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative bg-black">
        {error ? (
          <div className="text-center p-8 text-white">
            <p className="mb-4">{error}</p>
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-warm-accent text-warm-bg rounded-full font-bold"
            >
              Kembali
            </button>
          </div>
        ) : (
          <>
            {!capturedImage ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-contain"
              />
            ) : (
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="w-full h-full object-contain" 
              />
            )}
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="p-8 bg-black/50 backdrop-blur-md flex justify-center items-center gap-8 absolute bottom-0 w-full">
        {!capturedImage ? (
          <button 
            onClick={capturePhoto}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform"
          >
            <div className="w-16 h-16 border-4 border-black rounded-full" />
          </button>
        ) : (
          <div className="flex gap-12">
            <button 
              onClick={retake}
              className="flex flex-col items-center gap-2 text-white group"
            >
              <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <RefreshCcw className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Ulangi</span>
            </button>
            <button 
              onClick={confirm}
              className="flex flex-col items-center gap-2 text-white group"
            >
              <div className="w-14 h-14 bg-warm-accent rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Check className="w-6 h-6 text-warm-bg" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Gunakan</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
