import 'regenerator-runtime/runtime';
import React, { useState, useEffect } from 'react';
import ConversionIdea from './ConversionIdea';
import MessageBox from './MessageBox';
import TalkButton from './TalkButton';
import { useCallManager } from './CallManager';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, VolumeX, Volume2, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function CallBob() {
  const {
    userCall,
    userSpeak,
    userStopSpeaking,
    listening,
    isCalling,
    endCall,
    handleSend,
    messages,
    isChatbotSpeaking,
  } = useCallManager();

  const [muted, setMuted] = useState(false);
  const [messageHistory, setMessageHistory] = useState(false);
  const [feedback, setFeedback] = useState<null | 'positive' | 'negative'>(null);
  const [bobMood, setBobMood] = useState<'neutral' | 'happy' | 'thinking'>('neutral');

  // Update Bob's mood based on conversation state
  useEffect(() => {
    if (isChatbotSpeaking) {
      setBobMood('happy');
    } else if (listening) {
      setBobMood('thinking');
    } else {
      setBobMood('neutral');
    }
  }, [isChatbotSpeaking, listening]);

  // Handle toggling sound
  const toggleMute = () => setMuted(!muted);
  
  // Handle showing message history
  const toggleHistory = () => setMessageHistory(!messageHistory);

  return (
    <div className="relative min-h-[calc(100vh-10rem)]">
      {/* Top bar with controls */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 z-10">
        <button 
          onClick={toggleHistory}
          className="p-2 rounded-full bg-white/10 backdrop-blur-sm text-gray-700 hover:bg-white/20 transition-all"
          aria-label={messageHistory ? "Hide message history" : "Show message history"}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <button 
          onClick={toggleMute} 
          className="p-2 rounded-full bg-white/10 backdrop-blur-sm text-gray-700 hover:bg-white/20 transition-all"
          aria-label={muted ? "Unmute audio" : "Mute audio"}
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row items-center justify-between pt-16 gap-8 lg:gap-16">
        {/* Bob avatar area */}
        <motion.div 
          className="w-full lg:w-2/5 flex justify-center items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <div className={`
              bg-[url(../public/assets/Bob.gif)] 
              h-64 w-64 lg:h-96 lg:w-96 
              bg-no-repeat bg-contain bg-center
              transition-all duration-300
              ${bobMood === 'happy' ? 'scale-105' : ''}
              ${bobMood === 'thinking' ? 'opacity-80' : ''}
            `}></div>
            
            {/* Speaking indicator */}
            <AnimatePresence>
              {isChatbotSpeaking && (
                <motion.div 
                  className="absolute -bottom-6 left-1/2 transform -translate-x-1/2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        
        {/* Conversation area */}
        <motion.div 
          className="w-full lg:w-3/5 flex flex-col justify-center items-center gap-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Message display */}
          <div className="w-full max-w-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={messages[messages.length - 1]?.id || 'initial'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <MessageBox 
                  message={messages[messages.length - 1]?.message || ''}
                />
                
                {/* Message feedback */}
                <div className="flex justify-end mt-3 space-x-2">
                  <button 
                    onClick={() => setFeedback('positive')} 
                    className={`p-1.5 rounded-full transition-all ${feedback === 'positive' ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
                    aria-label="Positive feedback"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setFeedback('negative')} 
                    className={`p-1.5 rounded-full transition-all ${feedback === 'negative' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                    aria-label="Negative feedback"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Interaction controls */}
          <motion.div 
            className="flex flex-col items-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <TalkButton
              userCall={userCall}
              userSpeak={userSpeak}
              userStopSpeaking={userStopSpeaking}
              listening={listening}
              isCalling={isCalling}
              endCall={endCall}
              isChatbotSpeaking={isChatbotSpeaking}
            />
            
            <ConversionIdea 
              onSelect={handleSend} 
              className="mt-2"
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Message history sidebar (conditionally rendered) */}
      <AnimatePresence>
        {messageHistory && (
          <motion.div 
            className="fixed top-0 left-0 h-full w-80 bg-white shadow-lg p-4 z-20 overflow-y-auto"
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-medium text-lg">Conversation History</h2>
              <button 
                onClick={toggleHistory}
                className="p-1 rounded-full hover:bg-gray-100"
                aria-label="Close history"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="text-gray-800">{msg.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(msg.timestamp || Date.now()).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}