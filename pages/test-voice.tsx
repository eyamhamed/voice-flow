import { useState } from 'react';

export default function TestVoice() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('This is a test of the ElevenLabs voice service.');
  const [voice, setVoice] = useState('rachel');
  const [apiResponse, setApiResponse] = useState('');
  
  const testVoice = async () => {
    setLoading(true);
    setError('');
    setApiResponse('');
    
    try {
      console.log('Testing voice:', voice, 'with text:', text);
      
      const response = await fetch('/api/elevenlabs/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice
        })
      });
      
      // Get response details for debugging
      const responseClone = response.clone();
      const responseText = await responseClone.text();
      setApiResponse(`Status: ${response.status}\nHeaders: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}\nContent Type: ${response.headers.get('content-type')}\nContent Length: ${responseText.length} bytes`);
      
      if (!response.ok) {
        let errorDetail = 'Unknown error';
        try {
          // Try to parse as JSON if possible
          const errorJson = JSON.parse(responseText);
          errorDetail = JSON.stringify(errorJson, null, 2);
        } catch (e) {
          // If not JSON, use the raw text
          errorDetail = responseText;
        }
        throw new Error(`API error: ${response.status} - ${errorDetail}`);
      }
      
      // If content type is audio, create a URL
      if (response.headers.get('content-type')?.includes('audio')) {
        const audioBlob = await response.blob();
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        console.log('Audio URL created:', url);
      } else {
        throw new Error('Response was not audio: ' + response.headers.get('content-type'));
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      console.error('Voice test error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const voices = [
    { id: 'rachel', name: 'Rachel' },
    { id: 'antoni', name: 'Antoni' },
    { id: 'bella', name: 'Bella' },
    { id: 'josh', name: 'Josh' }
  ];
  
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ElevenLabs Voice Test</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Test Text</label>
        <textarea 
          className="w-full p-2 border rounded" 
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Voice</label>
        <select 
          className="w-full p-2 border rounded"
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
        >
          {voices.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>
      
      <button 
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        onClick={testVoice}
        disabled={loading}
      >
        {loading ? 'Testing...' : 'Test Voice'}
      </button>
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="text-lg font-medium text-red-700 mb-2">Error</h3>
          <pre className="text-red-600 text-sm whitespace-pre-wrap">{error}</pre>
        </div>
      )}
      
      {apiResponse && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded">
          <h3 className="text-lg font-medium text-gray-700 mb-2">API Response Details</h3>
          <pre className="text-gray-600 text-sm whitespace-pre-wrap">{apiResponse}</pre>
        </div>
      )}
      
      {audioUrl && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Audio Preview</h3>
          <audio 
            controls 
            src={audioUrl} 
            className="w-full" 
            onError={(e) => console.error('Audio playback error:', e)}
          />
        </div>
      )}
      
      <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded">
        <h3 className="text-lg font-medium text-blue-700 mb-2">Troubleshooting Tips</h3>
        <ul className="list-disc pl-5 text-blue-800 text-sm space-y-1">
          <li>Verify your ElevenLabs API key is correctly set in <code>.env.local</code></li>
          <li>Check that your API key has available credits</li>
          <li>Make sure text is not empty</li>
          <li>Try a shorter text if you re experiencing timeout issues</li>
          <li>Check browser console and server logs for additional error details</li>
        </ul>
      </div>
    </div>
  );
}