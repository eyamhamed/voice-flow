// VoiceSelector.tsx
import React from 'react';
import { useCallManager } from './CallManager';

type VoiceSelectorProps = {
  className?: string;
};

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ className }) => {
  const { selectedVoice, availableVoices, setSelectedVoice } = useCallManager();

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVoice(e.target.value);
  };

  return (
    <div className={className}>
      <label htmlFor="voice-selector" className="block text-sm font-medium text-gray-700 mb-1">
        Voice
      </label>
      <select
        id="voice-selector"
        value={selectedVoice}
        onChange={handleVoiceChange}
        className="block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      >
        {availableVoices.map((voice) => (
          <option key={voice.id} value={voice.id}>
            {voice.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default VoiceSelector;