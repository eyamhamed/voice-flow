import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, MessageSquare, Volume2, Copy } from 'lucide-react';

interface MessageBoxProps {
  message: string | { role: string; content: string; refusal: null; annotations: any[] };
  className?: string;
  darkMode?: boolean;
}

export default function MessageBox({ 
  message, 
  className = '',
  darkMode = false
}: MessageBoxProps) {
  const [isTyping, setIsTyping] = useState(true);
  const [displayedText, setDisplayedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Extract message content if it's in an object format - using useCallback to memoize
  const getMessageContent = useCallback((): string => {
    if (!message) return '';
    if (typeof message === 'string') return message;
    if (typeof message === 'object' && 'content' in message) return message.content;
    return '';
  }, [message]);
  
  // Set current time only on client side to avoid hydration mismatch
  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    
    // Optional: Update time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    
    return () => clearInterval(timeInterval);
  }, []);
  
  // Simulate typing effect
  useEffect(() => {
    const messageContent = getMessageContent();
    
    if (!messageContent) {
      setIsTyping(false);
      setDisplayedText('How can I assist you today?');
      return;
    }
    
    // Reset state for new message
    setIsTyping(true);
    setDisplayedText('');
    
    const typingSpeed = 15; // ms per character
    let currentIndex = 0;
    const textContent = messageContent.trim();
    
    const typingInterval = setInterval(() => {
      if (currentIndex < textContent.length) {
        const char = textContent.charAt(currentIndex);
        setDisplayedText(prev => prev + char);
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
      }
    }, typingSpeed);
    
    return () => clearInterval(typingInterval);
  }, [getMessageContent]); // Fixed dependency array by using the memoized function
  
  // Auto-scroll as text is typed
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedText]);

  // Copy message to clipboard
  const copyToClipboard = () => {
    if (displayedText) {
      navigator.clipboard.writeText(displayedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // Read message aloud
  const readMessage = () => {
    if ('speechSynthesis' in window && displayedText) {
      const utterance = new SpeechSynthesisUtterance(displayedText);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div 
      className={`
        rounded-2xl p-6 shadow-sm border transition-all duration-200
        ${darkMode 
          ? 'bg-gray-800 border-gray-700 text-white' 
          : 'bg-white border-gray-100 text-gray-800'
        } 
        ${className}
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center mb-3">
        <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <MessageSquare className="h-4 w-4 mr-2" />
          <span className="text-sm font-medium">Cool Ikigai</span>
        </div>
        
        <div className={`ml-auto transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex space-x-2">
            <button 
              onClick={readMessage}
              className={`p-1.5 rounded-full hover:bg-opacity-10 transition-colors
                ${darkMode 
                  ? 'hover:bg-gray-600 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
              aria-label="Read aloud"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            
            <button 
              onClick={copyToClipboard}
              className={`p-1.5 rounded-full hover:bg-opacity-10 transition-colors
                ${darkMode 
                  ? 'hover:bg-gray-600 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }
                ${copied ? 'text-green-500' : ''}
              `}
              aria-label="Copy to clipboard"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div
        ref={containerRef}
        className={`
          max-h-64 overflow-y-auto prose prose-sm
          scrollbar-thin scrollbar-thumb-rounded-full
          ${darkMode 
            ? 'prose-invert scrollbar-thumb-gray-600 scrollbar-track-gray-800' 
            : 'prose-gray scrollbar-thumb-gray-200 scrollbar-track-gray-100'
          }
        `}
      >
        <p className={`
          text-lg font-light leading-relaxed whitespace-pre-wrap
          ${darkMode ? 'text-gray-200' : 'text-gray-800'}
        `}>
          {displayedText}
        </p>
      </div>
      
      {isTyping && (
        <div className={`flex items-center mt-4 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span className="text-xs">Typing...</span>
        </div>
      )}
      
      {copied && (
        <div className={`
          absolute top-6 right-6 py-1 px-3 rounded text-xs font-medium
          ${darkMode ? 'bg-gray-700 text-green-400' : 'bg-gray-100 text-green-600'}
        `}>
          Copied!
        </div>
      )}
      
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className={`h-2 w-2 rounded-full ${darkMode ? 'bg-blue-500' : 'bg-blue-400'} mr-2`}></div>
          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active</span>
        </div>
        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {/* Only render time after client-side mount to prevent hydration mismatch */}
          {currentTime}
        </div>
      </div>
    </div>
  );
}