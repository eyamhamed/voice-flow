import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useTranslation } from 'next-i18next';
import { useLanguage } from './LanguageManager';
import { getChatGptAnswer } from './callUtil';
import { CallHistoryType } from './CallHistory';
import { speak as elevenLabsSpeak, stopSpeaking as elevenLabsStopSpeaking } from './elevenLabsService';
import { ConversationStep, MessageType } from './types'; // Fix the import

interface IkigaiData {
  passions: string;
  talents: string;
  worldNeeds: string;
  monetization: string;
  summary: string;
}

interface CallContextType {
  userCall: () => void;
  userSpeak: () => void;
  userStopSpeaking: () => void;
  listening: boolean;
  isCalling: boolean;
  endCall: () => void;
  handleSend: (message: string) => void;
  messages: MessageType[];
  isChatbotSpeaking: boolean;
  selectedVoice: string;
  availableVoices: { id: string, name: string }[];
  setSelectedVoice: (voiceId: string) => void;
  // Ikigai specific
  currentStep: ConversationStep;
  ikigaiOptions: string[];
  passionsSummary: string;
  talentsSummary: string;
  worldNeedsSummary: string;
  monetizationSummary: string;
  ikigaiSummary: string;
  isProcessingIkigai: boolean;
  startIkigaiFlow: () => void;
  setMessages: React.Dispatch<React.SetStateAction<MessageType[]>>;
  resetConversation: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

type CallManagerProps = {
  children: React.ReactNode;
};

const CallManager: React.FC<CallManagerProps> = ({ children }) => {
  const isUserCalling = useRef(false);
  const isChatbotSpeaking = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Translation hooks
  const { t, i18n } = useTranslation();

  // Ikigai specific state
  const [currentStep, setCurrentStep] = useState<ConversationStep>(ConversationStep.INTRODUCTION);
  const [ikigaiOptions, setIkigaiOptions] = useState<string[]>([]);
  const [passionsSummary, setPassionsSummary] = useState<string>('');
  const [talentsSummary, setTalentsSummary] = useState<string>('');
  const [worldNeedsSummary, setWorldNeedsSummary] = useState<string>('');
  const [monetizationSummary, setMonetizationSummary] = useState<string>('');
  const [ikigaiSummary, setIkigaiSummary] = useState<string>('');
  const [contactInfo, setContactInfo] = useState<string>('');
  const [isProcessingIkigai, setIsProcessingIkigai] = useState<boolean>(false);
  const [ikigaiUserResponses, setIkigaiUserResponses] = useState<{step: ConversationStep, response: string}[]>([]);
  const [isRunningIkigaiFlow, setIsRunningIkigaiFlow] = useState<boolean>(false);
  
  // New state variables to fix the infinite loop
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  
  const commands = [
    {
      command: ['*'],
      callback: (command: string) => handleSend(command),
    },
  ];

  const [isBobSpeaking, setIsBobSpeaking] = useState(isChatbotSpeaking.current);
  const [isCalling, setIsCalling] = useState(isUserCalling.current);
  const { transcript, resetTranscript, listening } = useSpeechRecognition({
    commands,
  });
  const [userLocalStorage, setUserLocalStorage] = useState<Storage | null>(null);
  const { selectedLanguage } = useLanguage();
  
  const defaultIntroduction = t('bob.introduction');
  // Wrap in useMemo to fix the ESLint error
  const defaultMessage = useMemo(() => [
    {
      message: defaultIntroduction,
      sender: 'ChatGPT',
    },
  ], [defaultIntroduction]);
  
  const [messages, setMessages] = useState<MessageType[]>(defaultMessage);
  
  // 11labs voice configuration
  const [availableVoices, setAvailableVoices] = useState<{ id: string, name: string }[]>([
    { id: 'default', name: 'Default Browser Voice' },
    { id: 'rachel', name: 'Rachel (11labs)' },
    { id: 'antoni', name: 'Antoni (11labs)' },
    { id: 'bella', name: 'Bella (11labs)' },
    { id: 'josh', name: 'Josh (11labs)' },
    // Add more voices as needed
  ]);
  const [selectedVoice, setSelectedVoice] = useState('default');
  const [isUsingElevenLabs, setIsUsingElevenLabs] = useState(false);

  // SMART IKIGAI ANALYSIS FUNCTIONS

  // 1. Analyze responses to extract meaning from natural language
  const analyzeResponse = useCallback((response: string, context: string): { 
    topics: string[],
    sentiment: 'positive' | 'negative' | 'neutral',
    confidence: number,
    keywords: string[]
  } => {
    // Extract keywords from text
    const extractKeywords = (text: string): string[] => {
      const stopWords = ['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'pour', 'par', 'dans'];
      
      // Normalize text: lowercase, remove punctuation, split into words
      const words = text.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split(/\s+/);
      
      // Filter out stop words and short words
      const filteredWords = words.filter(word => 
        word.length > 2 && !stopWords.includes(word.toLowerCase())
      );
      
      // Count word frequencies
      const wordFreq: {[key: string]: number} = {};
      filteredWords.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
      
      // Sort by frequency and return top keywords
      return Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
    };
    
    // Estimate sentiment using keyword matching
    const estimateSentiment = (text: string): 'positive' | 'negative' | 'neutral' => {
      const positiveWords = ['love', 'enjoy', 'happy', 'good', 'great', 'excellent', 'wonderful', 'amazing', 'like', 'passion', 'joy', 'excited', 
                            'aimer', 'adorer', 'heureux', 'heureuse', 'bon', 'bonne', 'excellent', 'excellente', 'passion', 'joie'];
      const negativeWords = ['hate', 'dislike', 'bad', 'terrible', 'awful', 'boring', 'difficult', 'hard', 'struggle', 'problem', 'issue', 'worry',
                            'détester', 'mauvais', 'mauvaise', 'terrible', 'ennuyeux', 'ennuyeuse', 'difficile', 'problème', 'inquiéter'];
      
      const lowercaseText = text.toLowerCase();
      let positiveCount = 0;
      let negativeCount = 0;
      
      positiveWords.forEach(word => {
        if (lowercaseText.includes(word)) positiveCount++;
      });
      
      negativeWords.forEach(word => {
        if (lowercaseText.includes(word)) negativeCount++;
      });
      
      if (positiveCount > negativeCount) return 'positive';
      if (negativeCount > positiveCount) return 'negative';
      return 'neutral';
    };
    
    // Extract topics based on conversation context
    const extractTopics = (text: string, context: string): string[] => {
      const keywords = extractKeywords(text);
      let topics: string[] = [];
      
      // Adjust extraction strategy based on what we're asking about
      switch(context) {
        case 'passions':
          // Look for activities, hobbies, interests
          const passionPhrases = text.match(/(?:j'aime|j'adore|je suis passionné par|i love|i enjoy|i'm passionate about)(?:\s\w+){1,5}/gi) || [];
          passionPhrases.forEach(phrase => {
            const cleanPhrase = phrase.replace(/(?:j'aime|j'adore|je suis passionné par|i love|i enjoy|i'm passionate about)\s/gi, '').trim();
            if (cleanPhrase.length > 2) topics.push(cleanPhrase);
          });
          break;
          
        case 'talents':
          // Look for skills, abilities, strengths
          const talentPhrases = text.match(/(?:je suis doué|je suis bon|je suis forte|i'm good at|i excel at|my skill is)(?:\s\w+){1,5}/gi) || [];
          talentPhrases.forEach(phrase => {
            const cleanPhrase = phrase.replace(/(?:je suis doué|je suis bon|je suis forte|i'm good at|i excel at|my skill is)\s/gi, '').trim();
            if (cleanPhrase.length > 2) topics.push(cleanPhrase);
          });
          break;
          
        case 'world_needs':
          // Look for global issues, problems, concerns
          const problemPhrases = text.match(/(?:problème|problem|issue|challenge|défi|besoin|need)(?:\s\w+){1,5}/gi) || [];
          problemPhrases.forEach(phrase => {
            if (phrase.length > 5) topics.push(phrase.trim());
          });
          break;

        case 'monetization':
          // Look for job titles, professions, business ideas
          const jobPhrases = text.match(/(?:métier|profession|job|career|business|entreprise)(?:\s\w+){1,5}/gi) || [];
          jobPhrases.forEach(phrase => {
            if (phrase.length > 5) topics.push(phrase.trim());
          });
          break;
      }
      
      // If no specific topics found, return general keywords
      return topics.length > 0 ? topics : keywords;
    };
    
    const keywords = extractKeywords(response);
    const sentiment = estimateSentiment(response);
    const topics = extractTopics(response, context);
    
    // Calculate confidence based on response length and keyword relevance
    const confidence = Math.min(1, (response.length / 50) * 0.5 + (topics.length / 3) * 0.5);
    
    return {
      topics,
      sentiment,
      confidence,
      keywords
    };
  }, []);

  // 2. Smarter summary generation
  const generateSmartSummary = useCallback((text: string, context: string): string => {
    const analysis = analyzeResponse(text, context);
    
    // If confidence is low, return the original text
    if (analysis.confidence < 0.3) return text;
    
    // For higher confidence responses, create a more concise summary
    if (analysis.topics.length > 0) {
      return analysis.topics.join(', ');
    }
    
    // Fallback to keywords if no topics were identified
    return analysis.keywords.join(', ');
  }, [analyzeResponse]);

  // 3. Career suggestion helper
  const suggestCareers = useCallback((passions: string[], talents: string[], worldNeeds: string[], monetization: string[]): string[] => {
    // Career categories with associated keywords
    const careerCategories: {[key: string]: string[]} = {
      'enseignement/education': ['enseigner', 'éducation', 'apprendre', 'teaching', 'education', 'learning', 'formation', 'trainer'],
      'arts/creative': ['art', 'créatif', 'creative', 'design', 'écriture', 'writing', 'music', 'musique', 'dessin', 'drawing'],
      'technology': ['tech', 'technologie', 'développement', 'programming', 'computer', 'ordinateur', 'software', 'logiciel', 'code'],
      'healthcare': ['santé', 'health', 'soins', 'care', 'médical', 'medical', 'therapy', 'thérapie'],
      'environment': ['environnement', 'environment', 'nature', 'durable', 'sustainable', 'écologie', 'ecology'],
      'social_work': ['social', 'communauté', 'community', 'aide', 'help', 'service', 'soutien', 'support'],
      'business': ['business', 'entreprise', 'entrepreneuriat', 'management', 'gestion', 'finance', 'marketing'],
      'research': ['recherche', 'research', 'science', 'analysis', 'analyse', 'étude', 'study', 'exploration']
    };
    
    // Score each career category based on keyword overlap
    const categoryScores: {[key: string]: number} = {};
    
    Object.entries(careerCategories).forEach(([category, categoryKeywords]) => {
      let score = 0;
      
      // Check for overlaps with user's passions, talents, etc.
      categoryKeywords.forEach(keyword => {
        passions.forEach(passion => {
          if (passion.includes(keyword) || keyword.includes(passion)) score += 3;
        });
        
        talents.forEach(talent => {
          if (talent.includes(keyword) || keyword.includes(talent)) score += 3;
        });
        
        worldNeeds.forEach(need => {
          if (need.includes(keyword) || keyword.includes(need)) score += 2;
        });
        
        monetization.forEach(job => {
          if (job.includes(keyword) || keyword.includes(job)) score += 2;
        });
      });
      
      categoryScores[category] = score;
    });
    
    // Map category scores to specific career suggestions
    const careerSuggestions: {[key: string]: string[]} = {
      'enseignement/education': ['professeur', 'formateur', 'coach éducatif', 'créateur de contenu pédagogique'],
      'arts/creative': ['artiste indépendant', 'designer', 'rédacteur', 'directeur créatif'],
      'technology': ['développeur', 'consultant tech', 'data scientist', 'designer UX'],
      'healthcare': ['thérapeute', 'conseiller en bien-être', 'coach de santé', 'praticien holistique'],
      'environment': ['consultant en développement durable', 'entrepreneur vert', 'expert en écologie'],
      'social_work': ['travailleur social', 'conseiller', 'coordinateur de communauté', 'responsable ONG'],
      'business': ['entrepreneur', 'consultant', 'coach professionnel', 'spécialiste en marketing'],
      'research': ['chercheur', 'analyste', 'écrivain spécialisé', 'consultant expert']
    };
    
    // Get top 3 categories by score
    const topCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .filter(([_, score]) => score > 0)
      .map(([category]) => category);
    
    // Get career suggestions from top categories
    let suggestions: string[] = [];
    topCategories.forEach(category => {
      const categorySuggestions = careerSuggestions[category];
      if (categorySuggestions) {
        suggestions = [...suggestions, ...categorySuggestions.slice(0, 2)]; // Take top 2 from each category
      }
    });
    
    return suggestions.slice(0, 4); // Return up to 4 suggestions
  }, []);

  // Define callback functions to avoid ESLint warnings
  const handleChatbotSpeechStart = useCallback(() => {
    console.log('Speech started');
    isChatbotSpeaking.current = true;
    setIsBobSpeaking(true);
    SpeechRecognition.stopListening();
  }, []);

  const handleChatbotSpeechEnd = useCallback(() => {
    console.log('Speech ended');
    if (isUserCalling.current) {
      SpeechRecognition.startListening({ language: selectedLanguage });
    }
    isChatbotSpeaking.current = false;
    setIsBobSpeaking(false);
  }, [selectedLanguage]);

  // Helper functions with proper memoization
  const isAffirmative = useCallback((resp: string): boolean => {
    const lowerResp = resp.toLowerCase();
    return lowerResp === 'oui' || lowerResp === 'yes' || 
           lowerResp === t('options.yes', 'Oui').toLowerCase();
  }, [t]);
  
  const isNegative = useCallback((resp: string): boolean => {
    const lowerResp = resp.toLowerCase();
    return lowerResp === 'non' || lowerResp === 'no' ||
           lowerResp === t('options.no', 'Non').toLowerCase();
  }, [t]);
  
  const isUncertain = useCallback((resp: string): boolean => {
    const lowerResp = resp.toLowerCase();
    return lowerResp.includes('sûr') || lowerResp.includes('sure') ||
           lowerResp === t('options.notSure', 'Je ne suis pas sûr(e)').toLowerCase();
  }, [t]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUserLocalStorage(localStorage);
      
      // Create audio element for 11labs playback
      audioRef.current = new Audio();
      audioRef.current.onended = handleChatbotSpeechEnd;
      audioRef.current.onplay = handleChatbotSpeechStart;
      audioRef.current.onerror = (e) => {
        console.error('Audio playback error:', e);
        handleChatbotSpeechEnd();
      };
      
      // Load selected voice from localStorage if available
      const savedVoice = localStorage.getItem('selectedVoice');
      if (savedVoice) {
        setSelectedVoice(savedVoice);
        setIsUsingElevenLabs(savedVoice !== 'default');
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset call when language changes
  useEffect(() => {
    endCall();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultIntroduction, selectedLanguage]);
  
  // Update localStorage when voice changes
  useEffect(() => {
    if (userLocalStorage) {
      userLocalStorage.setItem('selectedVoice', selectedVoice);
      setIsUsingElevenLabs(selectedVoice !== 'default');
      console.log('Voice changed to:', selectedVoice, 'Using ElevenLabs:', selectedVoice !== 'default');
    }
  }, [selectedVoice, userLocalStorage]);

  // Enhanced Ikigai summary generation - add suggestCareers to dependencies
  const generateIkigaiSummary = useCallback(() => {
    // Analyze all components for key themes
    const passionAnalysis = analyzeResponse(passionsSummary, 'passions');
    const talentAnalysis = analyzeResponse(talentsSummary, 'talents');
    const worldNeedsAnalysis = analyzeResponse(worldNeedsSummary, 'world_needs');
    const monetizationAnalysis = analyzeResponse(monetizationSummary, 'monetization');
    
    // Look for connections across all four areas
    const allKeywords = [
      ...passionAnalysis.keywords,
      ...talentAnalysis.keywords,
      ...worldNeedsAnalysis.keywords,
      ...monetizationAnalysis.keywords
    ];
    
    // Find frequency of keywords to identify common themes
    const keywordFrequency: {[key: string]: number} = {};
    allKeywords.forEach(word => {
      keywordFrequency[word] = (keywordFrequency[word] || 0) + 1;
    });
    
    // Get keywords that appear in multiple areas (potential Ikigai center)
    const commonThemes = Object.entries(keywordFrequency)
      .filter(([_, count]) => count >= 2)
      .map(([word]) => word);
    
    let ikigaiCore = "";
    if (commonThemes.length > 0) {
      ikigaiCore = t('ikigai.coreThemes', 
        "Le cœur de votre Ikigai semble tourner autour de {{themes}}. C'est là que vos différentes dimensions s'alignent le mieux.", 
        { themes: commonThemes.join(', ') });
    }
    
    // Generate specific career suggestions based on all four components
    let careerSuggestions = "";
    if (passionsSummary && talentsSummary && worldNeedsSummary && monetizationSummary) {
      // Simple career matching logic
      const possibleCareers = suggestCareers(passionAnalysis.keywords, talentAnalysis.keywords, 
                                            worldNeedsAnalysis.keywords, monetizationAnalysis.keywords);
      if (possibleCareers.length > 0) {
        careerSuggestions = t('ikigai.careerSuggestions',
          "Basé sur votre profil, vous pourriez explorer des voies professionnelles comme : {{careers}}.",
          { careers: possibleCareers.join(', ') });
      }
    }
    
    const summary = `
      ${t('ikigai.summaryPassions', 'Votre passion semble être', { passions: passionsSummary })}.
      ${t('ikigai.summaryTalents', 'Vos talents incluent', { talents: talentsSummary })}.
      ${t('ikigai.summaryWorldNeeds', 'Les besoins du monde qui vous touchent sont', { worldNeeds: worldNeedsSummary })}.
      ${t('ikigai.summaryMonetization', 'Et vous pourriez potentiellement gagner votre vie en', { monetization: monetizationSummary })}.
      
      ${ikigaiCore}
      
      ${careerSuggestions}
      
      ${t('ikigai.summaryConclusion', "L'intersection de ces quatre domaines constitue votre Ikigai - votre raison d'être.")}
    `;
    
    setIkigaiSummary(summary);
    return summary;
  }, [t, passionsSummary, talentsSummary, worldNeedsSummary, monetizationSummary, analyzeResponse, suggestCareers]);

  const chatBotSpeak = useCallback(async (message: string) => {
    if (isChatbotSpeaking.current || !isUserCalling.current) {
      return;
    }

    console.log('chatBotSpeak called with voice:', selectedVoice, 'Using ElevenLabs:', isUsingElevenLabs);

    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      if (isUsingElevenLabs) {
        const audioUrl = await elevenLabsSpeak(
          t('bob.browserNotSupportSpeechRecognitionMessage'),
          selectedVoice.replace('11labs-', ''),
          selectedLanguage
        );
        
        if (audioRef.current && audioUrl) {
          console.log('Setting audio source to:', audioUrl);
          audioRef.current.src = audioUrl;
          audioRef.current.play().catch(err => {
            console.error('Audio play error:', err);
            handleChatbotSpeechEnd();
          });
        } else {
          console.error('No audio URL or audio element available');
          handleChatbotSpeechEnd();
        }
      } else {
        // Fallback to browser speech
        const utterance = new SpeechSynthesisUtterance(t('bob.browserNotSupportSpeechRecognitionMessage'));
        utterance.lang = selectedLanguage;
        utterance.onstart = handleChatbotSpeechStart;
        utterance.onend = handleChatbotSpeechEnd;
        window.speechSynthesis.speak(utterance);
      }
      return;
    }

    if (isUsingElevenLabs) {
      try {
        console.log('Using ElevenLabs for speech with voice:', selectedVoice);
        const audioUrl = await elevenLabsSpeak(
          message,
          selectedVoice,
          selectedLanguage
        );
        
        if (audioRef.current && audioUrl) {
          console.log('Setting audio source to:', audioUrl);
          audioRef.current.src = audioUrl;
          audioRef.current.play().catch(err => {
            console.error('Audio play error:', err);
            handleChatbotSpeechEnd();
          });
        } else {
          console.error('No audio URL or audio element available');
          handleChatbotSpeechEnd();
        }
      } catch (error) {
        console.error('Error using 11labs voice:', error);
        // Fallback to browser speech
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = selectedLanguage;
        utterance.onstart = handleChatbotSpeechStart;
        utterance.onend = handleChatbotSpeechEnd;
        window.speechSynthesis.speak(utterance);
      }
    } else {
      // Use browser's built-in speech synthesis
      console.log('Using browser speech synthesis');
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = selectedLanguage;
      utterance.onstart = handleChatbotSpeechStart;
      utterance.onend = handleChatbotSpeechEnd;
      window.speechSynthesis.speak(utterance);
    }
  }, [t, selectedVoice, isUsingElevenLabs, selectedLanguage, handleChatbotSpeechStart, handleChatbotSpeechEnd]);

  // SOLUTION 2: First useEffect to determine message and options based on current step
  // This effect computes what should be shown but doesn't update UI state
  useEffect(() => {
    if (!isRunningIkigaiFlow) {
      setCurrentMessage('');
      setCurrentOptions([]);
      return;
    }

    let message = '';
    let options: string[] = [];

    switch (currentStep) {
      case ConversationStep.INTRODUCTION:
        message = t('ikigai.introMessage', 
          "Bienvenue. Je suis Cool Ikigai. Je peux vous aider à améliorer votre rapport au travail et à vous aligner sur vos aspirations avec succès. Tout ceci grâce à l'Ikigai, un concept transformateur, originaire de l'île d'Okinawa, au Japon. Tout d'abord sachez que notre politique de confidentialité est très stricte. Nous détruisons toute donnée personnelle collectée au bout de 15 jours. Nous ne pratiquons aucun commerce autour de la data.");
        break;
        
      case ConversationStep.READY_CHECK:
        message = t('ikigai.readyCheck', 
          "A présent, j'ai besoin de savoir si vous êtes dans de bonnes conditions pour répondre à quelques questions. Pour un parcours classique, il faut compter environ 10 minutes à partir de maintenant et 2,5€, en moyenne, facturés par votre opérateur. Les résultats sont gratuits. Essayez de vous isoler et si vous êtes entouré(e), je vous recommande l'utilisation d'écouteurs. Je vais, maintenant, vous interroger et vous aider à évoquer des choses importantes. Vous pouvez répondre librement, et je m'adapterai à vos réponses. Etes-vous prêt(e) ?");
        options = [t('options.yes', 'Oui'), t('options.no', 'Non'), t('options.notSure', 'Je ne suis pas sûr(e)')];
        break;
        
      case ConversationStep.PASSIONS:
        message = t('ikigai.passionsQuestion', 
          "Parfait, commençons ! Dites-moi, quelles activités vous apportent le plus de joie, de satisfaction personnelle ou d'énergie dans votre quotidien ? Vous pouvez mentionner plusieurs choses.");
        break;
        
      case ConversationStep.VALIDATE_PASSIONS:
        message = t('ikigai.validatePassions', 
          "Si j'ai bien compris, ce qui vous passionne, c'est {{passions}}. Est-ce exact ?", 
          { passions: passionsSummary });
        options = [t('options.yes', 'Oui'), t('options.no', 'Non')];
        break;
        
      case ConversationStep.TALENTS:
        message = t('ikigai.talentsQuestion', 
          "Quelles sont vos compétences ou talents naturels, selon vous ou votre entourage ?");
        break;
        
      case ConversationStep.VALIDATE_TALENTS:
        message = t('ikigai.validateTalents', 
          "Vous excellez donc dans {{talents}}. Est-ce bien cela ?", 
          { talents: talentsSummary });
        options = [t('options.yes', 'Oui'), t('options.no', 'Non')];
        break;
        
      case ConversationStep.WORLD_NEEDS:
        message = t('ikigai.worldNeedsQuestion', 
          "À votre avis, quels sont les besoins ou problèmes du monde qui vous touchent particulièrement et sur lesquels vous aimeriez agir ?");
        break;
        
      case ConversationStep.VALIDATE_WORLD_NEEDS:
        message = t('ikigai.validateWorldNeeds', 
          "Vous vous souciez donc de {{worldNeeds}}. Est-ce correct ?", 
          { worldNeeds: worldNeedsSummary });
        options = [t('options.yes', 'Oui'), t('options.no', 'Non')];
        break;
        
      case ConversationStep.MONETIZATION:
        message = t('ikigai.monetizationQuestion', 
          "Imaginez que vous puissiez gagner votre vie en faisant quelque chose qui vous passionne. Quels métiers ou services pourraient correspondre à vos talents et aux besoins que vous avez mentionnés ?");
        break;
        
      case ConversationStep.VALIDATE_MONETIZATION:
        message = t('ikigai.validateMonetization', 
          "Vous pourriez donc envisager {{monetization}}. Est-ce bien ce que vous avez en tête ?", 
          { monetization: monetizationSummary });
        options = [t('options.yes', 'Oui'), t('options.no', 'Non')];
        break;
        
      case ConversationStep.SUMMARY:
        // Generate ikigai summary if not already done
        if (!ikigaiSummary) {
          const summary = generateIkigaiSummary();
          message = t('ikigai.summaryMessage', 
            "D'après vos réponses, voici un aperçu de votre Ikigai potentiel : {{summary}}. Voulez-vous recevoir un résumé de cette session par email ou WhatsApp ?", 
            { summary });
        } else {
          message = t('ikigai.summaryMessage', 
            "D'après vos réponses, voici un aperçu de votre Ikigai potentiel : {{summary}}. Voulez-vous recevoir un résumé de cette session par email ou WhatsApp ?", 
            { summary: ikigaiSummary });
        }
        options = [t('options.yes', 'Oui'), t('options.no', 'Non')];
        break;
        
      case ConversationStep.EMAIL_REQUEST:
        const lastResponse = ikigaiUserResponses[ikigaiUserResponses.length - 1]?.response || '';
        if (isAffirmative(lastResponse)) {
          message = t('ikigai.emailRequest', 
            "Veuillez saisir votre adresse email ou votre numéro WhatsApp pour recevoir votre résumé :");
        } else {
          message = t('ikigai.coachingRequest', 
            "Si vous souhaitez aller plus loin, nous proposons des sessions personnalisées avec un expert. Souhaitez-vous réserver un appel avec un coach ?");
          options = [t('options.yes', 'Oui'), t('options.no', 'Non'), t('options.notSure', 'Je ne suis pas sûr(e)')];
        }
        break;
        
      case ConversationStep.COACHING:
        const coachingResponse = ikigaiUserResponses[ikigaiUserResponses.length - 1]?.response || '';
        if (isAffirmative(coachingResponse)) {
          message = t('ikigai.coachingSchedule', 
            "Pour planifier un appel avec un coach, veuillez indiquer votre nom, email et numéro de téléphone (optionnel) séparés par des virgules. Par exemple : Jean Dupont, jean@example.com, +33612345678");
        } else if (isUncertain(coachingResponse)) {
          message = t('ikigai.coachingInfo', 
            "Vous pouvez réfléchir et prendre rendez-vous plus tard si vous le souhaitez. Voulez-vous recevoir plus d'informations sur ce service ?");
          options = [t('options.yes', 'Oui'), t('options.no', 'Non')];
        } else {
          message = t('ikigai.conclusionMessage', 
            "Merci pour votre temps ! Je vous souhaite une belle exploration de votre Ikigai. À bientôt !");
          // End ikigai flow - will be handled in the second useEffect
        }
        break;
        
      case ConversationStep.CONCLUSION:
        message = t('ikigai.conclusionMessage', 
          "Merci pour votre temps ! Je vous souhaite une belle exploration de votre Ikigai. À bientôt !");
        // End ikigai flow - will be handled in the second useEffect
        break;
    }

    // Store the message and options in local state instead of updating UI
    setCurrentMessage(message);
    setCurrentOptions(options);
  }, [
    currentStep, 
    isRunningIkigaiFlow, 
    t, 
    i18n.language, 
    passionsSummary, 
    talentsSummary, 
    worldNeedsSummary, 
    monetizationSummary, 
    ikigaiSummary,
    generateIkigaiSummary,
    isAffirmative,
    isUncertain,
    ikigaiUserResponses
  ]);

  // SOLUTION 2: Second useEffect to update UI based on computed message and options
  useEffect(() => {
    // Skip if no message to display
    if (!currentMessage) return;
    
    // Update messages
    setMessages(prev => [...prev, { message: currentMessage, sender: 'ChatGPT' }]);
    
    // Speak the message
    chatBotSpeak(currentMessage);
    
    // Update options
    setIkigaiOptions(currentOptions);
    
    // Handle conclusion step - end the Ikigai flow if needed
    if (currentStep === ConversationStep.CONCLUSION) {
      setTimeout(() => {
        setIsRunningIkigaiFlow(false);
      }, 1000);
    }
    
    // Clear the current message to prevent repeated updates
    setCurrentMessage('');
  }, [currentMessage, currentOptions, chatBotSpeak, currentStep]);

  // Enhanced Ikigai response processing
  const processIkigaiResponse = useCallback((response: string) => {
    // Save the response
    setIkigaiUserResponses(prev => [...prev, {step: currentStep, response}]);
    
    switch (currentStep) {
      case ConversationStep.INTRODUCTION:
        setCurrentStep(ConversationStep.READY_CHECK);
        break;
        
      case ConversationStep.READY_CHECK:
        if (isAffirmative(response)) {
          setCurrentStep(ConversationStep.PASSIONS);
        } else if (isNegative(response)) {
          // End the conversation with a goodbye message
          const goodbyeMessage = t('ikigai.conclusionMessage', "D'accord, vous pouvez raccrocher et revenir plus tard. À bientôt !");
          setMessages(prev => [
            ...prev,
            {
              message: goodbyeMessage,
              sender: 'ChatGPT',
            },
          ]);
          chatBotSpeak(goodbyeMessage);
          
          // After speaking, end the Ikigai flow
          setTimeout(() => {
            setCurrentStep(ConversationStep.CONCLUSION);
            setIsRunningIkigaiFlow(false);
          }, 3000);
        } else {
          // Handle hesitation with clarification
          const clarificationMessage = t('ikigai.clarification', "Je vais simplement vous poser des questions pour explorer ce qui vous anime. Aucun engagement, juste une exploration personnelle. Prêt(e) à essayer ?");
          setMessages(prev => [
            ...prev,
            {
              message: clarificationMessage,
              sender: 'ChatGPT',
            },
          ]);
          chatBotSpeak(clarificationMessage);
          
          // Stay at the same step to await another response
        }
        break;
        
      case ConversationStep.PASSIONS:
        // Analyze the response for better understanding
        const passionAnalysis = analyzeResponse(response, 'passions');
        
        if (response.toLowerCase() === 'je ne sais pas' || 
            response.toLowerCase() === 'i don\'t know' ||
            response.toLowerCase() === 'i dont know' ||
            passionAnalysis.confidence < 0.2) {
          // If confidence is very low or explicit "don't know", guide with a specific prompt
          let promptMessage: string; // Added explicit type
          
          // If response is very short, ask for more details
          if (response.length < 10) {
            promptMessage = t('ikigai.morePassions', "Pouvez-vous m'en dire un peu plus ? Pensez aux activités qui vous procurent de la joie, même si elles semblent simples ou ordinaires.");
          } 
          // If sentiment is negative, provide encouragement
          else if (passionAnalysis.sentiment === 'negative') {
            promptMessage = t('ikigai.passionsEncouragement', "Je comprends que ce n'est pas toujours facile d'identifier ses passions. Essayons autrement : qu'est-ce qui vous fait perdre la notion du temps quand vous le faites ?");
          }
          // Default prompt for unclear responses
          else {
            promptMessage = t('ikigai.unknownPassions', "Pensez à un moment où vous étiez totalement absorbé(e) par une activité, sans voir le temps passer. Qu'étiez-vous en train de faire ?");
          }
          
          setMessages(prev => [
            ...prev,
            {
              message: promptMessage,
              sender: 'ChatGPT',
            },
          ]);
          chatBotSpeak(promptMessage);
          // Stay at the same step
        } else {
          // Generate a smart summary of passions
          const smartSummary = generateSmartSummary(response, 'passions');
          setPassionsSummary(smartSummary);
          setCurrentStep(ConversationStep.VALIDATE_PASSIONS);
        }
        break;
        
      case ConversationStep.VALIDATE_PASSIONS:
        if (isAffirmative(response)) {
          setCurrentStep(ConversationStep.TALENTS);
        } else {
          // If user disagrees with summary, ask for clarification
          const clarificationMessage = t('ikigai.passionsClarification', "Je vous prie de m'excuser. Pourriez-vous préciser vos passions à nouveau, peut-être en donnant plus de détails ?");
          setMessages(prev => [
            ...prev,
            {
              message: clarificationMessage,
              sender: 'ChatGPT',
            },
          ]);
          chatBotSpeak(clarificationMessage);
          // Go back to passions question for clarification
          setCurrentStep(ConversationStep.PASSIONS);
        }
        break;
        
      case ConversationStep.TALENTS:
        // Similar smart analysis for talents
        const talentAnalysis = analyzeResponse(response, 'talents');
        
        if (response.toLowerCase().includes('je ne sais pas') || 
            response.toLowerCase().includes('i don\'t know') ||
            talentAnalysis.confidence < 0.2) {
          // Guide with talent-specific prompts
          let promptMessage: string; // Added explicit type
          
          if (response.length < 15) {
            promptMessage = t('ikigai.moreTalents', "Essayez de penser aux compliments que vous recevez souvent, ou aux tâches que les autres vous demandent d'accomplir parce que vous y excellez.");
          } else if (talentAnalysis.sentiment === 'negative') {
            promptMessage = t('ikigai.talentsEncouragement', "Nous avons tous des talents, même si nous ne les reconnaissons pas toujours. Que vous disent vos amis ou collègues que vous faites bien ?");
          } else {
            promptMessage = t('ikigai.talentsAlternative', "Si vous deviez aider quelqu'un, dans quel domaine seriez-vous le plus utile ? Qu'est-ce qui vous semble facile alors que d'autres trouvent cela difficile ?");
          }
          
          setMessages(prev => [
            ...prev,
            {
              message: promptMessage,
              sender: 'ChatGPT',
            },
          ]);
          chatBotSpeak(promptMessage);
          // Stay at talents step
        } else {
          // Generate a smart summary using talent keywords
          const smartTalentsSummary = generateSmartSummary(response, 'talents');
          setTalentsSummary(smartTalentsSummary);
          setCurrentStep(ConversationStep.VALIDATE_TALENTS);
        }
        break;
        
      case ConversationStep.VALIDATE_TALENTS:
        if (isAffirmative(response)) {
          // Check for connections between passions and talents
          const passionKeywords = analyzeResponse(passionsSummary, 'passions').keywords;
          const talentKeywords = analyzeResponse(talentsSummary, 'talents').keywords;
          
          const commonKeywords = passionKeywords.filter(word => 
            talentKeywords.some(keyword => word.includes(keyword) || keyword.includes(word))
          );
          
          // Fix TypeScript error by adding explicit type checking and default value
          if (commonKeywords.length > 0) {
            const transitionMessage = t(
              'ikigai.passionTalentConnection', 
              "Je remarque que vos passions et vos talents semblent alignés autour de {{common}}. C'est excellent! Maintenant, explorons comment cela pourrait répondre aux besoins du monde.", 
              { common: commonKeywords.join(', ') }
            );
            
            setMessages(prev => [
              ...prev,
              { message: transitionMessage || "", sender: 'ChatGPT' },
            ]);
            
            chatBotSpeak(transitionMessage);
          }
          
          setCurrentStep(ConversationStep.WORLD_NEEDS);
        } else {
          setCurrentStep(ConversationStep.TALENTS);
        }
        break;
        
      case ConversationStep.WORLD_NEEDS:
        const needsAnalysis = analyzeResponse(response, 'world_needs');
        
        if (response.toLowerCase().includes('je ne sais pas') || 
            needsAnalysis.confidence < 0.2) {
          let promptMessage = t('ikigai.worldNeedsPrompt', 
            "Pensez aux informations qui vous touchent, ou aux causes qui vous tiennent à cœur. Quels problèmes dans le monde aimeriez-vous aider à résoudre ?");
          
          setMessages(prev => [
            ...prev,
            { message: promptMessage, sender: 'ChatGPT' },
          ]);
          chatBotSpeak(promptMessage);
        } else {
          const smartWorldNeedsSummary = generateSmartSummary(response, 'world_needs');
          setWorldNeedsSummary(smartWorldNeedsSummary);
          setCurrentStep(ConversationStep.VALIDATE_WORLD_NEEDS);
        }
        break;
        
      case ConversationStep.VALIDATE_WORLD_NEEDS:
        if (isAffirmative(response)) {
          setCurrentStep(ConversationStep.MONETIZATION);
        } else {
          setCurrentStep(ConversationStep.WORLD_NEEDS);
        }
        break;
        
      case ConversationStep.MONETIZATION:
        const monetizationAnalysis = analyzeResponse(response, 'monetization');
        
        if (response.toLowerCase().includes('je ne sais pas') || 
            monetizationAnalysis.confidence < 0.2) {
          // Try to suggest based on previously collected data
          const passionAnalysis = analyzeResponse(passionsSummary, 'passions');
          const talentAnalysis = analyzeResponse(talentsSummary, 'talents');
          const needsAnalysis = analyzeResponse(worldNeedsSummary, 'world_needs');
          
          // Get career suggestions based on existing data
          const suggestions = suggestCareers(
            passionAnalysis.keywords, 
            talentAnalysis.keywords,
            needsAnalysis.keywords,
            []
          );
          
          let promptMessage: string; // Added explicit type
          if (suggestions.length > 0) {
            promptMessage = t(
              'ikigai.monetizationSuggestions',
              "D'après ce que vous m'avez dit sur vos passions, talents et les besoins du monde, vous pourriez peut-être envisager des métiers comme : {{careers}}. Qu'en pensez-vous ? Y a-t-il d'autres possibilités qui vous viennent à l'esprit ?",
              { careers: suggestions.join(', ') }
            );
          } else {
            promptMessage = t(
              'ikigai.monetizationPrompt',
              "Pourriez-vous envisager des métiers qui combinent vos talents en {{talents}} et votre intérêt pour {{needs}} ?",
              { talents: talentsSummary, needs: worldNeedsSummary }
            );
          }
          
          setMessages(prev => [
            ...prev,
            { message: promptMessage, sender: 'ChatGPT' },
          ]);
          chatBotSpeak(promptMessage);
        } else {
          const smartMonetizationSummary = generateSmartSummary(response, 'monetization');
          setMonetizationSummary(smartMonetizationSummary);
          setCurrentStep(ConversationStep.VALIDATE_MONETIZATION);
        }
        break;
        
      case ConversationStep.VALIDATE_MONETIZATION:
        if (isAffirmative(response)) {
          setCurrentStep(ConversationStep.SUMMARY);
        } else {
          setCurrentStep(ConversationStep.MONETIZATION);
        }
        break;
        
      case ConversationStep.SUMMARY:
        setCurrentStep(ConversationStep.EMAIL_REQUEST);
        break;
        
      case ConversationStep.EMAIL_REQUEST:
        if (isAffirmative(response)) {
          setCurrentStep(ConversationStep.CONTACT_ENTRY);
        } else {
          setCurrentStep(ConversationStep.COACHING);
        }
        break;
        
      case ConversationStep.CONTACT_ENTRY:
        // Store the contact information
        setContactInfo(response);
        // Move to coaching step
        setCurrentStep(ConversationStep.COACHING);
        break;
        
      case ConversationStep.COACHING:
        if (isAffirmative(response)) {
          setCurrentStep(ConversationStep.COACHING_SCHEDULE);
        } else if (isUncertain(response)) {
          setCurrentStep(ConversationStep.COACHING_CONFIRMATION);
        } else {
          setCurrentStep(ConversationStep.CONCLUSION);
        }
        break;
        
      case ConversationStep.COACHING_SCHEDULE:
        // Handle scheduling input (name, email, etc.)
        setCurrentStep(ConversationStep.CONCLUSION);
        break;
        
      case ConversationStep.COACHING_CONFIRMATION:
        setCurrentStep(ConversationStep.CONCLUSION);
        break;
        
      case ConversationStep.CONCLUSION:
        // End Ikigai flow - moved to the second useEffect to avoid conflicts
        break;
    }
  }, [
    currentStep, isAffirmative, isNegative, isUncertain, t, chatBotSpeak, 
    analyzeResponse, generateSmartSummary, suggestCareers, passionsSummary, 
    talentsSummary, worldNeedsSummary
  ]);

  const handleSend = useCallback(async (message: string) => {
    if (!message) {
      return;
    }
    
    console.log('handleSend called with message:', message);
    
    const formattedMessage = {
      message,
      sender: 'user',
    };

    const updatedMessages = [...messages, formattedMessage];
    setMessages(updatedMessages);

    // Handle call start if not already calling
    if (!isUserCalling.current) {
      isUserCalling.current = true;
      setIsCalling(isUserCalling.current);
    }
    
    if (isChatbotSpeaking.current) {
      if (isUsingElevenLabs) {
        elevenLabsStopSpeaking(audioRef.current);
      } else {
        window.speechSynthesis?.cancel();
      }
      isChatbotSpeaking.current = false;
      setIsBobSpeaking(false);
    }
    
    // Handle Ikigai flow if active
    if (isRunningIkigaiFlow) {
      processIkigaiResponse(message);
      return;
    }
    
    // Regular chat flow
    const chatGPTAnswer = await getChatGptAnswer(updatedMessages);
    setMessages([
      ...updatedMessages,
      {
        message: chatGPTAnswer,
        sender: 'ChatGPT',
      },
    ]);
    chatBotSpeak(chatGPTAnswer);
  }, [messages, isUsingElevenLabs, isRunningIkigaiFlow, processIkigaiResponse, chatBotSpeak]);

  const userSpeak = useCallback(() => {
    SpeechRecognition.startListening({ language: selectedLanguage });

    if (transcript !== '') {
      resetTranscript();
    }
  }, [selectedLanguage, transcript, resetTranscript]);
  
  const userStopSpeaking = useCallback(() => {
    SpeechRecognition.stopListening();
  }, []);

  const userCall = useCallback(() => {
    isUserCalling.current = true;
    setIsCalling(isUserCalling.current);

    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      setMessages([
        ...messages,
        {
          message: t('bob.browserNotSupportSpeechRecognitionMessage'),
          sender: 'ChatGPT',
        },
      ]);
      isUserCalling.current = false;
      setIsCalling(isUserCalling.current);
      return;
    }

    const firstMessage = t('bob.firstMessage');
    const formattedMessage = {
      message: firstMessage,
      sender: 'assistant',
    };

    const updatedMessages = [...messages, formattedMessage];

    setMessages(updatedMessages);
    chatBotSpeak(firstMessage);
  }, [messages, t, chatBotSpeak]);

  // Start Ikigai conversation flow with enhanced intelligence
  const startIkigaiFlow = useCallback(() => {
    // Reset Ikigai state
    setCurrentStep(ConversationStep.INTRODUCTION);
    setPassionsSummary('');
    setTalentsSummary('');
    setWorldNeedsSummary('');
    setMonetizationSummary('');
    setIkigaiSummary('');
    setContactInfo('');
    setIkigaiUserResponses([]);
    
    // Start call if not already active
    if (!isUserCalling.current) {
      isUserCalling.current = true;
      setIsCalling(isUserCalling.current);
    }
    
    // Set flow as running
    setIsRunningIkigaiFlow(true);
    
    // The rest will be handled by the useEffects
  }, []);

  const resetConversation = useCallback(() => {
    setMessages(defaultMessage);
  }, [defaultMessage]);

  const updateCallHistory = useCallback(() => {
    if (userLocalStorage && messages.length > 1) {
      const storage = userLocalStorage.getItem('callHistory')
        ? JSON.parse(userLocalStorage.getItem('callHistory') as string)
        : [];
      const newCallHistory: CallHistoryType[] = [...storage, { messages, date: new Date() }];
      userLocalStorage?.setItem('callHistory', JSON.stringify(newCallHistory));
    }
  }, [userLocalStorage, messages]);

  const hangUp = useCallback(() => {
    SpeechRecognition.stopListening();
    resetConversation();
    isUserCalling.current = false;
    setIsCalling(isUserCalling.current);
    
    if (isChatbotSpeaking.current) {
      if (isUsingElevenLabs) {
        elevenLabsStopSpeaking(audioRef.current);
      } else {
        window.speechSynthesis?.cancel();
      }
      isChatbotSpeaking.current = false;
      setIsBobSpeaking(false);
    }
    
    SpeechRecognition.abortListening();
    
    // Reset Ikigai flow
    setIsRunningIkigaiFlow(false);
  }, [isUsingElevenLabs, resetConversation]);

  const endCall = useCallback(() => {
    hangUp();
    updateCallHistory();
  }, [hangUp, updateCallHistory]);

  return (
    <CallContext.Provider
      value={{
        userCall,
        userSpeak,
        userStopSpeaking,
        listening,
        isCalling,
        endCall,
        handleSend,
        messages,
        isChatbotSpeaking: isBobSpeaking,
        selectedVoice,
        availableVoices,
        setSelectedVoice,
        // Ikigai specific
        currentStep,
        ikigaiOptions,
        passionsSummary,
        talentsSummary,
        worldNeedsSummary,
        monetizationSummary,
        ikigaiSummary,
        isProcessingIkigai: isProcessingIkigai,
        startIkigaiFlow,
        setMessages,
        resetConversation,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCallManager = () => {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCallManager must be used within a CallManager');
  }
  return context;
};

export default CallManager;