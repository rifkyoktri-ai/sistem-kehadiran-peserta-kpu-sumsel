import React, { useState, useRef, useEffect, useCallback } from 'react';

const KameraCapture = ({ onChange, required = true, label = "Foto Wajah", error }) => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'preview' | 'captured'
  const [facingMode, setFacingMode] = useState('user');
  const [photoData, setPhotoData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (mode = facingMode) => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setStatus('preview');
    } catch (err) {
      console.error("Error accessing camera: ", err);
      setErrorMsg("Kamera tidak ditemukan atau akses ditolak.");
      setStatus('idle');
    }
  }, [facingMode]);

  useEffect(() => {
    // Cleanup ketika komponen di-unmount
    return () => stopCamera();
  }, [stopCamera]);

  const handleToggleCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    stopCamera();
    await startCamera(newMode);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    // Jika kamera depan, flip horizontal agar tidak terbalik (mirror) saat dirender ke canvas
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.9);

    setPhotoData(base64Image);
    setStatus('captured');
    stopCamera();

    if (onChange) {
      onChange(base64Image);
    }
  };

  const handleRetake = () => {
    setPhotoData(null);
    if (onChange) {
      onChange(null);
    }
    startCamera();
  };

  const displayError = error || errorMsg;

  return (
    <div className="w-full flex flex-col gap-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {displayError && (
        <div className="p-3 text-sm text-red-600 bg-red-100 rounded-md font-body font-medium">
          {displayError}
        </div>
      )}

      <div className={`relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden border flex items-center justify-center ${error ? 'border-red-500 ring-2 ring-red-500/20' : 'border-gray-300'}`}>
        {status === 'idle' && (
          <button
            type="button"
            onClick={() => startCamera()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          >
            Buka Kamera
          </button>
        )}

        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''} ${status !== 'preview' ? 'hidden' : ''}`}
          autoPlay
          playsInline
          muted
        />

        {status === 'preview' && (
          /* Tombol Overlay saat Preview */
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
            <button
              type="button"
              onClick={handleToggleCamera}
              className="px-4 py-2 bg-gray-800/70 text-white text-sm rounded-md hover:bg-gray-800 transition-colors backdrop-blur-sm"
            >
              Switch Kamera
            </button>
            <button
              type="button"
              onClick={handleCapture}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-lg"
            >
              Ambil Foto
            </button>
          </div>
        )}

        {status === 'captured' && photoData && (
          <>
            <img src={photoData} alt="Preview Foto" className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center px-4">
              <button
                type="button"
                onClick={handleRetake}
                className="px-6 py-2 bg-white text-gray-800 font-medium rounded-md hover:bg-gray-100 transition-colors shadow-lg"
              >
                Ulangi
              </button>
            </div>
          </>
        )}

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default KameraCapture;
