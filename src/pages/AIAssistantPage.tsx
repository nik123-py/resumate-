import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Copy, Check, RefreshCw, Key, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useCV } from '../contexts/CVContext';
import { aiService } from '../services/aiService';
import { APIKeyModal } from '../components/ai/APIKeyModal';
import { globalSessionService } from '../services/globalSessionService';

// -- Storage key for chat persistence --
const CHAT_STORAGE_KEY = 'resumate_ai_chat_history';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
}

// -- Serializable message format for localStorage --
interface StoredMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string; // ISO string
}

const AI_PROMPTS = [
  {
    title: "Improve Summary",
    description: "Enhance your professional summary",
    prompt: "Help me improve my professional summary to make it more compelling and impactful."
  },
  {
    title: "Optimize Experience",
    description: "Better describe your work experience",
    prompt: "Help me rewrite my work experience descriptions to be more achievement-focused and impactful."
  },
  {
    title: "Skills Suggestions",
    description: "Get relevant skills recommendations",
    prompt: "Based on my experience, suggest additional skills I should add to my CV."
  },
  {
    title: "Cover Letter",
    description: "Generate a cover letter",
    prompt: "Help me write a compelling cover letter based on my CV."
  },
  {
    title: "Interview Prep",
    description: "Prepare for interviews",
    prompt: "Help me prepare for interviews based on my CV and experience."
  },
  {
    title: "Career Advice",
    description: "Get personalized career guidance",
    prompt: "Provide career advice based on my current CV and experience."
  }
];

export function AIAssistantPage() {
  const { currentCV } = useCV();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showAPIKeyModal, setShowAPIKeyModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // -- Load chat history from localStorage --
  const loadChatHistory = useCallback((): Message[] => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        const parsed: StoredMessage[] = JSON.parse(stored);
        return parsed.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (err) {
      console.warn('[AIAssistant] Failed to load chat history:', err);
    }
    return [];
  }, []);

  // -- Save chat history to localStorage --
  const saveChatHistory = useCallback((msgs: Message[]) => {
    try {
      const toStore: StoredMessage[] = msgs.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: msg.timestamp.toISOString()
      }));
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore));
    } catch (err) {
      console.warn('[AIAssistant] Failed to save chat history:', err);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // -- Initialize: Load from localStorage or show welcome message --
  useEffect(() => {
    const savedMessages = loadChatHistory();
    if (savedMessages.length > 0) {
      setMessages(savedMessages);
      console.info('[AIAssistant] Restored', savedMessages.length, 'messages from history');
    } else {
      // No saved messages, show welcome
      const welcomeMessage: Message = {
        id: 'welcome',
        content: `Hello! I'm your AI CV assistant. I can help you improve your resume, write cover letters, prepare for interviews, and provide career advice. How can I assist you today?`,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [loadChatHistory]);

  // -- Persist messages whenever they change --
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages, saveChatHistory]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Check if API key is configured
    if (!aiService.hasApiKey()) {
      setShowAPIKeyModal(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await aiService.generateResponse(content, currentCV);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Track AI chat activity for session recovery
      globalSessionService.trackAction('/ai-assistant', 'ai_chat', content.slice(0, 50));
    } catch (error: any) {
      console.error('Error generating AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Sorry, I encountered an error: ${error.message || 'Unknown error'}. Please check your API key configuration or try again later.`,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInputValue(prompt);
    // Focus the input after state update
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const clearChat = () => {
    // Clear localStorage and reset to welcome message
    localStorage.removeItem(CHAT_STORAGE_KEY);
    const welcomeMessage: Message = {
      id: 'welcome',
      content: `Hello! I'm your AI CV assistant. I can help you improve your resume, write cover letters, prepare for interviews, and provide career advice. How can I assist you today?`,
      role: 'assistant',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  return (
    <div className="min-h-screen bg-surface-950 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-4"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">AI CV Assistant</h1>
              <p className="text-slate-400">Get personalized help with your resume and career</p>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <div className="flex gap-2 mb-6">
            <Button
              variant="secondary"
              size="sm"
              onClick={clearChat}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Clear Chat
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAPIKeyModal(true)}
              className="flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              {aiService.hasApiKey() ? 'Update API Key' : 'Set API Key'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                        <div className={`rounded-2xl px-4 py-3 ${
                          message.role === 'user' 
                            ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white' 
                            : 'bg-surface-800 text-slate-100'
                        }`}>
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                        
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => copyToClipboard(message.content, message.id)}
                              className="text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              {copiedMessageId === message.id ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <span className="text-xs text-slate-500">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {message.role === 'user' && (
                        <div className="w-8 h-8 bg-surface-700 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 justify-start"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-600 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-surface-800 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-accent-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-slate-400 text-sm">AI is thinking...</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-6 border-t border-slate-700">
                {!aiService.hasApiKey() && (
                  <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <p className="text-sm text-yellow-400">
                      Please configure your OpenAI API key to use AI features.
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                      placeholder={aiService.hasApiKey() ? "Ask me anything about your CV..." : "Configure API key to start chatting..."}
                      className="w-full px-3 py-2 bg-surface-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading || !aiService.hasApiKey()}
                    />
                  </div>
                  <Button
                    onClick={() => handleSendMessage(inputValue)}
                    disabled={!inputValue.trim() || isLoading || !aiService.hasApiKey()}
                    className="px-4"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Prompts Sidebar */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-accent-500" />
                  <h3 className="text-lg font-semibold text-white">Quick Prompts</h3>
                </div>
                
                <div className="space-y-3">
                  {AI_PROMPTS.map((prompt, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePromptClick(prompt.prompt)}
                      className="w-full text-left p-3 rounded-lg bg-surface-800 hover:bg-surface-700 transition-colors group"
                    >
                      <h4 className="text-sm font-medium text-white group-hover:text-accent-400 transition-colors">
                        {prompt.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {prompt.description}
                      </p>
                    </motion.button>
                  ))}
                </div>

                {/* CV Info */}
                {currentCV && (
                  <div className="mt-6 p-4 bg-surface-800 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-2">Current CV</h4>
                    <p className="text-xs text-slate-400">{currentCV.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {currentCV.sections.length} sections
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      <APIKeyModal
        isOpen={showAPIKeyModal}
        onClose={() => setShowAPIKeyModal(false)}
      />
    </div>
  );
}
