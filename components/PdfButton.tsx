// Create this as a new file: PdfButton.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useCallManager } from './CallManager';
import { useTranslation } from 'next-i18next';
import { FileDown } from 'lucide-react';

interface PdfButtonProps {
  className?: string;
}

const PdfButton: React.FC<PdfButtonProps> = ({ className = '' }) => {
  const { ikigaiSummary, savePDF } = useCallManager();
  const { t } = useTranslation();
  
  // Only show the button if there's a summary available
  if (!ikigaiSummary) return null;
  
  return (
    <motion.button
      onClick={savePDF}
      className={`px-4 py-2 bg-green-600 text-white rounded-full flex items-center gap-2
                hover:bg-green-700 active:bg-green-800 transition-colors duration-150
                shadow-md ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <FileDown size={16} />
      <span>{t('buttons.downloadPdf', 'Télécharger en PDF')}</span>
    </motion.button>
  );
};

export default PdfButton;