// elevenLabsService.ts
import axios from 'axios';

const ELEVEN_LABS_API_URL = 'https://api.elevenlabs.io/v1';

/**
 * Type definitions for ElevenLabs API responses
 */
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url: string;
  category?: string;
  description?: string;
  fine_tuning?: {
    model_id: string;
    is_allowed_to_fine_tune: boolean;
    fine_tuning_requested: boolean;
    finetuning_state: string;
  };
}

interface VoicesResponse {
  voices: ElevenLabsVoice[];
}

/**
 * Fetch available voices from ElevenLabs API
 */
export const fetchVoices = async (): Promise<{ id: string; name: string; category?: string }[]> => {
  const apiKey = localStorage.getItem('elevenLabsApiKey');
  
  if (!apiKey) {
    console.error('ElevenLabs API key not found');
    return [];
  }
  
  try {
    const response = await axios.get<VoicesResponse>(`${ELEVEN_LABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });
    
    // Map API response to our format
    const voices = response.data.voices.map((voice) => ({
      id: voice.voice_id,
      name: voice.name,
      category: voice.category || 'Standard',
    }));
    
    // Add default browser voice
    voices.unshift({
      id: 'default',
      name: 'Default Browser Voice',
      category: 'System',
    });
    
    return voices;
  } catch (error) {
    console.error('Error fetching voices:', error);
    return [];
  }
};

/**
 * Generate speech using ElevenLabs API
 */
export const generateSpeech = async (
  text: string,
  voiceId: string,
  stability: number = 0.5,
  similarity: number = 0.75
): Promise<ArrayBuffer | null> => {
  const apiKey = localStorage.getItem('elevenLabsApiKey');
  
  if (!apiKey) {
    console.error('ElevenLabs API key not found');
    return null;
  }
  
  if (voiceId === 'default') {
    console.warn('Attempted to use ElevenLabs API with default voice');
    return null;
  }
  
  try {
    const response = await axios.post(
      `${ELEVEN_LABS_API_URL}/text-to-speech/${voiceId}/stream`,
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability,
          similarity_boost: similarity,
        },
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error generating speech:', error);
    return null;
  }
};

/**
 * Play audio from an array buffer
 */
export const playAudioBuffer = (audioBuffer: ArrayBuffer): HTMLAudioElement => {
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  
  audio.onended = () => {
    URL.revokeObjectURL(url);
  };
  
  audio.play();
  return audio;
};