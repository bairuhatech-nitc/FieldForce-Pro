import { useState } from 'react';
import api from '../api/axios-instance';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Send the current history excluding the new message
      // Note: we might want to slice to last N messages if it gets too long
      const history = messages; 
      
      const response = await api.post('/ai/chat', {
        message: content,
        history,
      });

      if (response.data && response.data.data) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.data.data.reply,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I am sorry, but I am currently experiencing technical difficulties connecting to my brain.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
  };
};
