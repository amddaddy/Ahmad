
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, VocabularyCategory, TaughtWord } from './types';
import { streamTranslateToHausa, textToSpeech } from './services/geminiService';
import Header from './components/Header';
import ChatBubble from './components/ChatBubble';
import InputBar from './components/InputBar';
import AboutModal from './components/AboutModal';
import Toast from './components/Toast';

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
    const [isBotStreaming, setIsBotStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
    const [audioLoadingMessageId, setAudioLoadingMessageId] = useState<number | null>(null);
    const [category, setCategory] = useState<VocabularyCategory>('General');
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [taughtWords, setTaughtWords] = useState<TaughtWord[]>([]);
    
    const [isQuizMode, setIsQuizMode] = useState(false);
    const [currentQuizQuestion, setCurrentQuizQuestion] = useState<TaughtWord | null>(null);
    const [quizScore, setQuizScore] = useState({ correct: 0, questions: 0 });
    const [quizDirection, setQuizDirection] = useState<'en-ha' | 'ha-en'>('en-ha');

    const chatEndRef = useRef<HTMLDivElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const isSyncing = useRef(false);
    const saveTimeoutRef = useRef<number | null>(null);
    const streamUpdateTimerRef = useRef<number | null>(null);
    const streamingTextRef = useRef('');
    const streamingMessageIdRef = useRef<number | null>(null);
    const taughtWordsRef = useRef(taughtWords);
    const getBotResponseRef = useRef<((userMessage: Message) => Promise<void>) | null>(null);

    // Debounce persisting messages to local storage to improve performance
    useEffect(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = window.setTimeout(() => {
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
            } catch (error) {
                console.error("Could not save messages to local storage", error);
            }
        }, 500); // Debounce save by 500ms

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [messages]);
    
    // Keep taughtWordsRef in sync with the state to avoid dependency cycles
    useEffect(() => {
        taughtWordsRef.current = taughtWords;
    }, [taughtWords]);

    // Load taught words from local storage on initial load
    useEffect(() => {
        try {
            const saved = localStorage.getItem(TAUGHT_WORDS_KEY);
            if (saved) {
                const words = JSON.parse(saved) as TaughtWord[];
                if (Array.isArray(words) && words.every(w => typeof w === 'object' && w !== null && 'english' in w && 'hausa' in w)) {
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
    }, [messages, isLoading, isBotStreaming]);

    const stopPlayback = useCallback(() => {
        if (audioSourceRef.current) {
            audioSourceRef.current.onended = null;
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

    const addBotMessage = useCallback((text: string) => {
        const botMessage: Message = { id: Date.now(), sender: 'bot', text };
        setMessages(prev => [...prev, botMessage]);
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
            setAudioLoadingMessageId(null);

            if (base64Audio && audioContextRef.current) {
                const audioData = decode(base64Audio);
                const audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
                
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);
                
                source.onended = () => {
                    if (audioSourceRef.current === source) {
                       setSpeakingMessageId(null);
                       audioSourceRef.current = null;
                    }
                };
                
                source.start();
                audioSourceRef.current = source;
                setSpeakingMessageId(messageId);
            } else {
                 setSpeakingMessageId(null);
            }
        } catch (e) {
            console.error("Failed to play audio:", e);
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
            setError(`Sorry, I couldn't read that message aloud. ${errorMessage}`);
            setAudioLoadingMessageId(null);
            stopPlayback();
        }
    }, [stopPlayback]);

    const addTaughtWord = useCallback((word: TaughtWord) => {
        setTaughtWords(prevWords => {
            const lowerCaseWord = word.english.toLowerCase();
            if (prevWords.some(w => w.english.toLowerCase() === lowerCaseWord)) {
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

    const updateStreamingMessage = useCallback(() => {
        if (!streamingMessageIdRef.current) return;

        setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.id === streamingMessageIdRef.current && lastMessage.text !== streamingTextRef.current) {
                const allButLast = prev.slice(0, -1);
                const updatedLastMessage = { ...lastMessage, text: streamingTextRef.current };
                return [...allButLast, updatedLastMessage];
            }
            return prev;
        });
    }, []);

    const getBotResponse = useCallback(async (userMessage: Message) => {
        setError(null);
        
        const botMessageId = Date.now() + 1;
        streamingMessageIdRef.current = botMessageId;
        streamingTextRef.current = '';

        const newBotMessage: Message = { id: botMessageId, sender: 'bot', text: '' };

        setMessages(prev => {
            const updatedWithSync = prev.map(msg => 
                msg.id === userMessage.id ? { ...msg, isSynced: true } : msg
            );
            return [...updatedWithSync, newBotMessage];
        });

        setIsBotStreaming(true);

        if (streamUpdateTimerRef.current) {
            clearInterval(streamUpdateTimerRef.current);
        }
        streamUpdateTimerRef.current = window.setInterval(updateStreamingMessage, 100);

        try {
            const stream = await streamTranslateToHausa(userMessage.text, category, taughtWordsRef.current.map(w => w.english));
            
            for await (const chunk of stream) {
                streamingTextRef.current += chunk;
            }
            
            if (streamUpdateTimerRef.current) {
                clearInterval(streamUpdateTimerRef.current);
                streamUpdateTimerRef.current = null;
            }
            updateStreamingMessage();

            const fullResponse = streamingTextRef.current;
            const wordMatch = fullResponse.match(/<WORD>(.*?)<\/WORD>/);
            if (wordMatch && wordMatch[1]) {
                const newWord = wordMatch[1].trim();
                const hausaMatch = fullResponse.match(/\*\*Hausa Translation:\*\*\s*([^\n]+)/);

                if (newWord && hausaMatch && hausaMatch[1]) {
                    const hausaTranslation = hausaMatch[1].trim();
                    addTaughtWord({ english: newWord, hausa: hausaTranslation });
                }

                const cleanedResponse = fullResponse.replace(/<WORD>.*?<\/WORD>\s*/, '');
                setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage?.id === botMessageId) {
                        const allButLast = prev.slice(0, -1);
                        return [...allButLast, { ...lastMessage, text: cleanedResponse }];
                    }
                    return prev;
                });
                playAudio(cleanedResponse, botMessageId);
            } else {
                playAudio(fullResponse, botMessageId);
            }

        } catch (err) {
            const errorMessage = "It seems there was an issue connecting. Please try again in a moment.";
            setError(errorMessage);
            console.error(err);
             setMessages(prev => prev.filter(msg => msg.id !== botMessageId));
            throw err;
        } finally {
            setIsBotStreaming(false);
            if (streamUpdateTimerRef.current) {
                clearInterval(streamUpdateTimerRef.current);
                streamUpdateTimerRef.current = null;
            }
            streamingMessageIdRef.current = null;
            streamingTextRef.current = '';
        }
    }, [category, playAudio, addTaughtWord, updateStreamingMessage]);

    // Keep a ref to the latest getBotResponse function to avoid dependency cycles.
    useEffect(() => {
        getBotResponseRef.current = getBotResponse;
    }, [getBotResponse]);

    const askNextQuestion = useCallback(() => {
        if (taughtWords.length === 0) {
            addBotMessage("Looks like our vocabulary list is empty! Let's learn some more words.");
            setIsQuizMode(false);
            return;
        }

        let nextWord = taughtWords[Math.floor(Math.random() * taughtWords.length)];
        if (taughtWords.length > 1 && nextWord.english === currentQuizQuestion?.english) {
            nextWord = taughtWords[Math.floor(Math.random() * taughtWords.length)];
        }
        
        const direction = Math.random() > 0.5 ? 'en-ha' : 'ha-en';
        setQuizDirection(direction);
        setCurrentQuizQuestion(nextWord);
        setQuizScore(prev => ({ ...prev, questions: prev.questions + 1 }));

        const questionText = direction === 'en-ha'
            ? `What is the Hausa translation for **${nextWord.english}**?`
            : `What is the English word for **${nextWord.hausa}**?`;
        
        setTimeout(() => addBotMessage(questionText), 500);
    }, [taughtWords, currentQuizQuestion, addBotMessage]);
    
    const endQuiz = useCallback((showScore = true) => {
        setIsQuizMode(false);
        setCurrentQuizQuestion(null);
        if (showScore && quizScore.questions > 0) {
            const scoreMessage = `Quiz finished! You got **${quizScore.correct}** out of **${quizScore.questions}** correct. Wonderful effort, my dear!`;
            addBotMessage(scoreMessage);
        } else if (!showScore) {
             addBotMessage("Quiz ended. Let's get back to our lesson!");
        }
        setQuizScore({ correct: 0, questions: 0 });
    }, [quizScore, addBotMessage]);

    const handleQuizAnswer = useCallback((answer: string) => {
        if (!currentQuizQuestion) return;

        const correctAnswer = quizDirection === 'en-ha' ? currentQuizQuestion.hausa : currentQuizQuestion.english;
        const isCorrect = answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        
        let feedbackMessage = '';
        if (isCorrect) {
            setQuizScore(prev => ({...prev, correct: prev.correct + 1}));
            feedbackMessage = `Correct! Well done, my dear. 🎉`;
        } else {
            feedbackMessage = quizDirection === 'en-ha' 
                ? `Not quite. The correct translation for **${currentQuizQuestion.english}** is **${correctAnswer}**.`
                : `Not quite. The correct word for **${currentQuizQuestion.hausa}** is **${correctAnswer}**.`
        }
        addBotMessage(feedbackMessage);
        setTimeout(() => askNextQuestion(), 1500);
    }, [currentQuizQuestion, quizDirection, askNextQuestion, addBotMessage]);

    const handleSendMessage = useCallback((userInput: string) => {
        if (!userInput.trim()) return;
        
        stopPlayback();
        setError(null);
        const newUserMessage: Message = {
            id: Date.now(),
            sender: 'user',
            text: userInput,
            isSynced: isQuizMode, 
        };
        setMessages(prev => [...prev, newUserMessage]);

        if (isQuizMode) {
            if (userInput.trim().toLowerCase() === 'stop quiz' || userInput.trim().toLowerCase() === 'end quiz') {
                endQuiz();
            } else {
                setIsLoading(true);
                setTimeout(() => {
                    handleQuizAnswer(userInput);
                    setIsLoading(false);
                }, 750);
            }
        }
    }, [stopPlayback, isQuizMode, endQuiz, handleQuizAnswer]);

    useEffect(() => {
        const processMessageQueue = async () => {
            if (isSyncing.current || !navigator.onLine || error || isQuizMode) {
                return;
            }

            const messageToSync = messages.find(msg => msg.sender === 'user' && !msg.isSynced);

            if (!messageToSync) {
                setIsLoading(false);
                return;
            }

            isSyncing.current = true;
            setIsLoading(true);

            try {
                if (getBotResponseRef.current) {
                    await getBotResponseRef.current(messageToSync);
                }
            } catch (e) {
                // Error is set in getBotResponse.
            } finally {
                setIsLoading(false);
                isSyncing.current = false;
            }
        };

        processMessageQueue();

        const handleOnline = () => setError(null);
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [messages, error, isQuizMode]);
    
    const startQuiz = useCallback(() => {
        stopPlayback();
        if (taughtWords.length < 3) {
            addBotMessage("Oh, sweetheart, we should learn at least 3 words before starting a quiz. Let's learn some more first!");
            return;
        }
        setIsQuizMode(true);
        setCategory('General');
        setQuizScore({ correct: 0, questions: 0 });
        addBotMessage("Excellent! Let's test your knowledge. I'll ask you some questions from our vocabulary list. You can type 'stop quiz' at any time to end it.");
        askNextQuestion();
    }, [taughtWords, stopPlayback, askNextQuestion, addBotMessage]);

    const handleToggleQuizMode = useCallback(() => {
        if (isQuizMode) {
            endQuiz();
        } else {
            startQuiz();
        }
    }, [isQuizMode, startQuiz, endQuiz]);

    const handleCategoryChange = useCallback((newCategory: VocabularyCategory) => {
        if (newCategory === category || isQuizMode) return;
        setCategory(newCategory);
        stopPlayback();

        const botMessage: Message = {
            id: Date.now(),
            sender: 'bot',
            text: `Wonderful, my dear! We will now focus on vocabulary about **${newCategory}**. What would you like to learn first?`
        };
        setMessages(prev => [...prev, botMessage]);
    }, [category, stopPlayback, isQuizMode]);

    const handleToggleSpeech = useCallback((message: Message) => {
        if (speakingMessageId === message.id) {
            stopPlayback();
        } else if (audioLoadingMessageId !== message.id) {
            playAudio(message.text, message.id);
        }
    }, [speakingMessageId, audioLoadingMessageId, playAudio, stopPlayback]);
    
    const handleClearChat = useCallback(() => {
        stopPlayback();
        if (isQuizMode) {
            endQuiz(false);
        }
        setMessages([INITIAL_MESSAGE]);
        setTaughtWords([]);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(TAUGHT_WORDS_KEY);
    }, [stopPlayback, isQuizMode, endQuiz]);

    const handleOpenAboutModal = useCallback(() => setIsAboutModalOpen(true), []);
    const handleCloseAboutModal = useCallback(() => setIsAboutModalOpen(false), []);

    return (
        <div className="flex flex-col h-screen font-sans bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <Header 
                selectedCategory={category} 
                onSelectCategory={handleCategoryChange} 
                onOpenAbout={handleOpenAboutModal}
                onClearChat={handleClearChat}
                isQuizMode={isQuizMode}
                onToggleQuizMode={handleToggleQuizMode}
            />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {messages.map((msg, index) => (
                    <ChatBubble 
                        key={msg.id} 
                        message={msg} 
                        isSpeaking={speakingMessageId === msg.id}
                        isAudioLoading={audioLoadingMessageId === msg.id}
                        onToggleSpeech={handleToggleSpeech}
                        isStreaming={isBotStreaming && index === messages.length - 1}
                    />
                ))}
                {isLoading && !isBotStreaming && (
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
            
            <Toast message={error} onClose={() => setError(null)} />

            <InputBar onSendMessage={handleSendMessage} isLoading={isLoading || isBotStreaming} onStartRecording={stopPlayback} isQuizMode={isQuizMode} />
            <AboutModal isOpen={isAboutModalOpen} onClose={handleCloseAboutModal} taughtWords={taughtWords} />
        </div>
    );
};

export default App;
