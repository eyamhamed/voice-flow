import type { NextApiRequest, NextApiResponse } from 'next';
import { IkigaiData } from '../../../lib/ikigaiService';

interface SendEmailRequest {
  email: string;
  ikigaiData: IkigaiData;
}

interface SendEmailResponse {
  success: boolean;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendEmailResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const { email, ikigaiData } = req.body as SendEmailRequest;
    
    // Validate required fields
    if (!email || !ikigaiData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }
    
    // In a real application, you would:
    // 1. Generate a PDF with the Ikigai results
    // 2. Set up email sending with a service like SendGrid, Mailgun, etc.
    // 3. Send the email with the PDF attached
    
    // This is a mock implementation
    console.log(`Sending Ikigai results to email: ${email}`);
    console.log('Ikigai data:', ikigaiData);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return res.status(200).json({
      success: true,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while sending the email',
    });
  }
}