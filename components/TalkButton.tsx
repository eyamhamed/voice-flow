import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState, useEffect } from 'react';
import { faMicrophone, faMicrophoneSlash, faSquare, faPhone, faPhoneSlash } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'next-i18next';

interface TalkButtonProps {
  userCall: () => void;
  userSpeak: () => void;
  userStopSpeaking: () => void;
  listening: boolean;
  isCalling: boolean;
  endCall: () => void;
  isChatbotSpeaking: boolean;
}

export default function TalkButton({
  userCall,
  userSpeak,
  userStopSpeaking,
  listening,
  isCalling,
  endCall,
  isChatbotSpeaking,
}: TalkButtonProps) {
  const { t } = useTranslation();
  const [buttonHover, setButtonHover] = useState(false);
  const [callButtonScale, setCallButtonScale] = useState(false);
  
  // Add pulse effect when chatbot is speaking
  useEffect(() => {
    if (isChatbotSpeaking) {
      const interval = setInterval(() => {
        setCallButtonScale(prev => !prev);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isChatbotSpeaking]);
  
  if (!isCalling) {
    return (
      <button
        className={`cursor-pointer outline-none md:text-base text-white bg-gradient-to-r from-[#ff3482] to-[#ff5797] rounded-full border-none shadow-lg md:mb-10 transition-all duration-300 hover:shadow-xl ${buttonHover ? 'scale-105' : ''}`}
        onClick={userCall}
        onMouseEnter={() => setButtonHover(true)}
        onMouseLeave={() => setButtonHover(false)}
        aria-label={t('call.call')}
      >
        <div className="w-[150px] h-[55px] flex justify-center items-center gap-2">
          <FontAwesomeIcon icon={faPhone} className="text-white" />
          <span className="font-medium">{t('call.call')}</span>
        </div>
      </button>
    );
  }

  return (
    <div className="flex justify-center flex-col items-center absolute bottom-7 md:relative lg:bottom-0 transition-all duration-300">
      <div className={`mb-6 text-sm text-gray-500 ${isChatbotSpeaking ? 'visible' : 'invisible'} transition-all duration-300`}>
        {isChatbotSpeaking ? t('call.botIsSpeaking') : ''}
      </div>
      
      {listening ? (
        <button 
          className="py-4 transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#ff3482] focus:ring-opacity-50"
          onClick={userStopSpeaking}
          aria-label={t('call.stopSpeaking')}
        >
          <span className="relative flex h-[60px] w-[60px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5797] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-[60px] w-[60px] bg-gradient-to-r from-[#fc4189] to-[#ff5797] justify-center items-center shadow-lg">
              <FontAwesomeIcon
                icon={faSquare}
                className="text-white text-xl"
              />
            </span>
          </span>
          <span className="block text-xs mt-2 text-center text-gray-600">{t('call.recording')}</span>
        </button>
      ) : (
        <button
          className={`py-4 transition-all duration-200 ${isChatbotSpeaking ? 'opacity-70' : 'hover:scale-105'} focus:outline-none focus:ring-2 focus:ring-[#ff3482] focus:ring-opacity-50`}
          onClick={userSpeak}
          disabled={isChatbotSpeaking}
          aria-label={t('call.startSpeaking')}
        >
          <span className="relative flex h-[60px] w-[60px]">
            <span className={`absolute inline-flex h-full w-full rounded-full ${isChatbotSpeaking ? 'bg-gray-300' : 'bg-[#ff3482] opacity-20'}`}></span>
            <span
              className={`relative inline-flex rounded-full h-[60px] w-[60px] justify-center items-center shadow-md ${
                isChatbotSpeaking ? 'bg-gray-400' : 'bg-gradient-to-r from-[#fc4189] to-[#ff5797]'
              } ${callButtonScale && isChatbotSpeaking ? 'scale-105' : ''} transition-transform duration-300`}
            >
              <FontAwesomeIcon
                icon={isChatbotSpeaking ? faMicrophoneSlash : faMicrophone}
                className="text-white text-xl"
              />
            </span>
          </span>
          <span className="block text-xs mt-2 text-center text-gray-600">
            {isChatbotSpeaking ? t('call.waitForBot') : t('call.tapToSpeak')}
          </span>
        </button>
      )}

      <button
        className="cursor-pointer outline-none w-[150px] h-[55px] mt-4 md:text-base text-white bg-gradient-to-r from-[#ff3482] to-[#ff5797] rounded-full border-none shadow-lg md:mb-10 transition-all duration-300 hover:shadow-xl hover:scale-105 flex justify-center items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#ff3482] focus:ring-opacity-50"
        onClick={endCall}
        aria-label={t('call.hangUp')}
      >
        <FontAwesomeIcon icon={faPhoneSlash} className="text-white" />
        <span className="font-medium">{t('call.hangUp')}</span>
      </button>
    </div>
  );
}