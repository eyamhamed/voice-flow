import { METHODS } from '@/constants';
import { NextApiResponse } from 'next';

interface RequestParam {
  method: METHODS;
  body: string;
}

export default async function handler(req: RequestParam, res: NextApiResponse) {
  if (req.method !== METHODS.POST) {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const messages = JSON.parse(req.body);
  let response;
  const apiKey = 'AIzaSyCY3H-Bjc0a5LW4dK90W1Nz5W_tTfWjVsI'; // Replace with your actual Gemini API key
  
  try {
    // Extract system message if it exists
    let systemMessage = '';
    
    // Convert from OpenAI format to Gemini format, filtering out system messages
    const geminiMessages = messages
      .filter((msg: any) => msg.role !== 'system')
      .map((msg: any) => {
        // Save system message content if found
        if (msg.role === 'system') {
          systemMessage = msg.content;
        }
        
        return {
          role: msg.role === 'assistant' ? 'model' : msg.role,
          parts: [{ text: msg.content }]
        };
      });
    
    // Create the request body for Gemini
    const requestBody: any = {
      contents: geminiMessages,
    };
    
    // If there was a system message, add it as a generationConfig instruction
    if (systemMessage) {
      requestBody.generationConfig = {
        ...requestBody.generationConfig,
        systemInstruction: {
          parts: [{ text: systemMessage }]
        }
      };
    }

    // Updated API endpoint with the correct path structure
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.error });
    }

    const geminiData = await response.json();
    
    // Convert Gemini response format back to OpenAI-like format for compatibility
    const formattedResponse = {
      choices: [{
        message: {
          role: 'assistant',
          content: geminiData.candidates[0].content.parts[0].text
        }
      }],
      model: 'gemini-1.5-pro'
    };
    
    return res.status(200).json(formattedResponse);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}