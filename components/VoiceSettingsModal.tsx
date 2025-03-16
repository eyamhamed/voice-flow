import React, { useState, useEffect } from 'react';
import { Settings, X, Volume2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallManager } from './CallManager';
import { useSoundEffects } from './MainLayout';

interface VoiceSettingsModalProps {
  darkMode?: boolean;
}

export default function VoiceSettingsModal({ darkMode = false }: VoiceSettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedVoice, setSelectedVoice, availableVoices } = useCallManager();
  const { playSound } = useSoundEffects();

  const toggleModal = () => {
    playSound('buttonClick');
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Settings button */}
      <button
        onClick={toggleModal}
        className={`
          p-2 rounded-full transition-colors
          ${darkMode 
            ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
            : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}
        `}
        aria-label="Voice Settings"
      >
        <Settings className="h-5 w-5" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className={`w-full max-w-md rounded-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-xl font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Voice Settings
                </h2>
                <button
                  onClick={toggleModal}
                  className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Select a voice for the AI assistant:
                </p>
                
                <div className="space-y-2 mt-3">
                  {availableVoices.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => {
                        playSound('buttonClick');
                        setSelectedVoice(voice.id);
                      }}
                      className={`
                        w-full text-left py-2 px-3 rounded-lg flex items-center justify-between
                        ${selectedVoice === voice.id 
                          ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800') 
                          : (darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200')}
                        transition-colors
                      `}
                    >
                      <div className="flex items-center">
                        <Volume2 className="h-4 w-4 mr-2" />
                        <span>{voice.name}</span>
                      </div>
                      {selectedVoice === voice.id && (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`text-xs mt-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <p>The default browser voice doesnt require an internet connection. ElevenLabs voices offer better quality but require API access.</p>
              </div>

              <div className="mt-6">
                <button
                  onClick={toggleModal}
                  className={`
                    w-full py-2 rounded-lg font-medium
                    ${darkMode 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'}
                  `}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}