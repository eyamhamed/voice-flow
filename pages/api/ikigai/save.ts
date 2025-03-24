import type { NextApiRequest, NextApiResponse } from 'next';

interface IkigaiData {
  passions: string;
  talents: string;
  worldNeeds: string;
  monetization: string;
  summary: string;
  contactInfo?: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  resultId?: string;
}

// In-memory storage for Ikigai results (would use a database in production)
const ikigaiResults: Array<{
  id: string;
  data: IkigaiData;
  createdAt: Date;
}> = [];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const data = req.body as IkigaiData;
    
    // Validate required fields
    if (!data.passions || !data.talents || !data.worldNeeds || !data.monetization) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Generate a unique ID
    const resultId = Date.now().toString();
    
    // Store the result
    ikigaiResults.push({
      id: resultId,
      data,
      createdAt: new Date()
    });
    
    // Clean up results older than 15 days (privacy policy)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    const filteredResults = ikigaiResults.filter(
      result => result.createdAt > fifteenDaysAgo
    );
    
    // Log the data cleanup (would be more sophisticated in production)
    if (ikigaiResults.length !== filteredResults.length) {
      console.log(`Cleaned up ${ikigaiResults.length - filteredResults.length} old Ikigai results`);
      // Update the array
      ikigaiResults.length = 0;
      ikigaiResults.push(...filteredResults);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Ikigai data saved successfully',
      resultId
    });
  } catch (error) {
    console.error('Error saving Ikigai data:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}