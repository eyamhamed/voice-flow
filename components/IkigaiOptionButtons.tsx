import React from 'react';
import { useCallManager } from './CallManager';
import { motion } from 'framer-motion';
import { useTranslation } from 'next-i18next';
import { FileDown } from 'lucide-react';

interface IkigaiOptionButtonsProps {
  className?: string;
}

const IkigaiOptionButtons: React.FC<IkigaiOptionButtonsProps> = ({ className = '' }) => {
  const { ikigaiOptions, handleSend, isProcessingIkigai, summaryShown, savePDF, ikigaiSummary } = useCallManager();
  const { t } = useTranslation();

  // Function to get the proper translated version of an option
  const getTranslatedOption = (option: string): string => {
    const lowerOption = option.toLowerCase();
    
    // Check common options that might need translation
    if (lowerOption === 'oui' || lowerOption === 'yes') {
      return t('options.yes');
    } else if (lowerOption === 'non' || lowerOption === 'no') {
      return t('options.no');
    } else if (lowerOption.includes('sûr') || lowerOption.includes('sure')) {
      return t('options.notSure');
    }
    
    // If no match, return the original
    return option;
  };

  return (
    <div className={`flex flex-wrap justify-center gap-2 w-full max-w-md ${className}`}>
      {/* Regular option buttons */}
      {ikigaiOptions.map((option, index) => (
        <motion.button
          key={index}
          onClick={() => handleSend(option)}
          className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 
                    active:bg-blue-700 transition-colors duration-150 text-sm font-medium"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isProcessingIkigai}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          {getTranslatedOption(option)}
        </motion.button>
      ))}
      
      {/* PDF Button - show when summary is available */}
      {summaryShown && ikigaiSummary && (
        <motion.button
          onClick={savePDF}
          className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 
                    active:bg-green-800 transition-colors duration-150 text-sm font-medium
                    flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isProcessingIkigai}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: ikigaiOptions.length * 0.1 }}
        >
          <FileDown size={16} />
          {t('buttons.downloadPdf', 'Télécharger en PDF')}
        </motion.button>
      )}
    </div>
  );
};

export default IkigaiOptionButtons;