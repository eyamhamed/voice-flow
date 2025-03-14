import React, { useState, useEffect } from 'react';
import { Modal, Select, Switch, Slider, Divider, Spin } from 'antd';
import { useCallManager } from './CallManager';
import { fetchVoices } from './elevenLabsService';
import { useTranslation } from 'next-i18next';

type VoiceSettingsModalProps = {
  visible: boolean;
  onClose: () => void;
  customProps?: {
    playSound?: (sound: string) => void;
  };
};

const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({ 
  visible, 
  onClose, 
  customProps 
}) => {
  const { t } = useTranslation();
  const { 
    selectedVoice, 
    setSelectedVoice, 
    availableVoices 
  } = useCallManager();
  
  const [loading, setLoading] = useState(false);
  const [voiceStability, setVoiceStability] = useState(0.5);
  const [voiceSimilarity, setVoiceSimilarity] = useState(0.75);
  const [useElevenLabs, setUseElevenLabs] = useState(selectedVoice !== 'default');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'none' | 'valid' | 'invalid'>('none');
  
  useEffect(() => {
    // Load API key from localStorage
    const savedApiKey = localStorage.getItem('elevenLabsApiKey') || '';
    setApiKey(savedApiKey);
    
    // Load voice settings from localStorage
    const savedStability = localStorage.getItem('voiceStability');
    const savedSimilarity = localStorage.getItem('voiceSimilarity');
    
    if (savedStability) setVoiceStability(parseFloat(savedStability));
    if (savedSimilarity) setVoiceSimilarity(parseFloat(savedSimilarity));
    
    // Verify if we have a stored API key
    if (savedApiKey) {
      validateApiKey(savedApiKey);
    }
  }, []);
  
  // Effect for enabling/disabling ElevenLabs
  useEffect(() => {
    setUseElevenLabs(selectedVoice !== 'default');
  }, [selectedVoice]);
  
  const validateApiKey = async (key: string) => {
    setLoading(true);
    try {
      // Store API key temporarily for the validation request
      localStorage.setItem('elevenLabsApiKey', key);
      
      // Try fetching voices to validate
      const voices = await fetchVoices();
      if (voices && voices.length > 0) {
        setApiKeyStatus('valid');
      } else {
        setApiKeyStatus('invalid');
      }
    } catch (error) {
      console.error('API key validation error:', error);
      setApiKeyStatus('invalid');
    } finally {
      setLoading(false);
    }
  };
  
  const handleVoiceChange = (value: string) => {
    if (customProps?.playSound) {
      customProps.playSound('buttonClick');
    }
    setSelectedVoice(value);
  };
  
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    setApiKeyStatus('none');
  };
  
  const handleSaveSettings = () => {
    // Save voice settings to localStorage
    localStorage.setItem('voiceStability', voiceStability.toString());
    localStorage.setItem('voiceSimilarity', voiceSimilarity.toString());
    
    if (apiKey) {
      localStorage.setItem('elevenLabsApiKey', apiKey);
    }
    
    if (customProps?.playSound) {
      customProps.playSound('buttonClick');
    }
    
    onClose();
  };
  
  const handleVerifyApiKey = () => {
    if (customProps?.playSound) {
      customProps.playSound('buttonClick');
    }
    validateApiKey(apiKey);
  };
  
  const handleUseElevenLabsToggle = (checked: boolean) => {
    if (customProps?.playSound) {
      customProps.playSound('toggleSwitch');
    }
    setUseElevenLabs(checked);
    if (!checked) {
      setSelectedVoice('default');
    } else if (availableVoices.length > 1) {
      // Select first non-default voice
      const firstElevenLabsVoice = availableVoices.find(voice => voice.id !== 'default');
      if (firstElevenLabsVoice) {
        setSelectedVoice(firstElevenLabsVoice.id);
      }
    }
  };

  return (
    <Modal
      title={t('voice.settings.title', 'Voice Settings')}
      open={visible}
      onCancel={onClose}
      onOk={handleSaveSettings}
      okText={t('voice.settings.save', 'Save Settings')}
      cancelText={t('voice.settings.cancel', 'Cancel')}
      className="voice-settings-modal"
    >
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{t('voice.settings.useElevenLabs', 'Use ElevenLabs Voices')}</span>
            <Switch 
              checked={useElevenLabs} 
              onChange={handleUseElevenLabsToggle} 
            />
          </div>
          <p className="text-sm text-gray-500">
            {t('voice.settings.useElevenLabsDescription', 'Switch between browser\'s built-in voices and premium ElevenLabs voices')}
          </p>
        </div>
        
        {useElevenLabs && (
          <>
            <Divider className="my-4" />
            
            <div>
              <div className="mb-2 font-medium">
                {t('voice.settings.apiKey', 'ElevenLabs API Key')}
              </div>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  placeholder={t('voice.settings.apiKeyPlaceholder', 'Enter your ElevenLabs API key')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleVerifyApiKey}
                  disabled={loading || !apiKey}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? <Spin size="small" /> : t('voice.settings.verify', 'Verify')}
                </button>
              </div>
              
              {apiKeyStatus === 'valid' && (
                <div className="mt-1 text-sm text-green-500">
                  {t('voice.settings.apiKeyValid', 'API key is valid')}
                </div>
              )}
              
              {apiKeyStatus === 'invalid' && (
                <div className="mt-1 text-sm text-red-500">
                  {t('voice.settings.apiKeyInvalid', 'Invalid API key')}
                </div>
              )}
              
              <p className="mt-2 text-sm text-gray-500">
                {t('voice.settings.apiKeyInfo', 'Your API key is stored locally in your browser and never sent to our servers')}
              </p>
            </div>
            
            <div>
              <div className="mb-2 font-medium">
                {t('voice.settings.selectVoice', 'Select Voice')}
              </div>
              <Select
                value={selectedVoice}
                onChange={handleVoiceChange}
                className="w-full"
                disabled={!useElevenLabs || apiKeyStatus !== 'valid'}
              >
                {availableVoices.map((voice) => (
                  <Select.Option key={voice.id} value={voice.id}>
                    {voice.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
            
            <div>
              <div className="mb-2 font-medium">
                {t('voice.settings.voiceStability', 'Voice Stability')}
                <span className="ml-2 text-sm text-gray-500">({voiceStability.toFixed(2)})</span>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={voiceStability}
                onChange={(value) => setVoiceStability(value)}
                disabled={!useElevenLabs || apiKeyStatus !== 'valid'}
              />
              <p className="mt-1 text-sm text-gray-500">
                {t('voice.settings.voiceStabilityDescription', 'Higher values make the voice more stable and less expressive')}
              </p>
            </div>
            
            <div>
              <div className="mb-2 font-medium">
                {t('voice.settings.voiceSimilarity', 'Voice Similarity')}
                <span className="ml-2 text-sm text-gray-500">({voiceSimilarity.toFixed(2)})</span>
              </div>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={voiceSimilarity}
                onChange={(value) => setVoiceSimilarity(value)}
                disabled={!useElevenLabs || apiKeyStatus !== 'valid'}
              />
              <p className="mt-1 text-sm text-gray-500">
                {t('voice.settings.voiceSimilarityDescription', 'Higher values ensure the voice stays closer to the original')}
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default VoiceSettingsModal;