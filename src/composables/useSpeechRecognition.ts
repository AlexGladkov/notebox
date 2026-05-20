import { ref, onUnmounted } from 'vue';

// Типы для Web Speech API
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// Расширяем Window interface для Web Speech API
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function useSpeechRecognition() {
  const isSupported = ref(false);
  const isListening = ref(false);
  const transcript = ref('');
  const interimTranscript = ref('');
  const error = ref<string | null>(null);

  let recognition: SpeechRecognition | null = null;

  const checkSupport = (): boolean => {
    isSupported.value = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    return isSupported.value;
  };

  const initialize = (): boolean => {
    if (!checkSupport()) {
      error.value = 'Web Speech API не поддерживается в этом браузере';
      return false;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        error.value = 'Web Speech API не поддерживается в этом браузере';
        return false;
      }
      recognition = new SpeechRecognition();

      recognition.lang = 'ru-RU';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListening.value = true;
        error.value = null;
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            final += transcriptPart + ' ';
          } else {
            interim += transcriptPart;
          }
        }

        if (final) {
          transcript.value += final;
        }
        interimTranscript.value = interim;
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);

        switch (event.error) {
          case 'no-speech':
            error.value = 'Речь не обнаружена. Попробуйте еще раз.';
            break;
          case 'audio-capture':
            error.value = 'Микрофон не найден или недоступен.';
            break;
          case 'not-allowed':
            error.value = 'Доступ к микрофону запрещен. Разрешите доступ в настройках браузера.';
            break;
          case 'network':
            error.value = 'Ошибка сети. Проверьте подключение к интернету.';
            break;
          default:
            error.value = `Ошибка распознавания речи: ${event.error}`;
        }

        isListening.value = false;
      };

      recognition.onend = () => {
        isListening.value = false;
      };

      return true;
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
      error.value = 'Не удалось инициализировать распознавание речи';
      return false;
    }
  };

  const start = (): boolean => {
    if (!recognition) {
      if (!initialize()) {
        return false;
      }
    }

    if (!recognition) {
      error.value = 'Распознавание речи не инициализировано';
      return false;
    }

    if (isListening.value) {
      return false;
    }

    try {
      transcript.value = '';
      interimTranscript.value = '';
      error.value = null;
      recognition.start();
      return true;
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      error.value = 'Не удалось запустить распознавание речи';
      return false;
    }
  };

  const stop = (): void => {
    if (recognition && isListening.value) {
      try {
        recognition.stop();
      } catch (err) {
        console.error('Failed to stop speech recognition:', err);
      }
    }
  };

  const reset = (): void => {
    transcript.value = '';
    interimTranscript.value = '';
    error.value = null;
  };

  onUnmounted(() => {
    stop();
    if (recognition) {
      recognition = null;
    }
  });

  checkSupport();

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  };
}
