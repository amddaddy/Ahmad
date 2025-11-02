

import React, { useState } from 'react';
import { Message } from '../types';
import CopyIcon from './icons/CopyIcon';
import CheckIcon from './icons/CheckIcon';
import SpeakerIcon from './icons/SpeakerIcon';
import SpeakerWaveIcon from './icons/SpeakerWaveIcon';
import ClockIcon from './icons/ClockIcon';
import LoadingSpinnerIcon from './icons/LoadingSpinnerIcon';

interface ChatBubbleProps {
    message: Message;
    isSpeaking: boolean;
    isAudioLoading: boolean;
    onToggleSpeech: (message: Message) => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isSpeaking, isAudioLoading, onToggleSpeech }) => {
    const [isCopied, setIsCopied] = useState(false);
    
    const isUser = message.sender === 'user';
    const bubbleClasses = isUser
        ? 'bg-pink-500 text-white rounded-br-none self-end'
        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none self-start';
    
    const containerClasses = isUser ? 'flex justify-end items-end' : 'flex justify-start';

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

    // A simple markdown renderer that handles headings, bold, and code.
    const renderText = (text: string) => {
        return text.split('\n').map((line, index) => {
            // Handle H2 Headings
            if (line.startsWith('## ')) {
                return <h2 key={index} className="text-xl font-bold mt-2 mb-1 text-pink-500 dark:text-pink-400">{line.substring(3)}</h2>;
            }
            
            // Process inline markdown like bold and code for other lines
            const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
            return (
                <div key={index}>
                    {parts.map((part, partIndex) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={partIndex}>{part.slice(2, -2)}</strong>;
                        }
                        if (part.startsWith('`') && part.endsWith('`')) {
                            return <code key={partIndex} className="bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5 text-sm">{part.slice(1, -1)}</code>;
                        }
                        return part;
                    })}
                </div>
            );
        });
    };

    const toolbarClasses = `absolute bottom-2 right-2 flex items-center space-x-1 bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 rounded-full transition-opacity duration-200 ${
        isAudioLoading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
    }`;

    return (
        <div className={`${containerClasses} group`}>
             {isUser && message.isSynced === false && (
                <div className="self-end mr-2 mb-1 text-gray-400" title="Pending, will send when online">
                    <ClockIcon />
                </div>
            )}
            <div className={`relative p-4 rounded-lg max-w-lg shadow-md ${bubbleClasses}`}>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {renderText(message.text)}
                </div>
                 {!isUser && (
                    <div className={toolbarClasses}>
                         <button
                            onClick={() => onToggleSpeech(message)}
                            title={isAudioLoading ? "Loading audio..." : isSpeaking ? "Stop speaking" : "Read aloud"}
                            aria-label={isAudioLoading ? "Loading message audio" : isSpeaking ? "Stop reading message aloud" : "Read message aloud"}
                            className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:cursor-wait"
                            disabled={isAudioLoading}
                        >
                            {isAudioLoading 
                                ? <LoadingSpinnerIcon /> 
                                : isSpeaking 
                                    ? <SpeakerWaveIcon /> 
                                    : <SpeakerIcon />}
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