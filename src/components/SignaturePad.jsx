import { useRef, useEffect, useState } from 'react';

export function SignaturePad({ value, onChange, label }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set up canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Set drawing styles
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Load existing signature if present, otherwise clear
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = value;
      setHasSignature(true);
    } else {
      ctx.clearRect(0, 0, rect.width, rect.height);
      setHasSignature(false);
    }
  }, [value]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveSignature();
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
    setHasSignature(true);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    onChange('');
    setHasSignature(false);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} <span className="text-noncompliant">*</span>
      </label>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-32 border-2 border-gray-300 rounded-md bg-white cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400">
            Sign here
          </div>
        )}
      </div>
      <div className="flex justify-between items-center mt-2">
        <button
          type="button"
          onClick={clearSignature}
          className="text-sm text-gray-500 hover:text-noncompliant transition-colors"
        >
          Clear Signature
        </button>
        {hasSignature && (
          <span className="text-sm text-compliant flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            Signed
          </span>
        )}
      </div>
    </div>
  );
}

export default SignaturePad;
