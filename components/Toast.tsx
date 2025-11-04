
import React, { useEffect } from 'react';

interface ToastProps {
    message: string | null;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000); // Auto-dismiss after 5 seconds

            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    if (!message) {
        return null;
    }

    return (
        <div 
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-auto max-w-md bg-gray-800 text-white text-center py-3 px-6 rounded-full shadow-lg z-50 animate-slide-up-fade-in"
            role="alert"
            aria-live="assertive"
        >
            <p>{message}</p>
             <style>{`
                @keyframes slideUpFadeIn {
                    from { opacity: 0; transform: translate(-50%, 20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                .animate-slide-up-fade-in {
                    animation: slideUpFadeIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default Toast;
