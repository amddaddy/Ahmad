
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, VocabularyCategory } from './types';
import { translateToHausa, textToSpeech } from './services/geminiService';
import Header from './components/Header';
import ChatBubble from './components/ChatBubble';
import InputBar from './components/InputBar';
import AboutModal from './components/AboutModal';

// Decodes a base64 string into a Uint8Array.
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Decodes raw PCM audio data into an AudioBuffer for playback.
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const LOCAL_STORAGE_KEY = 'ahmad-chat-history';
const TAUGHT_WORDS_KEY = 'ahmad-taught-words-all-time';

const INITIAL_MESSAGE: Message = {
    id: 1,
    sender: 'bot',
    text: "Hello, my dear. I am Ahmad, and I'm here to help you with the beautiful language of English or translate its words into Hausa for you. What shall we explore together today?",
};


const App: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>(() => {
        try {
            const savedMessages = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedMessages) {
                const parsedMessages = JSON.parse(savedMessages) as Message[];
                // Ensure isSynced flag exists on older messages for compatibility
                return parsedMessages.map(msg => 
                    msg.sender === 'user' ? { ...msg, isSynced: msg.isSynced ?? true } : msg
                );
            }
            return [INITIAL_MESSAGE];
        } catch (error) {
            console.error("Could not load messages from local storage", error);
            return [INITIAL_MESSAGE];
        }
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
    const [audioLoadingMessageId, setAudioLoadingMessageId] = useState<number | null>(null);
    const [category, setCategory] = useState<VocabularyCategory>('General');
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [taughtWords, setTaughtWords] = useState<string[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const isSyncing = useRef(false);

    // Persist messages to local storage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
        } catch (error) {
            console.error("Could not save messages to local storage", error);
        }
    }, [messages]);

    // Load taught words from local storage on initial load
    useEffect(() => {
        try {
            const saved = localStorage.getItem(TAUGHT_WORDS_KEY);
            if (saved) {
                const words = JSON.parse(saved);
                if (Array.isArray(words)) {
                    setTaughtWords(words);
                }
            }
        } catch (error) {
            console.error("Could not load taught words", error);
        }
    }, []);

    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        return () => {
            audioSourceRef.current?.stop();
            audioContextRef.current?.close();
        };
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const stopPlayback = useCallback(() => {
        if (audioSourceRef.current) {
            audioSourceRef.current.onended = null; // Prevent onended from firing on manual stop
            try {
                audioSourceRef.current.stop();
            } catch (e) {
                // Ignore errors from stopping an already-stopped source
            }
            audioSourceRef.current.disconnect();
            audioSourceRef.current = null;
        }
        setSpeakingMessageId(null);
        setAudioLoadingMessageId(null);
    }, []);

    const playAudio = useCallback(async (text: string, messageId: number) => {
        if (!audioContextRef.current) return;
        
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        stopPlayback();

        try {
            setAudioLoadingMessageId(messageId);
            const base64Audio = await textToSpeech(text);

            setAudioLoadingMessageId(null); // Done loading, success or fail.

            if (base64Audio && audioContextRef.current) {
                const audioData = decode(base64Audio);
                const audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
                
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);
                
                source.onended = () => {
                    // When playback finishes naturally, just clear the state.
                    if (audioSourceRef.current === source) {
                       setSpeakingMessageId(null);
                       audioSourceRef.current = null;
                    }
                };
                
                source.start();
                audioSourceRef.current = source;
                setSpeakingMessageId(messageId); // Now we are speaking
            } else {
                 setSpeakingMessageId(null); // Ensure not speaking if audio failed
            }
        } catch (e) {
            console.error("Failed to play audio:", e);
            setAudioLoadingMessageId(null);
            stopPlayback(); // this will also clear speakingMessageId
        }
    }, [stopPlayback]);

    const addTaughtWord = useCallback((word: string) => {
        setTaughtWords(prevWords => {
            // Prevent duplicates
            const lowerCaseWord = word.toLowerCase();
            if (prevWords.some(w => w.toLowerCase() === lowerCaseWord)) {
                return prevWords;
            }
            const newWords = [...prevWords, word];
            try {
                localStorage.setItem(TAUGHT_WORDS_KEY, JSON.stringify(newWords));
            } catch (error) {
                console.error("Could not save taught words", error);
            }
            return newWords;
        });
    }, []);

    const getBotResponse = useCallback(async (userMessage: Message) => {
        setError(null);
        try {
            let botResponseText = await translateToHausa(userMessage.text, category, taughtWords);

            const wordMatch = botResponseText.match(/<WORD>(.*?)<\/WORD>/);
            if (wordMatch && wordMatch[1]) {
                const newWord = wordMatch[1].trim();
                if (newWord) {
                    addTaughtWord(newWord);
                }
                botResponseText = botResponseText.replace(/<WORD>.*?<\/WORD>\s*/, '');
            }

            const newBotMessage: Message = {
                id: Date.now() + 1,
                sender: 'bot',
                text: botResponseText,
            };
            
            setMessages(prev => {
                const updatedWithSync = prev.map(msg => 
                    msg.id === userMessage.id ? { ...msg, isSynced: true } : msg
                );
                return [...updatedWithSync, newBotMessage];
            });

            playAudio(botResponseText, newBotMessage.id);
        } catch (err) {
            const errorMessage = "It seems there was an issue connecting. Please try again in a moment.";
            setError(errorMessage);
            // Don't add an error message to chat, let the user message remain unsynced for retry.
            console.error(err);
             // We need to update the state to mark the message as NOT synced
            setMessages(prev => prev.map(msg => 
                msg.id === userMessage.id ? { ...msg, isSynced: false } : msg
            ));
        }
    }, [category, playAudio, taughtWords, addTaughtWord]);

    const handleSendMessage = useCallback((userInput: string) => {
        if (!userInput.trim()) return;
        stopPlayback();

        const newUserMessage: Message = {
            id: Date.now(),
            sender: 'user',
            text: userInput,
            isSynced: false,
        };
        
        setMessages(prev => [...prev, newUserMessage]);
    }, [stopPlayback]);

    // This effect manages the message queue, ensuring only one message is sent at a time.
    useEffect(() => {
        const processMessageQueue = async () => {
            if (isSyncing.current || !navigator.onLine) {
                return;
            }

            const messageToSync = messages.find(msg => msg.sender === 'user' && !msg.isSynced);

            if (!messageToSync) {
                setIsLoading(false); // No items left to sync, ensure loading is off.
                return;
            }

            isSyncing.current = true;
            setIsLoading(true);

            await getBotResponse(messageToSync);

            isSyncing.current = false;
            
            // The state change in getBotResponse will trigger this useEffect again,
            // which will call this function again, creating a natural loop that
            // processes any other messages that were added while the last one was syncing.
        };

        processMessageQueue();

        window.addEventListener('online', processMessageQueue);
        return () => {
            window.removeEventListener('online', processMessageQueue);
        };
    }, [messages, getBotResponse]);

    const handleCategoryChange = useCallback((newCategory: VocabularyCategory) => {
        if (newCategory === category) return;
        setCategory(newCategory);
        
        stopPlayback();

        const botMessage: Message = {
            id: Date.now(),
            sender: 'bot',
            text: `Wonderful, my dear! We will now focus on vocabulary about **${newCategory}**. What would you like to learn first?`
        };
        setMessages(prev => [...prev, botMessage]);
    }, [category, stopPlayback]);

    const handleToggleSpeech = useCallback((message: Message) => {
        if (speakingMessageId === message.id) {
            stopPlayback();
        } else if (audioLoadingMessageId !== message.id) {
            playAudio(message.text, message.id);
        }
    }, [speakingMessageId, audioLoadingMessageId, playAudio, stopPlayback]);
    
    const handleOpenAboutModal = useCallback(() => setIsAboutModalOpen(true), []);
    const handleCloseAboutModal = useCallback(() => setIsAboutModalOpen(false), []);

    return (
        <div className="flex flex-col h-screen font-sans bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <Header 
                selectedCategory={category} 
                onSelectCategory={handleCategoryChange} 
                onOpenAbout={handleOpenAboutModal}
            />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {messages.map((msg) => (
                    <ChatBubble 
                        key={msg.id} 
                        message={msg} 
                        isSpeaking={speakingMessageId === msg.id}
                        isAudioLoading={audioLoadingMessageId === msg.id}
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
            <InputBar onSendMessage={handleSendMessage} isLoading={isLoading} onStartRecording={stopPlayback} />
            <AboutModal isOpen={isAboutModalOpen} onClose={handleCloseAboutModal} />
        </div>
    );
};

export default App;
