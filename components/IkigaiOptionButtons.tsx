import React from 'react';
import { useCallManager } from './CallManager';
import { motion } from 'framer-motion';

interface IkigaiOptionButtonsProps {
  className?: string;
}

export default function IkigaiOptionButtons({ className = '' }: IkigaiOptionButtonsProps) {
  const { 
    ikigaiOptions, 
    handleSend, 
    isChatbotSpeaking 
  } = useCallManager();

  // Helper to get appropriate button style based on option type
  const getButtonStyle = (option: string) => {
    const baseStyle = `
      px-4 py-2 rounded-lg text-sm font-medium
      transition-all duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    // Affirmative options (Oui)
    if (option.toLowerCase().includes('oui') || option.toLowerCase() === 'yes') {
      return `${baseStyle} bg-green-100 text-green-800 hover:bg-green-200 focus:ring-green-500`;
    }
    
    // Negative options (Non)
    if (option.toLowerCase().includes('non') || option.toLowerCase() === 'no') {
      return `${baseStyle} bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500`;
    }

    // Uncertain options
    if (option.toLowerCase().includes('pas sûr') || option.toLowerCase().includes('not sure')) {
      return `${baseStyle} bg-yellow-100 text-yellow-800 hover:bg-yellow-200 focus:ring-yellow-500`;
    }

    // Default style for other options
    return `${baseStyle} bg-blue-100 text-blue-800 hover:bg-blue-200 focus:ring-blue-500`;
  };

  // No options to display
  if (!ikigaiOptions || ikigaiOptions.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {ikigaiOptions.map((option, index) => (
        <motion.button
          key={index}
          className={getButtonStyle(option)}
          onClick={() => handleSend(option)}
          disabled={isChatbotSpeaking}
          aria-label={option}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: index * 0.1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {option}
        </motion.button>
      ))}
    </div>
  );
}