import CallBob from './CallBob';
import LanguageDropdown from './LanguageDropdown';
import { Layout } from 'antd';
import LanguageManager from './LanguageManager';
import { Fragment, useState, useEffect, createContext, useContext } from 'react';
import { CallHistory } from './CallHistory';
import ConversionIdeasModal from './ConversationIdeasModal';
import CallManager from './CallManager';
import { Moon, Sun, HelpCircle } from 'lucide-react';
import VoiceSettingsModal from './VoiceSettingsModal';

const { Header, Content } = Layout;

// Sound effects URLs
const SOUNDS = {
  buttonClick: 'https://www.soundjay.com/buttons/button-click-1.mp3',
  toggleSwitch: 'https://www.soundjay.com/switch/switch-16.mp3',
  callStart: 'https://www.soundjay.com/phone/phone-dial-1.mp3',
  callEnd: 'https://www.soundjay.com/phone/phone-hang-up-1.mp3',
  notification: 'https://www.soundjay.com/button/button-35.mp3',
  helpOpen: 'https://www.soundjay.com/interface/interface-124.mp3',
  helpClose: 'https://www.soundjay.com/interface/interface-126.mp3',
  backgroundMusic: '/sounds/background-music.mp3' // Local path in public folder
};

// Define an interface for the audio cache
interface AudioCache {
  [key: string]: HTMLAudioElement;
}

// Create a context for sound functionality
interface SoundContextType {
  playSound: (soundName: string) => void;
  soundEnabled: boolean;
  setBackgroundVolume: (volume: number) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const useSoundEffects = () => {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSoundEffects must be used within a SoundProvider');
  }
  return context;
};

