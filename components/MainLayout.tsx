import CallBob from './CallBob';
import LanguageDropdown from './LanguageDropdown';
import { Layout } from 'antd';
import LanguageManager from './LanguageManager';
import { Fragment, useState, useEffect } from 'react';
import { CallHistory } from './CallHistory';
import { GithubLink } from './GithubLink';
import ConversionIdeasModal from './ConversationIdeasModal';
import CallManager from './CallManager';
import { Settings, Moon, Sun, HelpCircle } from 'lucide-react';

const { Header, Content } = Layout;

// Sound effects URLs
const SOUNDS = {
  buttonClick: 'https://www.soundjay.com/buttons/button-click-1.mp3',
  toggleSwitch: 'https://www.soundjay.com/switch/switch-16.mp3',
  callStart: 'https://www.soundjay.com/phone/phone-dial-1.mp3',
  callEnd: 'https://www.soundjay.com/phone/phone-hang-up-1.mp3',
  notification: 'https://www.soundjay.com/button/button-35.mp3',
  helpOpen: 'https://www.soundjay.com/interface/interface-124.mp3',
  helpClose: 'https://www.soundjay.com/interface/interface-126.mp3'
};

export default function MainLayout() {
  const [darkMode, setDarkMode] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [audioCache, setAudioCache] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Initialize audio objects
  useEffect(() => {
    const cache = {};
    Object.entries(SOUNDS).forEach(([key, url]) => {
      cache[key] = new Audio(url);
      cache[key].preload = 'auto';
    });
    setAudioCache(cache);
    
    // Load sound setting from localStorage if available
    const savedSoundSetting = localStorage.getItem('soundEnabled');
    if (savedSoundSetting !== null) {
      setSoundEnabled(savedSoundSetting === 'true');
    }
    
    return () => {
      // Cleanup audio objects
      Object.values(cache).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);
  
  // Function to play sounds
  const playSound = (soundName) => {
    if (soundEnabled && audioCache[soundName]) {
      audioCache[soundName].currentTime = 0;
      audioCache[soundName].play().catch(err => console.log('Audio play error:', err));
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
  };
  
  const toggleSound = () => {
    const newSetting = !soundEnabled;
    setSoundEnabled(newSetting);
    localStorage.setItem('soundEnabled', String(newSetting));
    if (newSetting) {
      playSound('buttonClick');
    }
  };

  // Custom props to pass sound functionality down to child components
  const childProps = {
    playSound,
    soundEnabled
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
          <CallManager customProps={childProps}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <Header className={`
                flex items-center h-16 px-0 justify-between
                transition-colors duration-200
                ${darkMode ? 'bg-gray-900' : 'bg-transparent'}
              `}>
                <div className="flex items-center">
                  <GithubLink 
                    className={`
                      transition-colors 
                      ${darkMode ? 'text-white hover:text-blue-300' : 'text-gray-700 hover:text-blue-500'}
                    `}
                    onClick={() => playSound('buttonClick')}
                  />
                  <h1 className={`ml-4 text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Bob AI Assistant
                  </h1>
                </div>
                
                <div className="flex items-center space-x-2">
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
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
                        <path d="M12.707 2.293a1 1 0 011.414 0L16 4.172l1.879-1.879a1 1 0 111.414 1.414L17.414 5.586l1.879 1.879a1 1 0 01-1.414 1.414L16 7 14.121 8.879a1 1 0 11-1.414-1.414l1.879-1.879-1.879-1.879a1 1 0 010-1.414z" />
                      </svg>
                    )}
                  </button>
                  
                  <ConversionIdeasModal 
                    onClick={() => playSound('buttonClick')}
                  />
                  <CallHistory 
                    onClick={() => playSound('buttonClick')}
                  />
                  <LanguageDropdown 
                    onClick={() => playSound('buttonClick')}
                  />
                  
                  <button 
                    className={`
                      p-2 rounded-full transition-colors
                      ${darkMode 
                        ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                        : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}
                    `}
                    aria-label="Settings"
                    onClick={() => playSound('buttonClick')}
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                </div>
              </Header>
              
              <Content className="py-8">
                <div className={`
                  rounded-2xl shadow-lg overflow-hidden 
                  transition-colors duration-200
                  ${darkMode ? 'bg-gray-800' : 'bg-white'}
                  p-6 sm:p-8
                `}>
                  <CallBob customProps={childProps} />
                </div>
              </Content>
              
              <div className={`
                py-4 text-center text-sm 
                transition-colors duration-200
                ${darkMode ? 'text-gray-500' : 'text-gray-400'}
              `}>
                © 2025 Bob AI Assistant • <a href="#" className="hover:underline" onClick={() => playSound('buttonClick')}>Privacy</a> • <a href="#" className="hover:underline" onClick={() => playSound('buttonClick')}>Terms</a>
              </div>
            </div>
            
            {/* Help overlay */}
            {showHelp && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={toggleHelp}>
                <div 
                  className={`max-w-md w-full rounded-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
                  onClick={e => e.stopPropagation()}
                >
                  <h2 className={`text-xl font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    How to use Bob
                  </h2>
                  <ul className={`space-y-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    <li className="flex">
                      <span className="flex-shrink-0 mr-2">•</span>
                      <span>Click the <strong>phone button</strong> to start a conversation</span>
                    </li>
                    <li className="flex">
                      <span className="flex-shrink-0 mr-2">•</span>
                      <span>Click the <strong>microphone</strong> to speak to Bob</span>
                    </li>
                    <li className="flex">
                      <span className="flex-shrink-0 mr-2">•</span>
                      <span>Use <strong>suggestion cards</strong> for quick conversation starters</span>
                    </li>
                    <li className="flex">
                      <span className="flex-shrink-0 mr-2">•</span>
                      <span>Access <strong>conversation history</strong> from the header</span>
                    </li>
                    <li className="flex">
                      <span className="flex-shrink-0 mr-2">•</span>
                      <span>Toggle the <strong>sound button</strong> to enable/disable sound effects</span>
                    </li>
                  </ul>
                  <button 
                    onClick={(e) => {
                      playSound('buttonClick');
                      toggleHelp();
                      e.stopPropagation();
                    }}
                    className={`
                      mt-6 w-full py-2 rounded-lg font-medium
                      ${darkMode 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'}
                    `}
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}
          </CallManager>
        </LanguageManager>
      </Layout>
    </Fragment>
  );
}