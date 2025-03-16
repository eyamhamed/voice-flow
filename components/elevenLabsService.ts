// elevenLabsService.ts
import axios from 'axios';

const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1';

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url: string;
  category?: string;
}

interface VoicesResponse {
  voices: ElevenLabsVoice[];
}

interface SpeechGenerationOptions {
  stability?: number;
  similarity?: number;
  modelId?: string;
}

// Global audio reference
let currentAudio: HTMLAudioElement | null = null;

export const fetchVoices = async (): Promise<{ id: string; name: string }[]> => {
  const apiKey = localStorage.getItem('elevenLabsApiKey');
  
  try {
    const response = await axios.get<VoicesResponse>(`${ELEVEN_LABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': apiKey || '',
        'Content-Type': 'application/json'
      }
    });

    return [
      { id: 'default', name: 'Default Browser Voice' },
      ...response.data.voices.map(voice => ({
        id: voice.voice_id,
        name: voice.name
      }))
    ];
  } catch (error) {
    console.error('Error fetching voices:', error);
    return [];
  }
};

export const generateSpeech = async (
  text: string,
  voiceId: string,
  language: string,
  options: SpeechGenerationOptions = {}
): Promise<string | null> => {
  const apiKey = localStorage.getItem('elevenLabsApiKey');
  
  if (!apiKey || voiceId === 'default') return null;

  try {
    const response = await axios.post(
      `${ELEVEN_LABS_API_URL}/text-to-speech/${voiceId}/stream`,
      {
        text,
        model_id: options.modelId || 'eleven_multilingual_v1',
        voice_settings: {
          stability: options.stability || 0.5,
          similarity_boost: options.similarity || 0.75
        }
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer'
      }
    );

    return URL.createObjectURL(new Blob([response.data], { type: 'audio/mpeg' }));
  } catch (error) {
    console.error('Error generating speech:', error);
    return null;
  }
};

export const speak = async (
  text: string,
  voiceId: string,
  language: string
): Promise<void> => {
  stopSpeaking();
  
  if (voiceId === 'default') {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    window.speechSynthesis.speak(utterance);
    return;
  }

  const audioUrl = await generateSpeech(text, voiceId, language);
  if (audioUrl) {
    currentAudio = new Audio(audioUrl);
    currentAudio.play();
  }
};

export const stopSpeaking = (): void => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  window.speechSynthesis.cancel();
};

// Utility function for voice selection
export const getVoiceIdFromName = (voiceName: string): string => {
  return voiceName.replace('11labs-', '');
};