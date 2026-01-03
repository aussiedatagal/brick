import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'error' | 'info' | 'success';
  onClose: () => void;
  duration?: number;
}

function Toast({ message, type = 'info', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    error: 'bg-red-600',
    info: 'bg-blue-600',
    success: 'bg-green-600',
  }[type];

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg max-w-md w-full mx-4 flex items-center justify-between min-h-[44px]`}
      role="alert"
      aria-live="assertive"
    >
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="ml-4 text-white hover:text-gray-200 font-bold text-xl leading-none"
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}

export default Toast;


