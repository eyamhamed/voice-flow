// Service for Ikigai-related API calls and data processing

// Types for Ikigai data
export interface IkigaiData {
    passions: string;
    talents: string;
    worldNeeds: string;
    monetization: string;
    summary: string;
  }
  
  export interface SaveIkigaiRequest extends IkigaiData {
    contactInfo?: string;
  }
  
  export interface SaveIkigaiResponse {
    success: boolean;
    message: string;
    resultId?: string;
  }
  
  export interface ScheduleCoachingResponse {
    success: boolean;
    message: string;
    schedulingUrl?: string;
  }
  
  // Save Ikigai results
  export async function saveIkigaiResults(data: SaveIkigaiRequest): Promise<SaveIkigaiResponse> {
    try {
      // Call your API endpoint
      const response = await fetch('/api/ikigai/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error saving Ikigai results:', error);
      return {
        success: false,
        message: 'Failed to save Ikigai results. Please try again.',
      };
    }
  }
  
  // Send Ikigai summary via email
  export async function sendIkigaiByEmail(email: string, data: IkigaiData): Promise<boolean> {
    try {
      const response = await fetch('/api/ikigai/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          ikigaiData: data,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error sending Ikigai by email:', error);
      return false;
    }
  }
  
  // Send Ikigai summary via WhatsApp
  export async function sendIkigaiByWhatsApp(phoneNumber: string, data: IkigaiData): Promise<boolean> {
    try {
      const response = await fetch('/api/ikigai/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          ikigaiData: data,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error sending Ikigai by WhatsApp:', error);
      return false;
    }
  }
  
  // Schedule a coaching call
  export async function scheduleCoachingCall(
    name: string,
    email: string,
    phoneNumber?: string
  ): Promise<ScheduleCoachingResponse> {
    try {
      const response = await fetch('/api/ikigai/schedule-coaching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          phoneNumber,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error scheduling coaching call:', error);
      return {
        success: false,
        message: 'Failed to schedule coaching call. Please try again.',
      };
    }
  }
  
  // Determine if a string is an email
  export function isEmail(contact: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(contact);
  }
  
  // Determine if a string is a phone number
  export function isPhoneNumber(contact: string): boolean {
    // Simple regex for international phone numbers
    const phoneRegex = /^\+?[0-9\s\-\(\)]{8,20}$/;
    return phoneRegex.test(contact);
  }
  
  // Generate PDF summary for download
  export function generatePdfSummary(data: IkigaiData): string {
    // In a real implementation, you would generate a PDF here
    // For now, we're just returning a dummy URL
    return `/api/ikigai/download-pdf?id=${encodeURIComponent(JSON.stringify(data))}`;
  }