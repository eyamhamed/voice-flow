// pages/api/elevenlabs/tts.ts
import type { NextApiRequest, NextApiResponse } from 'next';

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Voice IDs mapping
const VOICE_IDS: Record<string, string> = {
  'rachel': '21m00Tcm4TlvDq8ikWAM',
  'antoni': 'ErXwobaYiN019PkySvjV',
  'bella': 'EXAVITQu4vr4xnSDxMaL',
  'josh': 'TxGEqnHWrfWFTfGW9XjX',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract parameters from request body
    const { text, voice = 'rachel', stability = 0.5, similarity_boost = 0.75 } = req.body;

    // Validate required parameters
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Check if API key is configured
    if (!ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: 'ElevenLabs API key is not configured' });
    }

    // Get the voice ID - use type assertion to fix the TypeScript error
    const voiceId = VOICE_IDS[voice.toLowerCase() as keyof typeof VOICE_IDS] || voice;

    // Prepare the request to ElevenLabs API
    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability,
          similarity_boost,
          style: 0,
          use_speaker_boost: true
        }
      })
    });

    // Check if the request was successful
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('ElevenLabs API error:', response.status, errorData);
      return res.status(response.status).json({
        error: 'Failed to generate speech',
        details: errorData
      });
    }

    // Get the audio buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Set the appropriate headers for audio response
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    // Send the audio file
    res.status(200).send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('Error in ElevenLabs TTS API:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
}