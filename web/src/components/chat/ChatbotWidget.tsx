import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Card, Typography, Spin, Avatar } from 'antd';
import {
    MessageOutlined,
    CloseOutlined,
    SendOutlined,
    RobotOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { useChat } from '../../hooks/use-chat';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const { Text } = Typography;

export const ChatbotWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { messages, isLoading, sendMessage } = useChat();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, isOpen]);

    const handleSend = () => {
        if (inputValue.trim()) {
            sendMessage(inputValue);
            setInputValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    const renderMarkdown = (content: string) => {
        try {
            // Parse markdown and sanitize HTML to prevent XSS
            // Use marked.parse for marked v12+ compatibility
            const html = marked.parse(content, { async: false }) as string;
            return { __html: DOMPurify.sanitize(html) };
        } catch (err) {
            console.error('Markdown render error:', err);
            return { __html: content }; // Fallback to raw text if parsing fails
        }
    };

    return (
        <>
            <style>{`
        .chatbot-message-content {
          max-width: 100%;
        }
        .chatbot-message-content pre {
          max-width: 100%;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
          background-color: rgba(0, 0, 0, 0.05);
          padding: 8px;
          border-radius: 4px;
        }
        .chatbot-message-content p {
          margin-bottom: 8px;
        }
        .chatbot-message-content p:last-child {
          margin-bottom: 0;
        }
        .chatbot-message-content table {
          max-width: 100%;
          overflow-x: auto;
          display: block;
        }
        .chatbot-message-content img {
          max-width: 100%;
          height: auto;
        }
      `}</style>

            {/* Floating Chat Button */}
            {!isOpen && (
                <Button
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={<MessageOutlined style={{ fontSize: 24 }} />}
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        width: 64,
                        height: 64,
                        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onClick={() => setIsOpen(true)}
                />
            )}

            {/* Chat Window */}
            {isOpen && (
                <Card
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                                style={{
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <RobotOutlined style={{ fontSize: 18 }} />
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 16 }}>FieldForce Assistant</span>
                        </div>
                    }
                    extra={
                        <Button
                            type="text"
                            icon={<CloseOutlined />}
                            onClick={() => setIsOpen(false)}
                        />
                    }
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        width: 380,
                        height: 600,
                        maxHeight: '80vh',
                        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 1000,
                        borderRadius: 16,
                        overflow: 'hidden',
                    }}
                    styles={{
                        header: { padding: '16px 20px', borderBottom: '1px solid #f1f5f9' },
                        body: {
                            padding: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            overflow: 'hidden'
                        }
                    }}
                >
                    {/* Messages Area */}
                    <div
                        data-lenis-prevent
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            backgroundColor: '#f8fafc',
                        }}
                    >
                        {/* Greeting Message */}
                        {messages.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748b' }}>
                                <RobotOutlined style={{ fontSize: 48, color: '#94a3b8', marginBottom: 12 }} />
                                <p>Hello! I'm your FieldForce Pro assistant.</p>
                                <p>Ask me anything about our platform's workflows, pricing, features, or how to navigate the software.</p>
                            </div>
                        )}

                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                style={{
                                    display: 'flex',
                                    gap: '12px',
                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                    maxWidth: '85%',
                                }}
                            >
                                <Avatar
                                    icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                                    style={{
                                        backgroundColor: msg.role === 'user' ? '#1e293b' : '#2563eb',
                                        flexShrink: 0,
                                    }}
                                />
                                <div
                                    className="chatbot-message-content"
                                    style={{
                                        backgroundColor: msg.role === 'user' ? '#1e293b' : '#ffffff',
                                        color: msg.role === 'user' ? '#ffffff' : '#334155',
                                        padding: '12px 16px',
                                        borderRadius: '16px',
                                        borderTopRightRadius: msg.role === 'user' ? 4 : 16,
                                        borderTopLeftRadius: msg.role === 'assistant' ? 4 : 16,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                        fontSize: 14,
                                        lineHeight: 1.5,
                                        overflowX: 'auto',
                                        wordBreak: 'break-word',
                                        minWidth: 0,
                                    }}
                                    dangerouslySetInnerHTML={renderMarkdown(msg.content)}
                                />
                            </div>
                        ))}

                        {isLoading && (
                            <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
                                <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#2563eb' }} />
                                <div
                                    style={{
                                        backgroundColor: '#ffffff',
                                        padding: '12px 16px',
                                        borderRadius: '16px',
                                        borderTopLeftRadius: 4,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    }}
                                >
                                    <Spin size="small" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div
                        style={{
                            padding: '16px',
                            borderTop: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                        }}
                    >
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me anything..."
                            style={{ borderRadius: 20 }}
                            suffix={
                                <Button
                                    type="text"
                                    icon={<SendOutlined />}
                                    onClick={handleSend}
                                    disabled={!inputValue.trim() || isLoading}
                                    style={{ color: inputValue.trim() ? '#2563eb' : '#cbd5e1' }}
                                />
                            }
                        />
                        <div style={{ textAlign: 'center', marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                Powered by Google Gemini
                            </Text>
                        </div>
                    </div>
                </Card>
            )}
        </>
    );
};