import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useTranslation } from 'next-i18next';
import { useLanguage } from './LanguageManager';
import { getChatGptAnswer } from './callUtil';
import { CallHistoryType } from './CallHistory';
import { speak as elevenLabsSpeak, stopSpeaking as elevenLabsStopSpeaking } from './elevenLabsService';

export interface MessageType {
  message: string;
  sender: string;
}

interface CallContextType {
  userCall: () => void;
  userSpeak: () => void;
  userStopSpeaking: () => void;
  listening: boolean;
  isCalling: boolean;
  endCall: () => void;
  handleSend: (message: string) => void;
  messages: MessageType[];
  isChatbotSpeaking: boolean;
  selectedVoice: string;
  availableVoices: { id: string, name: string }[];
  setSelectedVoice: (voiceId: string) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

type CallManagerProps = {
  children: React.ReactNode;
};

const CallManager: React.FC<CallManagerProps> = ({ children }) => {
  const isUserCalling = useRef(false);
  const isChatbotSpeaking = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const commands = [
    {
      command: ['*'],
      callback: (command: string) => handleSend(command),
    },
  ];

  const [isBobSpeaking, setIsBobSpeaking] = useState(isChatbotSpeaking.current);
  const [isCalling, setIsCalling] = useState(isUserCalling.current);
  const { transcript, resetTranscript, listening } = useSpeechRecognition({
    commands,
  });
  const { t } = useTranslation();
  const [userLocalStorage, setUserLocalStorage] = useState<Storage | null>(null);
  const { selectedLanguage } = useLanguage();
  const defaultIntroduction = t('bob.introduction');
  const defaultMessage = [
    {
      message: defaultIntroduction,
      sender: 'ChatGPT',
    },
  ];
  const [messages, setMessages] = useState<MessageType[]>(defaultMessage);
  
  // 11labs voice configuration
  const [availableVoices, setAvailableVoices] = useState<{ id: string, name: string }[]>([
    { id: 'default', name: 'Default Browser Voice' },
    { id: 'rachel', name: 'Rachel (11labs)' },
    { id: 'antoni', name: 'Antoni (11labs)' },
    { id: 'bella', name: 'Bella (11labs)' },
    { id: 'josh', name: 'Josh (11labs)' },
    // Add more voices as needed
  ]);
  const [selectedVoice, setSelectedVoice] = useState('default');
  const [isUsingElevenLabs, setIsUsingElevenLabs] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserLocalStorage(localStorage);
      
      // Create audio element for 11labs playback
      audioRef.current = new Audio();
      audioRef.current.onended = handleChatbotSpeechEnd;
      audioRef.current.onplay = handleChatbotSpeechStart;
      audioRef.current.onerror = (e) => {
        console.error('Audio playback error:', e);
        handleChatbotSpeechEnd();
      };
      
      // Load selected voice from localStorage if available
      const savedVoice = localStorage.getItem('selectedVoice');
      if (savedVoice) {
        setSelectedVoice(savedVoice);
        setIsUsingElevenLabs(savedVoice !== 'default');
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // if selectedLanguage changes, reset call
  useEffect(() => {
    endCall();
  }, [defaultIntroduction, selectedLanguage]);
  
  // Update localStorage when voice changes
  useEffect(() => {
    if (userLocalStorage) {
      userLocalStorage.setItem('selectedVoice', selectedVoice);
      setIsUsingElevenLabs(selectedVoice !== 'default');
      console.log('Voice changed to:', selectedVoice, 'Using ElevenLabs:', selectedVoice !== 'default');
    }
  }, [selectedVoice, userLocalStorage]);

  const chatBotSpeak = async (message: string) => {
    if (isChatbotSpeaking.current || !isUserCalling.current) {
      return;
    }

    console.log('chatBotSpeak called with voice:', selectedVoice, 'Using ElevenLabs:', isUsingElevenLabs);

    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      if (isUsingElevenLabs) {
        const audioUrl = await elevenLabsSpeak(
          t('bob.browserNotSupportSpeechRecognitionMessage'),
          selectedVoice.replace('11labs-', ''),
          selectedLanguage
        );
        
        if (audioRef.current && audioUrl) {
          console.log('Setting audio source to:', audioUrl);
          audioRef.current.src = audioUrl;
          audioRef.current.play().catch(err => {
            console.error('Audio play error:', err);
            handleChatbotSpeechEnd();
          });
        } else {
          console.error('No audio URL or audio element available');
          handleChatbotSpeechEnd();
        }
      } else {
        // Fallback to browser speech
        const utterance = new SpeechSynthesisUtterance(t('bob.browserNotSupportSpeechRecognitionMessage'));
        utterance.lang = selectedLanguage;
        utterance.onstart = handleChatbotSpeechStart;
        utterance.onend = handleChatbotSpeechEnd;
        window.speechSynthesis.speak(utterance);
      }
      return;
    }

    if (isUsingElevenLabs) {
      try {
        console.log('Using ElevenLabs for speech with voice:', selectedVoice);
        const audioUrl = await elevenLabsSpeak(
          message,
          selectedVoice,
          selectedLanguage
        );
        
        if (audioRef.current && audioUrl) {
          console.log('Setting audio source to:', audioUrl);
          audioRef.current.src = audioUrl;
          audioRef.current.play().catch(err => {
            console.error('Audio play error:', err);
            handleChatbotSpeechEnd();
          });
        } else {
          console.error('No audio URL or audio element available');
          handleChatbotSpeechEnd();
        }
      } catch (error) {
        console.error('Error using 11labs voice:', error);
        // Fallback to browser speech
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = selectedLanguage;
        utterance.onstart = handleChatbotSpeechStart;
        utterance.onend = handleChatbotSpeechEnd;
        window.speechSynthesis.speak(utterance);
      }
    } else {
      // Use browser's built-in speech synthesis
      console.log('Using browser speech synthesis');
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = selectedLanguage;
      utterance.onstart = handleChatbotSpeechStart;
      utterance.onend = handleChatbotSpeechEnd;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleChatbotSpeechStart = () => {
    console.log('Speech started');
    isChatbotSpeaking.current = true;
    setIsBobSpeaking(true);
    SpeechRecognition.stopListening();
  };

  const handleChatbotSpeechEnd = () => {
    console.log('Speech ended');
    if (isUserCalling.current) {
      SpeechRecognition.startListening({ language: selectedLanguage });
    }
    isChatbotSpeaking.current = false;
    setIsBobSpeaking(false);
  };

  const handleSend = async (message: string) => {
    if (!message) {
      return;
    }
    
    console.log('handleSend called with message:', message);
    
    const formattedMessage = {
      message,
      sender: 'user',
    };

    const updatedMessages = [...messages, formattedMessage];

    setMessages(updatedMessages);

    // Call from conversation ideas
    if (!isUserCalling.current) {
      isUserCalling.current = true;
      setIsCalling(isUserCalling.current);
    }
    
    if (isChatbotSpeaking.current) {
      if (isUsingElevenLabs) {
        elevenLabsStopSpeaking(audioRef.current);
      } else {
        window.speechSynthesis?.cancel();
      }
      isChatbotSpeaking.current = false;
      setIsBobSpeaking(false);
    }
    
    const chatGPTAnswer = await getChatGptAnswer(updatedMessages);
    setMessages([
      ...updatedMessages,
      {
        message: chatGPTAnswer,
        sender: 'ChatGPT',
      },
    ]);
    chatBotSpeak(chatGPTAnswer);
  };

  const userSpeak = () => {
    SpeechRecognition.startListening({ language: selectedLanguage });

    if (transcript !== '') {
      resetTranscript();
    }
  };
  
  const userStopSpeaking = () => {
    SpeechRecognition.stopListening();
  };

  const userCall = () => {
    isUserCalling.current = true;
    setIsCalling(isUserCalling.current);

    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      setMessages([
        ...messages,
        {
          message: t('bob.browserNotSupportSpeechRecognitionMessage'),
          sender: 'ChatGPT',
        },
      ]);
      isUserCalling.current = false;
      setIsCalling(isUserCalling.current);
      return;
    }

    const firstMessage = t('bob.firstMessage');
    const formattedMessage = {
      message: firstMessage,
      sender: 'assistant',
    };

    const updatedMessages = [...messages, formattedMessage];

    setMessages(updatedMessages);
    chatBotSpeak(firstMessage);
  };

  const resetConversation = () => {
    setMessages(defaultMessage);
  };

  const updateCallHistory = () => {
    if (userLocalStorage && messages.length > 1) {
      const storage = userLocalStorage.getItem('callHistory')
        ? JSON.parse(userLocalStorage.getItem('callHistory') as string)
        : [];
      const newCallHistory: CallHistoryType[] = [...storage, { messages, date: new Date() }];
      userLocalStorage?.setItem('callHistory', JSON.stringify(newCallHistory));
    }
  };

  const hangUp = () => {
    SpeechRecognition.stopListening();
    resetConversation();
    isUserCalling.current = false;
    setIsCalling(isUserCalling.current);
    
    if (isChatbotSpeaking.current) {
      if (isUsingElevenLabs) {
        elevenLabsStopSpeaking(audioRef.current);
      } else {
        window.speechSynthesis?.cancel();
      }
      isChatbotSpeaking.current = false;
      setIsBobSpeaking(false);
    }
    
    SpeechRecognition.abortListening();
  };

  const endCall = () => {
    hangUp();
    updateCallHistory();
  };

  return (
    <CallContext.Provider
      value={{
        userCall,
        userSpeak,
        userStopSpeaking,
        listening,
        isCalling,
        endCall,
        handleSend,
        messages,
        isChatbotSpeaking: isBobSpeaking,
        selectedVoice,
        availableVoices,
        setSelectedVoice,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCallManager = () => {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCallManager must be used within a CallManager');
  }
  return context;
};

export default CallManager;