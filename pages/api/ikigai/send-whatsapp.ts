import type { NextApiRequest, NextApiResponse } from 'next';
import { IkigaiData } from '../../../lib/ikigaiService';

interface SendWhatsAppRequest {
  phoneNumber: string;
  ikigaiData: IkigaiData;
}

interface SendWhatsAppResponse {
  success: boolean;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendWhatsAppResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const { phoneNumber, ikigaiData } = req.body as SendWhatsAppRequest;
    
    // Validate required fields
    if (!phoneNumber || !ikigaiData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    // Validate phone number format (simple check)
    const phoneRegex = /^\+?[0-9\s\-\(\)]{8,20}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid phone number format' 
      });
    }
    
    // In a real application, you would:
    // 1. Generate a text summary of the Ikigai results
    // 2. Set up WhatsApp Business API integration
    // 3. Send the WhatsApp message
    
    // Generate a text summary for WhatsApp
    const whatsAppSummary = `
      🌟 VOTRE IKIGAI 🌟
      
      VOS PASSIONS:
      ${ikigaiData.passions}
      
      VOS TALENTS:
      ${ikigaiData.talents}
      
      CE DONT LE MONDE A BESOIN:
      ${ikigaiData.worldNeeds}
      
      CE POUR QUOI VOUS POUVEZ ÊTRE PAYÉ:
      ${ikigaiData.monetization}
      
      VOTRE IKIGAI (RÉSUMÉ):
      ${ikigaiData.summary}
    `;
    
    // This is a mock implementation
    console.log(`Sending Ikigai results to WhatsApp: ${phoneNumber}`);
    console.log('WhatsApp summary:', whatsAppSummary);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return res.status(200).json({
      success: true,
      message: 'WhatsApp message sent successfully',
    });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while sending the WhatsApp message',
    });
  }
}