
import React, { useState } from 'react';
import { Message } from '../types';
import CopyIcon from './icons/CopyIcon';
import CheckIcon from './icons/CheckIcon';
import SpeakerIcon from './icons/SpeakerIcon';
import SpeakerWaveIcon from './icons/SpeakerWaveIcon';

interface ChatBubbleProps {
    message: Message;
    isSpeaking: boolean;
    onToggleSpeech: (message: Message) => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isSpeaking, onToggleSpeech }) => {
    const [isCopied, setIsCopied] = useState(false);
    
    const isUser = message.sender === 'user';
    const bubbleClasses = isUser
        ? 'bg-pink-500 text-white rounded-br-none self-end'
        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none self-start';
    
    const containerClasses = isUser ? 'flex justify-end' : 'flex justify-start';

    const handleCopy = () => {
        if (isCopied) return;
        navigator.clipboard.writeText(message.text).then(() => {
            setIsCopied(true);
            setTimeout(() => {
                setIsCopied(false);
            }, 2000); // Revert icon after 2 seconds
        }).catch(err => {
            console.error('Failed to copy text:', err);
        });
    };

    // A simple markdown renderer
    const renderText = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={index} className="bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5 text-sm">{part.slice(1, -1)}</code>;
            }
            return part.split('\n').map((line, lineIndex) => (
                <React.Fragment key={`${index}-${lineIndex}`}>
                    {line}
                    {lineIndex < part.split('\n').length - 1 && <br />}
                </React.Fragment>
            ));
        });
    };

    return (
        <div className={`${containerClasses} group`}>
            <div className={`relative p-4 rounded-lg max-w-lg shadow-md ${bubbleClasses}`}>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {renderText(message.text)}
                </div>
                 {!isUser && (
                    <div className="absolute bottom-2 right-2 flex items-center space-x-1 bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                         <button
                            onClick={() => onToggleSpeech(message)}
                            title={isSpeaking ? "Stop speaking" : "Read aloud"}
                            aria-label={isSpeaking ? "Stop reading message aloud" : "Read message aloud"}
                            className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-400"
                        >
                            {isSpeaking ? <SpeakerWaveIcon /> : <SpeakerIcon />}
                        </button>
                        <button
                            onClick={handleCopy}
                            title={isCopied ? "Copied!" : "Copy to clipboard"}
                            aria-label={isCopied ? "Copied to clipboard" : "Copy message to clipboard"}
                            className={`p-1.5 rounded-full text-gray-500 dark:text-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-pink-400 ${isCopied ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            {isCopied ? <CheckIcon /> : <CopyIcon />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatBubble;