export default function MainLayout() {
  const [darkMode, setDarkMode] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showConversationIdeas, setShowConversationIdeas] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [audioCache, setAudioCache] = useState<AudioCache>({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [backgroundMusic, setBackgroundMusic] = useState<HTMLAudioElement | null>(null);
  const [musicStarted, setMusicStarted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Mobile viewport enhancement
  useEffect(() => {
    // Setup viewport meta tag with proper typing
    let viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta') as HTMLMetaElement;
      viewportMeta.setAttribute('name', 'viewport');
      document.head.appendChild(viewportMeta);
    }
    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    
    // Fix for mobile viewport height issues
    const setVh = () => {
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    // Set initial value and listen for resize events
    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);
    
    return () => {
      // Cleanup
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);
  
  // Initialize audio objects
  useEffect(() => {
    const cache: AudioCache = {};
    
    // Initialize regular sound effects
    Object.entries(SOUNDS).forEach(([key, url]) => {
      if (key !== 'backgroundMusic') {
        cache[key] = new Audio(url);
        cache[key].preload = 'auto';
      }
    });
    setAudioCache(cache);
    
    // Initialize background music separately
    const music = new Audio(SOUNDS.backgroundMusic);
    music.loop = true;
    music.volume = 0.05; // Very low volume by default
    music.preload = 'auto';
    setBackgroundMusic(music);
    
    // Add mousedown and touchstart events as user interactions for autoplay
    const handleUserInteraction = () => {
      if (music && soundEnabled && !musicStarted) {
        music.play()
          .then(() => {
            setMusicStarted(true);
            console.log('Background music started on user interaction');
          })
          .catch(err => {
            console.log('Background music play error:', err);
            // Try again on next interaction
          });
      }
    };
    
    // Add the event listeners
    document.addEventListener('mousemove', handleUserInteraction, { once: true });
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });
    
    // Load sound setting from localStorage if available
    const savedSoundSetting = localStorage.getItem('soundEnabled');
    if (savedSoundSetting !== null) {
      const enabled = savedSoundSetting === 'true';
      setSoundEnabled(enabled);
    }
    
    return () => {
      // Cleanup audio objects
      Object.values(cache).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      
      // Cleanup background music
      if (music) {
        music.pause();
        music.src = '';
      }
      
      // Remove event listeners
      document.removeEventListener('mousemove', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [soundEnabled, musicStarted]);
  
  // Effect to handle sound enabled/disabled state changes
  useEffect(() => {
    if (backgroundMusic) {
      if (soundEnabled && musicStarted) {
        backgroundMusic.play().catch(err => console.log('Background music resume error:', err));
      } else {
        backgroundMusic.pause();
      }
    }
  }, [soundEnabled, musicStarted, backgroundMusic]);
  
  // Function to play sounds
  const playSound = (soundName: string) => {
    if (soundEnabled && audioCache[soundName]) {
      audioCache[soundName].currentTime = 0;
      audioCache[soundName].play().catch(err => console.log('Audio play error:', err));
    }
  };
  
  // Function to control background music volume
  const setBackgroundVolume = (volume: number) => {
    if (backgroundMusic) {
      backgroundMusic.volume = Math.max(0, Math.min(1, volume));
    }
  };
  
  const toggleDarkMode = () => {
    playSound('toggleSwitch');
    setDarkMode(!darkMode);
    // Apply dark mode class to document
    document.documentElement.classList.toggle('dark');
  };
  
  const toggleHelp = () => {
    playSound(showHelp ? 'helpClose' : 'helpOpen');
    setShowHelp(!showHelp);
    setIsMobileMenuOpen(false);
  };
  
  const toggleSound = () => {
    const newSetting = !soundEnabled;
    setSoundEnabled(newSetting);
    localStorage.setItem('soundEnabled', String(newSetting));
    
    if (newSetting) {
      playSound('buttonClick');
      // Resume background music
      if (backgroundMusic && musicStarted) {
        backgroundMusic.play().catch(err => console.log('Background music resume error:', err));
      }
    } else {
      // Pause background music
      if (backgroundMusic) {
        backgroundMusic.pause();
      }
    }
  };

  const toggleConversationIdeas = () => {
    playSound('buttonClick');
    setShowConversationIdeas(!showConversationIdeas);
    setIsMobileMenuOpen(false);
  };

  const toggleCallHistory = () => {
    playSound('buttonClick');
    setShowCallHistory(!showCallHistory);
    setIsMobileMenuOpen(false);
  };
  
  const toggleMobileMenu = () => {
    playSound('buttonClick');
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Handle GitHub link click
  const handleGitHubClick = () => {
    playSound('buttonClick');
  };
  
  // Toggle music
  const toggleMusic = () => {
    playSound('buttonClick');
    if (backgroundMusic) {
      if (backgroundMusic.paused && soundEnabled) {
        backgroundMusic.play().then(() => {
          setMusicStarted(true);
        }).catch(err => console.log('Background music play error:', err));
      } else {
        backgroundMusic.pause();
      }
    }
  };

  // Sound context value
  const soundContextValue = {
    playSound,
    soundEnabled,
    setBackgroundVolume
  };

  return (
    <Fragment>
      <Layout className={`
        min-h-screen 
        transition-colors duration-200
        ${darkMode 
          ? 'bg-gray-900 text-white' 
          : 'bg-gradient-to-br from-blue-50 to-white text-gray-900'}
      `}>
        <LanguageManager>
          <SoundContext.Provider value={soundContextValue}>
            <CallManager>
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <Header className={`
                  flex items-center h-16 px-0 justify-between
                  transition-colors duration-200
                  ${darkMode ? 'bg-gray-900' : 'bg-transparent'}
                `}>
                  <div className="flex items-center">
                    {/* GitHub link - hidden on smallest screens */}
                    <a 
                      href="https://github.com/yourusername/voice-flow" 
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleGitHubClick}
                      className={`
                        hidden sm:block transition-colors p-2 rounded-full
                        ${darkMode ? 'text-white hover:text-blue-300' : 'text-gray-700 hover:text-blue-500'}
                      `}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                      </svg>
                    </a>
                    
                    <h1 className={`ml-0 sm:ml-4 text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      AI Assistant
                    </h1>
                  </div>
                  
                  {/* Mobile menu button */}
                  <div className="md:hidden">
                    <button
                      onClick={toggleMobileMenu}
                      className={`
                        p-2 rounded-full transition-colors
                        ${darkMode 
                          ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                          : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}
                      `}
                      aria-label="Menu"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Desktop controls - hidden on mobile */}
                  <div className="hidden md:flex items-center space-x-2">
                    {/* Music button */}
                    <button
                      onClick={toggleMusic}
                      className={`
                        p-2 rounded-full transition-colors
                        ${darkMode 
                          ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                          : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}
                        ${(!soundEnabled || (backgroundMusic && !backgroundMusic.paused)) ? 'opacity-50' : ''}
                      `}
                      aria-label="Toggle music"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                      </svg>
                    </button>
                    
                    <button 
                      onClick={toggleHelp}
                      className={`
                        p-2 rounded-full transition-colors
                        ${darkMode 
                          ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                          : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}
                      `}
                      aria-label="Help"
                    >
                      <HelpCircle className="h-5 w-5" />
                    </button>
                    
                    <button 
                      onClick={toggleDarkMode}
                      className={`
                        p-2 rounded-full transition-colors
                        ${darkMode 
                          ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                          : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}
                      `}
                      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                    >
                      {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>
                    
                    <button 
                      onClick={toggleSound}
                      className={`
                        p-2 rounded-full transition-colors
                        ${darkMode 
                          ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                          : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}
                        ${!soundEnabled ? 'opacity-50' : ''}
                      `}
                      aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
                    >
                      {soundEnabled ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071a1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243a1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
                          <path d="M12.707 2.293a1 1 0 011.414 0L16 4.172l1.879-1.879a1 1 0 111.414 1.414L17.414 5.586l1.879 1.879a1 1 0 01-1.414 1.414L16 7 14.121 8.879a1 1 0 11-1.414-1.414l1.879-1.879-1.879-1.879a1 1 0 010-1.414z" />
                        </svg>
                      )}
                    </button>
                    
                    {/* Conversation Ideas button */}
                    <button
                      onClick={toggleConversationIdeas}
                      className={`
                        p-2 rounded-full transition-colors
                        ${darkMode 
                          ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                          : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}
                      `}
                      aria-label="Conversation Ideas"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                        <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                      </svg>
                    </button>
                    
                    {/* Call History button */}
                    <button
                      onClick={toggleCallHistory}
                      className={`
                        p-2 rounded-full transition-colors
                        ${darkMode 
                          ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                          : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}
                      `}
                      aria-label="Call History"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                    </button>
                    
                    {/* Language Dropdown */}
                    <LanguageDropdown />
                    
                    <VoiceSettingsModal darkMode={darkMode} />
                  </div>
                </Header>
                
                {/* Mobile menu - only shows when toggled */}
                {isMobileMenuOpen && (
                  <div className="md:hidden bg-white dark:bg-gray-800 shadow-lg rounded-lg mt-2 p-4 transition-all duration-200 transform">
                    <div className="grid grid-cols-4 gap-3">
                      {/* Music button */}
                      <button
                        onClick={() => {
                          toggleMusic();
                          setIsMobileMenuOpen(false);
                        }}
                        className={`
                          flex flex-col items-center justify-center p-3 rounded-lg transition-colors
                          ${darkMode 
                            ? 'bg-gray-700 text-gray-300' 
                            : 'bg-gray-100 text-gray-600'}
                          ${(!soundEnabled || (backgroundMusic && !backgroundMusic.paused)) ? 'opacity-50' : ''}
                          active:opacity-70
                        `}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                        </svg>
                        <span className="text-xs">Music</span>
                      </button>
                      
                      {/* Help button */}
                      <button 
                        onClick={() => {
                          toggleHelp();
                          setIsMobileMenuOpen(false);
                        }}
                        className={`
                          flex flex-col items-center justify-center p-3 rounded-lg transition-colors
                          ${darkMode 
                            ? 'bg-gray-700 text-gray-300' 
                            : 'bg-gray-100 text-gray-600'}
                          active:opacity-70
                        `}
                      >
                        <HelpCircle className="h-6 w-6 mb-1" />
                        <span className="text-xs">Help</span>
                      </button>
                      
                      {/* Dark Mode button */}
                      <button 
                        onClick={() => {
                          toggleDarkMode();
                          setIsMobileMenuOpen(false);
                        }}
                        className={`
                          flex flex-col items-center justify-center p-3 rounded-lg transition-colors
                          ${darkMode 
                            ? 'bg-gray-700 text-gray-300' 
                            : 'bg-gray-100 text-gray-600'}
                          active:opacity-70
                        `}
                      >
                        {darkMode ? 
                          <>
                            <Sun className="h-6 w-6 mb-1" />
                            <span className="text-xs">Light</span>
                          </> : 
                          <>
                            <Moon className="h-6 w-6 mb-1" />
                            <span className="text-xs">Dark</span>
                          </>
                        }
                      </button>
                      
                      {/* Sound button */}
                      <button 
                        onClick={() => {
                          toggleSound();
                          setIsMobileMenuOpen(false);
                        }}
                        className={`
                          flex flex-col items-center justify-center p-3 rounded-lg transition-colors
                          ${darkMode 
                            ? 'bg-gray-700 text-gray-300' 
                            : 'bg-gray-100 text-gray-600'}
                          ${!soundEnabled ? 'opacity-50' : ''}
                          active:opacity-70
                        `}
                      >
                        {soundEnabled ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
                              <path d="M14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071a1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414z" />
                            </svg>
                            <span className="text-xs">On</span>
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
                              <path d="M12.707 2.293a1 1 0 011.414 0L16 4.172l1.879-1.879a1 1 0 111.414 1.414L17.414 5.586l1.879 1.879a1 1 0 01-1.414 1.414L16 7 14.121 8.879a1 1 0 11-1.414-1.414l1.879-1.879-1.879-1.879a1 1 0 010-1.414z" />
                            </svg>
                            <span className="text-xs">Off</span>
                          </>
                        )}
                      </button>
                      
                      {/* Conversation Ideas button */}
                      <button
                        onClick={() => {
                          toggleConversationIdeas();
                          setIsMobileMenuOpen(false);
                        }}
                        className={`
                          flex flex-col items-center justify-center p-3 rounded-lg transition-colors
                          ${darkMode 
                            ? 'bg-gray-700 text-gray-300' 
                            : 'bg-gray-100 text-gray-600'}
                          active:opacity-70
                        `}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                          <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                        </svg>
                        <span className="text-xs">Ideas</span>
                      </button>
                      
                      {/* Call History button */}
                      <button
                        onClick={() => {
                          toggleCallHistory();
                          setIsMobileMenuOpen(false);
                        }}
                        className={`
                          flex flex-col items-center justify-center p-3 rounded-lg transition-colors
                          ${darkMode 
                            ? 'bg-gray-700 text-gray-300' 
                            : 'bg-gray-100 text-gray-600'}
                          active:opacity-70
                        `}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        <span className="text-xs">History</span>
                      </button>
                      
                      {/* Language dropdown - in a container for styling */}
                      <div className={`
                        flex flex-col items-center justify-center p-3 rounded-lg transition-colors
                        ${darkMode 
                          ? 'bg-gray-700 text-gray-300' 
                          : 'bg-gray-100 text-gray-600'}
                      `}>
                        <div className="mb-1">
                          <LanguageDropdown />
                        </div>
                        <span className="text-xs">Language</span>
                      </div>
                      
                      {/* Voice Settings - in a container for styling */}
                      <div className={`
                        flex flex-col items-center justify-center p-3 rounded-lg transition-colors
                        ${darkMode 
                          ? 'bg-gray-700 text-gray-300' 
                          : 'bg-gray-100 text-gray-600'}
                      `}>
                        <div className="mb-1">
                          <VoiceSettingsModal darkMode={darkMode} />
                        </div>
                        <span className="text-xs">Voice</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <Content className="py-4 sm:py-8">
                  <div className={`
                    rounded-xl sm:rounded-2xl shadow-lg overflow-hidden 
                    transition-colors duration-200
                    ${darkMode ? 'bg-gray-800' : 'bg-white'}
                    p-4 sm:p-6 md:p-8
                  `}>
                    <CallBob />
                  </div>
                </Content>
                
                <div className={`
                  py-3 text-center text-xs sm:text-sm
                  transition-colors duration-200
                  ${darkMode ? 'text-gray-500' : 'text-gray-400'}
                  space-x-2
                `}>
                  <span>© 2025 VoiceFlow AI Assistant</span>
                  <span>•</span>
                  <a href="#" className="hover:underline" onClick={() => playSound('buttonClick')}>Privacy</a>
                  <span>•</span>
                  <a href="#" className="hover:underline" onClick={() => playSound('buttonClick')}>Terms</a>
                </div>
              </div>
              
              {/* Help overlay */}
              {showHelp && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={toggleHelp}>
                  <div 
                    className={`max-w-md w-full rounded-xl p-4 sm:p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h2 className={`text-lg sm:text-xl font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        How to use VoiceFlow
                      </h2>
                      <button 
                        onClick={(e) => {
                          playSound('buttonClick');
                          toggleHelp();
                          e.stopPropagation();
                        }}
                        className={`
                          p-2 rounded-full
                          ${darkMode 
                            ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                            : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}
                        `}
                        aria-label="Close"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    <div className={`overflow-y-auto max-h-[60vh] ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <ul className="space-y-3">
                        <li className="flex">
                          <span className="flex-shrink-0 mr-2">•</span>
                          <span>Tap the <strong>phone button</strong> to start a conversation</span>
                        </li>
                        <li className="flex">
                          <span className="flex-shrink-0 mr-2">•</span>
                          <span>Tap the <strong>microphone</strong> to speak to VoiceFlow</span>
                        </li>
                        <li className="flex">
                          <span className="flex-shrink-0 mr-2">•</span>
                          <span>Use <strong>suggestion cards</strong> for quick conversation starters</span>
                        </li>
                        <li className="flex">
                          <span className="flex-shrink-0 mr-2">•</span>
                          <span>Access <strong>menu options</strong> from the hamburger menu on mobile</span>
                        </li>
                        <li className="flex">
                          <span className="flex-shrink-0 mr-2">•</span>
                          <span>Toggle the <strong>sound icon</strong> to enable/disable sound effects</span>
                        </li>
                        <li className="flex">
                          <span className="flex-shrink-0 mr-2">•</span>
                          <span>Toggle the <strong>music icon</strong> to play/pause background music</span>
                        </li>
                      </ul>
                    </div>
                    <button 
                      onClick={(e) => {
                        playSound('buttonClick');
                        toggleHelp();
                        e.stopPropagation();
                      }}
                      className={`
                        mt-6 w-full py-3 rounded-lg font-medium text-white
                        ${darkMode 
                          ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800' 
                          : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'}
                        transition-colors duration-150
                      `}
                    >
                      Got it
                    </button>
                  </div>
                </div>
              )}
              
              {/* Render the actual components when toggled */}
              {showConversationIdeas && <ConversionIdeasModal />}
              {showCallHistory && <CallHistory />}
            </CallManager>
          </SoundContext.Provider>
        </LanguageManager>
      </Layout>
    </Fragment>
  );
}