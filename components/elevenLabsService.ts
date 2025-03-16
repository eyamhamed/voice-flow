// elevenLabsService.ts
// Service to interact with ElevenLabs API for text-to-speech via our API route

// Available voices mapping
const VOICE_IDS: Record<string, string> = {
  'rachel': '21m00Tcm4TlvDq8ikWAM', // Rachel voice 
  'antoni': 'ErXwobaYiN019PkySvjV', // Antoni voice
  'bella': 'EXAVITQu4vr4xnSDxMaL',  // Bella voice
  'josh': 'TxGEqnHWrfWFTfGW9XjX',    // Josh voice
  // Add more voices as needed
};

interface SpeakOptions {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

/**
 * Generate speech from text using ElevenLabs API via our API route
 * @param text The text to convert to speech
 * @param voice The voice ID or name to use
 * @param language The language of the text
 * @param options Additional options for voice generation
 * @returns URL to the audio file or null if error
 */
export const speak = async (
  text: string, 
  voice: string = 'rachel',
  language: string = 'en',
  options: SpeakOptions = {}
): Promise<string | null> => {
  try {
    console.log('Attempting to generate speech with voice:', voice);
    
    // Default options
    const defaultOptions = {
      stability: 0.5,
      similarity_boost: 0.75,
    };

    // Merge default options with provided options
    const mergedOptions = { ...defaultOptions, ...options };

    // Create request body
    const requestBody = {
      text,
      voice,
      ...mergedOptions
    };

    // Make API request to our internal API route
    const response = await fetch('/api/elevenlabs/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      console.error('Error response:', errorText);
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    // Get the audio blob
    const audioBlob = await response.blob();
    
    // Create a URL for the audio blob
    const audioUrl = URL.createObjectURL(audioBlob);
    console.log('Created audio URL:', audioUrl);
    
    // Return the audio URL
    return audioUrl;
  } catch (error) {
    console.error('Error generating speech with ElevenLabs:', error);
    return null;
  }
};

/**
 * Stop the currently playing speech
 * @param audioElement The audio element to stop
 */
export const stopSpeaking = (audioElement: HTMLAudioElement | null): void => {
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
  }
};

/**
 * Get available voices from ElevenLabs
 * @returns Array of voice objects with id and name
 */
export const getAvailableVoices = async (): Promise<{ id: string, name: string }[]> => {
  // Return default voices
  return Object.entries(VOICE_IDS).map(([name, id]) => ({ id, name }));
};