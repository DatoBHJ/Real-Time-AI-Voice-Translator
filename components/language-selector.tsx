import { Button } from './ui/button';
import { Mic, Loader2, Volume2 } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface LanguageSelectorProps {
  // onRecordingStart: () => void;
  // onRecordingStop: () => void;
  onListeningStart: () => void;
  onListeningStop: () => void;
  isRecording: boolean;
  isListening: boolean;
  isProcessing?: boolean;
  transcribedText?: string;
  translatedText?: string;
  showWelcomeMessage?: boolean;
  // currentMode?: string;
  isTTSEnabled: boolean;
}

export function LanguageSelector({
  // onRecordingStart,
  // onRecordingStop,
  onListeningStart,
  onListeningStop,
  isRecording,
  isListening,
  isProcessing = false,
  transcribedText,
  translatedText,
  showWelcomeMessage = false,
  // currentMode = "Quiet Room",
  isTTSEnabled
}: LanguageSelectorProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const previousTranscribedTextRef = useRef<string | undefined>(transcribedText);
  const previousTranslatedTextRef = useRef<string | undefined>(translatedText);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const ttsEnableTimeRef = useRef<number>(0);
  const lastTranslationTimeRef = useRef<number>(0);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isWelcomeMessageFaded, setIsWelcomeMessageFaded] = useState(false);

  const TRANSLATION_WAIT_TIME = 100; 
  const ANIMATION_DURATION = 400;

  // Initialize audio context and silent audio
  useEffect(() => {
    // Create a silent audio element with a very short duration
    const silentAudio = new Audio("data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV");
    silentAudio.setAttribute('playsinline', 'true');
    silentAudio.setAttribute('webkit-playsinline', 'true');
    silentAudioRef.current = silentAudio;

    // Create audio context
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    setAudioContext(ctx);

    // Function to initialize audio
    const initializeAudio = async () => {
      try {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        await silentAudio.play();
        console.log('Audio context initialized successfully');
      } catch (error) {
        console.log('Audio initialization attempt failed:', error);
      }
    };

    // Try to initialize immediately and preload
    initializeAudio();
    silentAudio.load(); // Preload silent audio

    // Also try on user interaction
    const handleInteraction = () => {
      if (ctx.state === 'suspended') {
        initializeAudio().then(() => {
          // Remove listeners only after successful initialization
          if (ctx.state === 'running') {
            document.removeEventListener('touchstart', handleInteraction, true);
            document.removeEventListener('touchend', handleInteraction, true);
            document.removeEventListener('click', handleInteraction, true);
            document.removeEventListener('keydown', handleInteraction, true);
          }
        });
      }
    };

    // Add listeners with capture phase to ensure they run first
    document.addEventListener('touchstart', handleInteraction, true);
    document.addEventListener('touchend', handleInteraction, true);
    document.addEventListener('click', handleInteraction, true);
    document.addEventListener('keydown', handleInteraction, true);

    return () => {
      document.removeEventListener('touchstart', handleInteraction, true);
      document.removeEventListener('touchend', handleInteraction, true);
      document.removeEventListener('click', handleInteraction, true);
      document.removeEventListener('keydown', handleInteraction, true);
      if (silentAudioRef.current) {
        silentAudioRef.current.pause();
        silentAudioRef.current = null;
      }
      if (ctx.state !== 'closed') {
        ctx.close();
      }
    };
  }, []);

  // Update previous text refs when new text arrives
  useEffect(() => {
    if (transcribedText) {
      previousTranscribedTextRef.current = transcribedText;
    }
  }, [transcribedText]);

  // Track when TTS is enabled
  useEffect(() => {
    if (isTTSEnabled) {
      ttsEnableTimeRef.current = Date.now();
    }
  }, [isTTSEnabled]);

  // Track when new translations arrive
  useEffect(() => {
    if (translatedText !== previousTranslatedTextRef.current) {
      lastTranslationTimeRef.current = Date.now();
      previousTranslatedTextRef.current = translatedText;
    }
  }, [translatedText]);

  // Handle TTS playback
  useEffect(() => {
    if (!translatedText || !isTTSEnabled) return;

    // Only play TTS if the translation came after TTS was enabled
    const shouldPlayTTS = lastTranslationTimeRef.current >= ttsEnableTimeRef.current;
    
    if (shouldPlayTTS) {
      // Try to resume audio context and play silent audio first
      if (audioContext?.state === 'suspended') {
        audioContext.resume();
      }
      silentAudioRef.current?.play().catch(() => {});

      // Wait longer to ensure we have the complete translation
      const timeoutId = setTimeout(() => {
        // Double check if we have a complete sentence
        if (
          // translatedText.endsWith('.') || 
          // translatedText.endsWith('!') || 
          // translatedText.endsWith('?') ||
          translatedText === previousTranslatedTextRef.current
        ) {
          playTranslatedText();
        }
      }, TRANSLATION_WAIT_TIME);

      return () => clearTimeout(timeoutId);
    }
  }, [translatedText, isTTSEnabled, audioContext]);

  useEffect(() => {
    const handleScroll = () => {
      // Check if we're on desktop
      const isDesktop = window.matchMedia('(min-width: 768px)').matches;
      
      if (isDesktop) {
        // Find the iPhone frame content container
        const iPhoneContent = document.querySelector('.overflow-y-auto');
        if (iPhoneContent) {
          setIsScrolled(iPhoneContent.scrollTop > 100);
        }
      } else {
        // Mobile behavior remains unchanged
        setIsScrolled(window.scrollY > 100);
      }
    };

    // For mobile
    window.addEventListener('scroll', handleScroll);
    
    // For desktop iPhone frame
    const iPhoneContent = document.querySelector('.overflow-y-auto');
    if (iPhoneContent) {
      iPhoneContent.addEventListener('scroll', handleScroll);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      const iPhoneContent = document.querySelector('.overflow-y-auto');
      if (iPhoneContent) {
        iPhoneContent.removeEventListener('scroll', handleScroll);
      }
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    // Abort any ongoing fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Cleanup audio element
    if (audioRef.current) {
      const audio = audioRef.current;
      
      // Remove all event listeners
      audio.oncanplaythrough = null;
      audio.onended = null;
      audio.onerror = null;
      audio.onloadstart = null;
      audio.onloadeddata = null;
      
      // Stop and cleanup
      audio.pause();
      audio.currentTime = 0;
      audio.src = ''; // Clear source
      audio.load(); // Reset audio element
      audioRef.current = null;
    }

    // Cleanup URL
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setIsPlaying(false);
    setIsLoadingAudio(false);
  };

  const playTranslatedText = async (attempt: number = 0) => {
    if (attempt > 3) return;

    try {
      // 오디오 컨텍스트 상태 확인
      if (audioContext?.state === 'suspended') {
        await audioContext.resume();
      }

      // iOS 호환성을 위한 추가 재생 시도
      const playWithRetry = async (audioElement: HTMLAudioElement, retries: number = 3): Promise<void> => {
        try {
          await audioElement.play();
        } catch (error) {
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
            return playWithRetry(audioElement, retries - 1);
          }
          throw error;
        }
      };

      // Create a new Audio element
      const audio = new Audio();
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      
      // Set up audio event handlers
      audio.oncanplaythrough = () => {
        setIsLoadingAudio(false);
        setIsPlaying(true);
      };
      
      audio.onended = cleanupAudio;
      
      audio.onerror = () => {
        console.error('Audio playback error:', {
          error: audio.error,
          networkState: audio.networkState,
          readyState: audio.readyState,
          currentSrc: audio.currentSrc,
        });
        cleanupAudio();
      };

      // Store audio reference
      audioRef.current = audio;

      // Create abort controller for the fetch request
      abortControllerRef.current = new AbortController();

      // Fetch the audio stream
      const response = await fetch('/api/speech/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: translatedText,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('TTS API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.details || errorData.error || 'Failed to generate speech');
      }

      const audioBlob = await response.blob();
      
      if (!audioBlob.type.startsWith('audio/')) {
        console.error('Invalid audio format:', audioBlob.type);
        throw new Error(`Invalid audio format: ${audioBlob.type}`);
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;
      audio.src = audioUrl;

      // 재생 시도
      await playWithRetry(audio);
    } catch (error) {
      console.error(`Playback failed (attempt ${attempt + 1})`, error);
      setTimeout(() => playTranslatedText(attempt + 1), 500 * (attempt + 1));
    }
  };

  const handleButtonClick = () => {
    if (isListening) {
      onListeningStop();
    } else {
      onListeningStart();
    }
  };

  useEffect(() => {
    if (isListening) {
      setIsWelcomeMessageFaded(true);
    } else {
      setIsWelcomeMessageFaded(false);
    }
  }, [isListening]);

  return (
    <div className={`relative ${showWelcomeMessage ? 'h-[calc(100vh-64px)]' : 'min-h-[60vh]'} bg-white`}>
      {showWelcomeMessage && (
        <div className={`text-center space-y-8 pt-32 transition-opacity duration-200 ${isWelcomeMessageFaded ? 'opacity-30' : 'opacity-100'}`}>
          <div className="space-y-6">
            <Link 
              href="/guide"
              className="text-[20px] tracking-[0.2em] text-black transition-colors duration-200 font-light"
            >
              ¿
            </Link>
          </div>
        </div>
      )}

      {(previousTranscribedTextRef.current || transcribedText) && (
        <div className={`
          text-center space-y-4 px-8
          transition-all duration-${ANIMATION_DURATION} ease-out
          ${isScrolled ? 'opacity-0 -translate-y-2 scale-[0.99]' : 'opacity-100 translate-y-0 scale-100'}
        `}>
          <p className="text-[15px] tracking-[0.15em] text-neutral-500 font-light">
            {previousTranscribedTextRef.current || transcribedText}
          </p>
          {(translatedText) && (
            <div className="flex flex-col items-center space-y-2">
              <p className="text-[20px] tracking-[0.1em] text-neutral-900 font-light">
                {translatedText}
              </p>
              {isTTSEnabled && (
                <button
                  onClick={playTranslatedText}
                  disabled={isPlaying || isLoadingAudio || isRecording || isProcessing}
                  className={`
                    w-8 h-8 flex items-center justify-center
                    transition-all duration-300
                    ${(isPlaying || isLoadingAudio || isRecording || isProcessing) 
                      ? 'opacity-30' 
                      : 'opacity-70 hover:opacity-100'}
                  `}
                  aria-label="Play translation"
                >
                  <Volume2 className="w-4 h-4 text-neutral-900" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className={`
        fixed bottom-24 left-0 right-0 h-36
        flex flex-col items-center justify-center
        z-50 pointer-events-auto
        bg-transparent
        transition-opacity duration-400 ease-out
        md:bottom-48
        ${isScrolled 
          ? 'opacity-0 blur-[1px]' 
          : 'opacity-100 blur-0'
        }
      `}>
        <Button
          variant="outline"
          size="lg"
          className={`
            w-24 h-24 rounded-full border
            ${isRecording ? 'border-neutral-900' : isListening ? 'border-neutral-900' : 'border-neutral-200'} 
            bg-white/80 hover:bg-white
            transition-all ${isScrolled ? 'duration-200' : 'duration-200'} ease-in-out
            ${isProcessing ? 'opacity-30' : ''}
            ${isScrolled ? 'scale-95' : 'scale-100'}
          `}
          onClick={handleButtonClick}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="w-6 h-6 text-neutral-900 animate-spin" />
          ) : (
            <Mic className={`w-6 h-6 ${
              isRecording || isListening ? 'text-neutral-900' : 'text-neutral-400'
            }`} />
          )}
        </Button>

        <div className="mt-6">
          <div className={`text-[12px] tracking-[0.5em] uppercase font-light ${
            isProcessing || isRecording || isListening ? 'text-black' : 'text-neutral-400'
          }`}>
            {isProcessing 
              ? "Processing"
              : isRecording 
                ? "Recording"
                : isListening && showWelcomeMessage
                  ? "Name 2 Langs"
                  : isListening
                    ? "Speaking"
                    : "TAP"}
          </div>
        </div>
      </div>
    </div>
  );
} 