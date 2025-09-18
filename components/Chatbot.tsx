
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Transaction } from '../types';
import { sendMessageToBot, startChat } from '../services/geminiService';
import { ChatIcon, CloseIcon, SendIcon, UserIcon, BotIcon, Spinner } from './Icons';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

const Chatbot: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startChat();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = useCallback(async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const botResponse = await sendMessageToBot(input, transactions);
      const botMessage: Message = { sender: 'bot', text: botResponse };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = { sender: 'bot', text: "Sorry, I'm having trouble connecting." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, transactions]);

  const toggleChat = () => setIsOpen(prev => !prev);

  if (!isOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 z-50"
        aria-label="Open chat"
      >
        <ChatIcon />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white dark:bg-gray-800 shadow-2xl rounded-lg flex flex-col z-50 border border-gray-200 dark:border-gray-700">
      <header className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 rounded-t-lg">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Fin-AI Assistant</h3>
        <button onClick={toggleChat} className="text-gray-500 hover:text-gray-800 dark:hover:text-white" aria-label="Close chat">
          <CloseIcon />
        </button>
      </header>

      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        <div className="flex items-start gap-3">
            <BotIcon />
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 max-w-xs text-sm">
                Hello! How can I help you with your finances today?
            </div>
        </div>
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
            {msg.sender === 'bot' && <BotIcon />}
            <div className={`${msg.sender === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-700'} rounded-lg p-3 max-w-xs text-sm`}>
              {msg.text}
            </div>
            {msg.sender === 'user' && <UserIcon />}
          </div>
        ))}
        {isLoading && (
            <div className="flex items-start gap-3">
                <BotIcon />
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 max-w-xs text-sm flex justify-center items-center">
                    <Spinner/>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-lg">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your finances..."
            className="flex-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={isLoading}
          />
          <button onClick={handleSend} disabled={isLoading} className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
