
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message } from './types';
import { translateToHausa } from './services/geminiService';
import Header from './components/Header';
import ChatBubble from './components/ChatBubble';
import InputBar from './components/InputBar';

const App: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMessages([
            {
                id: Date.now(),
                sender: 'bot',
                text: "Hello! I am Ahmad. I'm here to help you with English vocabulary or translate to Hausa. What can I help you with today?",
            },
        ]);

        // Clean up speech synthesis on unmount
        return () => {
            window.speechSynthesis?.cancel();
        };
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSendMessage = useCallback(async (userInput: string) => {
        if (!userInput.trim()) return;
        window.speechSynthesis?.cancel(); // Stop any ongoing speech
        setSpeakingMessageId(null);

        const newUserMessage: Message = {
            id: Date.now(),
            sender: 'user',
            text: userInput,
        };
        setMessages(prev => [...prev, newUserMessage]);
        setIsLoading(true);
        setError(null);

        try {
            const botResponseText = await translateToHausa(userInput);
            const newBotMessage: Message = {
                id: Date.now() + 1,
                sender: 'bot',
                text: botResponseText,
            };
            setMessages(prev => [...prev, newBotMessage]);
        } catch (err) {
            const errorMessage = "It seems there was an issue connecting. Please try again in a moment.";
            setError(errorMessage);
            const errorBotMessage: Message = {
                id: Date.now() + 1,
                sender: 'bot',
                text: errorMessage,
            };
            setMessages(prev => [...prev, errorBotMessage]);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleToggleSpeech = useCallback((message: Message) => {
        const synth = window.speechSynthesis;
        if (!synth) {
            console.warn("Text-to-speech not supported in this browser.");
            return;
        }

        if (speakingMessageId === message.id) {
            synth.cancel();
            setSpeakingMessageId(null);
        } else {
            synth.cancel(); // Stop any other speech
            const utterance = new SpeechSynthesisUtterance(message.text);
            utterance.onend = () => setSpeakingMessageId(null);
            utterance.onerror = (e) => {
                console.error("Speech synthesis error:", e);
                setSpeakingMessageId(null);
            }
            setSpeakingMessageId(message.id);
            synth.speak(utterance);
        }
    }, [speakingMessageId]);

    return (
        <div className="flex flex-col h-screen font-sans bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <Header />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {messages.map((msg) => (
                    <ChatBubble 
                        key={msg.id} 
                        message={msg} 
                        isSpeaking={speakingMessageId === msg.id}
                        onToggleSpeech={handleToggleSpeech}
                    />
                ))}
                {isLoading && (
                     <div className="flex justify-start">
                        <div className="bg-white dark:bg-gray-800 rounded-lg rounded-bl-none p-4 max-w-lg shadow-md animate-pulse">
                           <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                                <div className="w-2 h-2 bg-pink-400 rounded-full animation-delay-200"></div>
                                <div className="w-2 h-2 bg-pink-400 rounded-full animation-delay-400"></div>
                           </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </main>
            <InputBar onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
    );
};

export default App;
