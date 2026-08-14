'use client'

import React, { useState, useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        setSupported(false)
      }
    }
  }, [])

  const toggleListening = () => {
    if (!supported || disabled) return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    if (isListening) {
      setIsListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'fr-FR'
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onstart = () => setIsListening(true)
      recognition.onend = () => setIsListening(false)
      recognition.onerror = () => setIsListening(false)

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript
        if (transcript) {
          onTranscript(transcript)
        }
      }

      recognition.start()
    } catch (e) {
      console.error('Erreur reconnaissance vocale:', e)
      setIsListening(false)
    }
  }

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      className={`p-2.5 rounded-xl border transition-all ${
        isListening
          ? 'bg-red-500 text-white border-red-400 animate-pulse shadow-lg'
          : 'bg-[#2a2421] text-amber-400 border-gray-800 hover:bg-[#342d29]'
      }`}
      title={isListening ? 'Écoute en cours...' : 'Dictée vocale (WebSpeech)'}
    >
      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  )
}
