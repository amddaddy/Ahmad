import React from 'react';
import CloseIcon from './icons/CloseIcon';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300" 
            onClick={onClose} 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="about-modal-title"
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full m-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 relative">
                    <button 
                        onClick={onClose} 
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-400 rounded-full p-1" 
                        aria-label="Close about dialog"
                    >
                        <CloseIcon />
                    </button>
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg flex-shrink-0">
                            A
                        </div>
                        <div>
                            <h2 id="about-modal-title" className="text-2xl font-bold text-gray-800 dark:text-white">About Ahmad</h2>
                            <p className="text-md text-gray-500 dark:text-gray-400">Your loving guide to English & Hausa</p>
                        </div>
                    </div>

                    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 space-y-4">
                        <p>
                            Hello, my dear! I am Ahmad, your personal chatbot companion, designed with love to help you on your language journey. My purpose is to make learning English and translating to Hausa a warm and delightful experience.
                        </p>
                        
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 pt-2">What I Can Do For You</h3>
                        <ul>
                            <li><strong>Explain Words:</strong> Ask me for the meaning of any English word or phrase, and I'll provide a clear definition, pronunciation guide, and its Hausa translation.</li>
                            <li><strong>Provide Examples:</strong> I'll give you simple, practical example sentences in both English and Hausa to help you understand how to use words correctly.</li>
                            <li><strong>Translate:</strong> Whether it's a single word or a long sentence, I can translate between English and Hausa for you.</li>
                            <li><strong>Read Aloud:</strong> You can click the speaker icon on my messages to hear them spoken, helping you with pronunciation and listening skills.</li>
                        </ul>

                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 pt-2">How It Works</h3>
                        <p>
                            I am powered by Google's advanced Gemini models. This technology allows me to understand your questions, provide accurate information, and even generate human-like speech. It's like having a friendly language expert right here with you!
                        </p>

                        <p>
                            Just type your question or use the microphone to speak, and let's start exploring language together.
                        </p>
                    </div>
                </div>
                 <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 rounded-b-xl text-right">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 bg-pink-500 text-white font-semibold rounded-lg hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 dark:focus:ring-offset-gray-900 transition-colors"
                    >
                        Got it!
                    </button>
                </div>
            </div>
             <style>{`
                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in-scale {
                    animation: fadeInScale 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default AboutModal;
