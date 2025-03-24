import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useTranslation } from 'next-i18next';
import { useLanguage } from './LanguageManager';
import { getChatGptAnswer } from './callUtil';
import { CallHistoryType } from './CallHistory';
import { speak as elevenLabsSpeak, stopSpeaking as elevenLabsStopSpeaking } from './elevenLabsService';
import jsPDF from 'jspdf';

// Define the conversation steps for Ikigai
enum ConversationStep {
  INTRODUCTION,
  READY_CHECK,
  PASSIONS,
  VALIDATE_PASSIONS,
  TALENTS,
  VALIDATE_TALENTS,
  WORLD_NEEDS,
  VALIDATE_WORLD_NEEDS,
  MONETIZATION,
  VALIDATE_MONETIZATION,
  SUMMARY,
  EMAIL_REQUEST,
  CONTACT_ENTRY,
  COACHING,
  COACHING_SCHEDULE,
  COACHING_CONFIRMATION,
  CONCLUSION
}

export interface MessageType {
  message: string;
  sender: string;
}

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
  summaryShown: boolean;
  savePDF: () => string | null;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

type CallManagerProps = {
  children: React.ReactNode;
};

const CallManager: React.FC<CallManagerProps> = ({ children }) => {
  const isUserCalling = useRef(false);
  const isChatbotSpeaking = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isInitialRender = useRef(true);

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
  const [summaryShown, setSummaryShown] = useState<boolean>(false);
  
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
  
  // Initialize messages with an empty array first to avoid translation-based re-renders
  const [messages, setMessages] = useState<MessageType[]>([]);
  
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

  // Initialize default message in useEffect rather than directly in render cycle
  useEffect(() => {
    // Only set the default message once, or when translations change
    if (messages.length === 0 || isInitialRender.current) {
      const defaultIntroduction = t('bob.introduction');
      const defaultMessage = [
        {
          message: defaultIntroduction,
          sender: 'ChatGPT',
        },
      ];
      setMessages(defaultMessage);
      isInitialRender.current = false;
    }
  }, [t, messages.length]);

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

  // Define chatBotSpeak first since other functions depend on it
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

  // Helper function to generate the Ikigai summary
  const generateIkigaiSummary = useCallback(() => {
    const summary = `
      ${t('ikigai.summaryPassions', 'Votre passion semble être', { passions: passionsSummary })}.
      ${t('ikigai.summaryTalents', 'Vos talents incluent', { talents: talentsSummary })}.
      ${t('ikigai.summaryWorldNeeds', 'Les besoins du monde qui vous touchent sont', { worldNeeds: worldNeedsSummary })}.
      ${t('ikigai.summaryMonetization', 'Et vous pourriez potentiellement gagner votre vie en', { monetization: monetizationSummary })}.
      
      ${t('ikigai.summaryConclusion', "L'intersection de ces quatre domaines constitue votre Ikigai - votre raison d'être.")}
    `;
    
    setIkigaiSummary(summary);
    return summary;
  }, [t, passionsSummary, talentsSummary, worldNeedsSummary, monetizationSummary]);

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

  // PDF generation function
  const generatePdf = useCallback(() => {
    const doc = new jsPDF();
    
    // Add a title with styling
    doc.setFont("helvetica", "bold");
    doc.setTextColor(23, 37, 84); // Indigo color
    doc.setFontSize(24);
    doc.text('Votre Ikigai', 105, 30, { align: 'center' });
    
    // Add a subtitle
    doc.setFont("helvetica", "italic");
    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99); // Gray color
    doc.text('Votre raison d\'être personnelle', 105, 40, { align: 'center' });
    
    // Add the date
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    doc.setFontSize(10);
    doc.text(`Généré le: ${today.toLocaleDateString(i18n.language, options)}`, 20, 50);
    
    // Add a divider line
    doc.setDrawColor(59, 130, 246); // Blue color
    doc.setLineWidth(0.5);
    doc.line(20, 55, 190, 55);
    
    // Extract the different parts of the Ikigai summary for better formatting
    const summaryLines = ikigaiSummary.split('\n').filter(line => line.trim() !== '');
    
    let yPosition = 65;
    
    // Set standard text style for content
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    
    summaryLines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Check if this is a section header
      if (trimmedLine.includes('passion') || 
          trimmedLine.includes('talents') || 
          trimmedLine.includes('besoins du monde') || 
          trimmedLine.includes('gagner votre vie')) {
        
        // Style section headers
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235); // Blue color for headers
        
        // Add some spacing before headers (except for the first one)
        if (yPosition > 65) {
          yPosition += 5;
        }
      } else {
        // Regular text
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
      }
      
      // Split lines that are too long
      const splitLines = doc.splitTextToSize(trimmedLine, 170);
      
      // Add each line to the PDF
      splitLines.forEach((splitLine: string) => {
        // Check if we need to add a new page
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.text(splitLine, 20, yPosition);
        yPosition += 7; // Line spacing
      });
      
      // Add extra space after paragraphs
      yPosition += 3;
    });
    
    // Add a footer
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate color
    const footerText = t('ikigai.pdfFooter', 'Généré par Cool Ikigai - Votre assistant pour trouver votre raison d\'être');
    doc.text(footerText, 105, 280, { align: 'center' });
    
    // Download the PDF with a name based on date
    const fileName = `ikigai-${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}.pdf`;
    doc.save(fileName);
    
    return fileName;
  }, [ikigaiSummary, t, i18n.language]);

  // Function to save PDF
  const savePDF = useCallback(() => {
    if (ikigaiSummary) {
      const fileName = generatePdf();
      
      // Add a message confirming the download
      const confirmationMessage = t('ikigai.pdfConfirmation', 'Votre résumé Ikigai a été téléchargé au format PDF.');
      setMessages(prev => [
        ...prev,
        {
          message: confirmationMessage,
          sender: 'ChatGPT',
        },
      ]);
      chatBotSpeak(confirmationMessage);
      
      return fileName;
    } else {
      const errorMessage = t('ikigai.noPdfData', 'Désolé, aucun résumé Ikigai n\'est disponible pour téléchargement.');
      setMessages(prev => [
        ...prev,
        {
          message: errorMessage,
          sender: 'ChatGPT',
        },
      ]);
      chatBotSpeak(errorMessage);
      
      return null;
    }
  }, [ikigaiSummary, generatePdf, t, chatBotSpeak]);

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
    // Skip the first render to prevent initializing an immediate call end
    if (!isInitialRender.current && messages.length > 0) {
      endCall();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLanguage]);
  
  // Update localStorage when voice changes
  useEffect(() => {
    if (userLocalStorage) {
      userLocalStorage.setItem('selectedVoice', selectedVoice);
      setIsUsingElevenLabs(selectedVoice !== 'default');
      console.log('Voice changed to:', selectedVoice, 'Using ElevenLabs:', selectedVoice !== 'default');
    }
  }, [selectedVoice, userLocalStorage]);

  // Handle Ikigai conversation flow with guard against infinite updates
  useEffect(() => {
    if (!isRunningIkigaiFlow) return;

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
        
        // Set summaryShown to true when we reach this step
        setSummaryShown(true);
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
          // End ikigai flow
          setIsRunningIkigaiFlow(false);
        }
        break;
        
      case ConversationStep.CONCLUSION:
        message = t('ikigai.conclusionMessage', 
          "Merci pour votre temps ! Je vous souhaite une belle exploration de votre Ikigai. À bientôt !");
        // End ikigai flow
        setIsRunningIkigaiFlow(false);
        break;
    }

    // Update messages and speak only if there's a new message
    if (message) {
      // Check if this message is already the last one to prevent infinite updates
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.message !== message || lastMessage.sender !== 'ChatGPT') {
        const updatedMessages = [...messages, { message, sender: 'ChatGPT' }];
        setMessages(updatedMessages);
        chatBotSpeak(message);
      }
    }

    // Update options
    setIkigaiOptions(options);
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
    messages,
    chatBotSpeak,
    generateIkigaiSummary,
    isAffirmative,
    isUncertain,
    ikigaiUserResponses
  ]);

  // Process Ikigai user responses
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
        if (response.toLowerCase() === 'je ne sais pas' || 
            response.toLowerCase() === 'i don\'t know' ||
            response.toLowerCase() === 'i dont know') {
          // Guide them with a more specific prompt
          const promptMessage = t('ikigai.unknownPassions', "Pensez à un moment où vous étiez totalement absorbé(e) par une activité, sans voir le temps passer. Qu'étiez-vous en train de faire ?");
          setMessages(prev => [
            ...prev,
            {
              message: promptMessage,
              sender: 'ChatGPT',
            },
          ]);
          chatBotSpeak(promptMessage);
          // Stay at the same step
        } else if (response.length < 10) {
          // Response may be too vague or short
          const promptMessage = t('ikigai.morePassions', "Pouvez-vous m'en dire un peu plus ? Pensez aux activités qui vous procurent de la joie, même si elles semblent simples ou ordinaires.");
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
          // Summarize the passions
          setPassionsSummary(response);
          setCurrentStep(ConversationStep.VALIDATE_PASSIONS);
        }
        break;
        
      case ConversationStep.VALIDATE_PASSIONS:
        if (isAffirmative(response)) {
          setCurrentStep(ConversationStep.TALENTS);
        } else {
          // Go back to passions question for clarification
          setCurrentStep(ConversationStep.PASSIONS);
        }
        break;
        
      case ConversationStep.TALENTS:
        // Summarize the talents
        setTalentsSummary(response);
        setCurrentStep(ConversationStep.VALIDATE_TALENTS);
        break;
        
      case ConversationStep.VALIDATE_TALENTS:
        if (isAffirmative(response)) {
          setCurrentStep(ConversationStep.WORLD_NEEDS);
        } else {
          // Go back to talents question for clarification
          setCurrentStep(ConversationStep.TALENTS);
        }
        break;
        
      case ConversationStep.WORLD_NEEDS:
        // Summarize the world needs
        setWorldNeedsSummary(response);
        setCurrentStep(ConversationStep.VALIDATE_WORLD_NEEDS);
        break;
        
      case ConversationStep.VALIDATE_WORLD_NEEDS:
        if (isAffirmative(response)) {
          setCurrentStep(ConversationStep.MONETIZATION);
        } else {
          // Go back to world needs question for clarification
          setCurrentStep(ConversationStep.WORLD_NEEDS);
        }
        break;
        
      case ConversationStep.MONETIZATION:
        // Summarize the monetization possibilities
        setMonetizationSummary(response);
        setCurrentStep(ConversationStep.VALIDATE_MONETIZATION);
        break;
        
      case ConversationStep.VALIDATE_MONETIZATION:
        if (isAffirmative(response)) {
          setCurrentStep(ConversationStep.SUMMARY);
        } else {
          // Go back to monetization question for clarification
          setCurrentStep(ConversationStep.MONETIZATION);
        }
        break;
        
      case ConversationStep.SUMMARY:
        if (response.toLowerCase().includes('pdf')) {
          // User mentioned PDF, trigger the download
          savePDF();
          setCurrentStep(ConversationStep.EMAIL_REQUEST);
        } else if (isAffirmative(response)) {
          setCurrentStep(ConversationStep.EMAIL_REQUEST);
        } else {
          setCurrentStep(ConversationStep.COACHING);
        }
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
    }
  }, [currentStep, isAffirmative, isNegative, isUncertain, t, chatBotSpeak, savePDF]);

  const resetConversation = useCallback(() => {
    // Use the translation function inside to avoid dependencies
    const defaultIntroduction = t('bob.introduction');
    const defaultMessage = [
      {
        message: defaultIntroduction,
        sender: 'ChatGPT',
      },
    ];
    setMessages(defaultMessage);
    setSummaryShown(false);
  }, [t]);

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
    setMessages(prev => [
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
      setMessages(prev => [
        ...prev,
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

    setMessages(prev => [...prev, formattedMessage]);
    chatBotSpeak(firstMessage);
  }, [t, chatBotSpeak]);

  // Start Ikigai conversation flow
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
    setSummaryShown(false);
    
    // Start call if not already active
    if (!isUserCalling.current) {
      isUserCalling.current = true;
      setIsCalling(isUserCalling.current);
    }
    
    // Set flow as running
    setIsRunningIkigaiFlow(true);
    
    // Use translated introduction message
    const introMessage = t('ikigai.introMessage', 
      "Bienvenue. Je suis Cool Ikigai. Je peux vous aider à améliorer votre rapport au travail et à vous aligner sur vos aspirations avec succès. Tout ceci grâce à l'Ikigai, un concept transformateur, originaire de l'île d'Okinawa, au Japon. Tout d'abord sachez que notre politique de confidentialité est très stricte. Nous détruisons toute donnée personnelle collectée au bout de 15 jours. Nous ne pratiquons aucun commerce autour de la data.");
    
    // Add message without triggering another update
    setMessages(prev => [...prev, { message: introMessage, sender: 'ChatGPT' }]);
    
    // Wait briefly before starting to speak to avoid state update conflicts
    setTimeout(() => {
      chatBotSpeak(introMessage);
      
      // Set the next step after intro is spoken
      setTimeout(() => {
        setCurrentStep(ConversationStep.READY_CHECK);
      }, 1000);
    }, 100);
  }, [t, chatBotSpeak]);

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
    setSummaryShown(false);
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
        summaryShown,
        savePDF,
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