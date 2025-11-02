import React, { useState, useEffect, useRef } from 'react';
import SendIcon from './icons/SendIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';

// Fix for TypeScript not knowing about the Web Speech API (SpeechRecognition).
// These interfaces provide the necessary type definitions to allow the compiler
// to recognize SpeechRecognition and its associated events and properties.
interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

// Augment the global Window interface to include vendor-prefixed SpeechRecognition.
declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}


interface InputBarProps {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    onStartRecording: () => void;
}

const InputBar: React.FC<InputBarProps> = ({ onSendMessage, isLoading, onStartRecording }) => {
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [micError, setMicError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        inputRef.current?.focus();

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                setIsRecording(true);
                setMicError(null);
            };
            recognition.onend = () => setIsRecording(false);
            recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                if (event.error === 'not-allowed') {
                    setMicError("Microphone access denied. Please allow it in your browser settings.");
                } else {
                     setMicError(`Speech recognition error: ${event.error}`);
                }
                setIsRecording(false);
            };

            recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0])
                    .map(result => result.transcript)
                    .join('');
                setInput(transcript);
            };

            recognitionRef.current = recognition;
        } else {
            console.warn("Speech Recognition not supported in this browser.");
            setMicError("Speech recognition is not supported by your browser.");
        }

        return () => {
            recognitionRef.current?.stop();
        };

    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSendMessage(input);
            setInput('');
            if (isRecording) {
                recognitionRef.current?.stop();
            }
        }
    };

    const handleMicClick = () => {
        if (isLoading || !recognitionRef.current) return;
        
        setMicError(null);

        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            onStartRecording();
            inputRef.current?.focus();
            try {
                recognitionRef.current.start();
            } catch (err) {
                 console.error("Error starting speech recognition:", err);
                 setMicError("Could not start microphone. Please try again.");
            }
        }
    };

    const placeholderText = isRecording ? "Listening..." : "Type or say something...";

    return (
        <footer className="bg-white dark:bg-gray-800 p-4 shadow-t-md sticky bottom-0">
            <form onSubmit={handleSubmit} className="flex items-center space-x-3">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={placeholderText}
                    className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-400 dark:bg-gray-700 dark:text-white transition duration-200"
                    disabled={isLoading || isRecording}
                />
                {input.trim() ? (
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        aria-label="Send message"
                        className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-600 hover:to-rose-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                    >
                        <SendIcon />
                    </button>
                ) : (
                     <button
                        type="button"
                        onClick={handleMicClick}
                        disabled={isLoading || !recognitionRef.current}
                        aria-label={isRecording ? "Stop recording" : "Start recording"}
                        className={`w-12 h-12 flex items-center justify-center rounded-full text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-br from-pink-500 to-rose-500'}`}
                    >
                        <MicrophoneIcon />
                    </button>
                )}
            </form>
            {micError && (
                <p className="text-red-500 text-sm mt-2 text-center">{micError}</p>
            )}
        </footer>
    );
};

export default InputBar;