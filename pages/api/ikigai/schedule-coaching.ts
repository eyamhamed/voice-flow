import type { NextApiRequest, NextApiResponse } from 'next';

interface ScheduleCoachingRequest {
  name: string;
  email: string;
  phoneNumber?: string;
}

interface ScheduleCoachingResponse {
  success: boolean;
  message: string;
  schedulingUrl?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ScheduleCoachingResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const { name, email, phoneNumber } = req.body as ScheduleCoachingRequest;
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and email are required' 
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
    
    // If phone number is provided, validate format
    if (phoneNumber) {
      const phoneRegex = /^\+?[0-9\s\-\(\)]{8,20}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid phone number format' 
        });
      }
    }
    
    // In a real application, you would:
    // 1. Create a scheduling link using a service like Calendly
    // 2. Record the user's information in your CRM or database
    // 3. Send confirmation emails
    
    // This is a mock implementation
    console.log(`Scheduling coaching call for: ${name} (${email})`);
    if (phoneNumber) {
      console.log(`Phone number: ${phoneNumber}`);
    }
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a mock scheduling URL
    // In a real application, this would be a unique URL from your scheduling service
    const schedulingUrl = `https://calendly.com/ikigai-coaching/session?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`;
    
    return res.status(200).json({
      success: true,
      message: 'Coaching call scheduled successfully',
      schedulingUrl,
    });
  } catch (error) {
    console.error('Error scheduling coaching call:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while scheduling the coaching call',
    });
  }
}