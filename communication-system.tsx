import React, { useState } from 'react';
import { MessageSquare, Phone, Video, Mic, Send, Image, Paperclip } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const CommunicationSystem = () => {
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'visitor',
      content: "Hello, I'm the Amazon delivery driver.",
      timestamp: new Date(),
      type: 'text'
    },
    {
      id: 2,
      sender: 'owner',
      content: "Hello, I'll open the door in a moment.",
      timestamp: new Date(),
      type: 'text'
    }
  ]);

  const [quickResponses] = useState([
    "I'll open the door right away",
    "Please wait a moment",
    "Please leave the package at the door",
    "I'm not available at the moment"
  ]);

  return (
    <div className="h-screen flex">
      {/* Conversation List */}
      <div className="w-80 border-r bg-white">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Conversations</h2>
        </div>
        
        <div className="overflow-y-auto">
          {['Amazon Delivery', 'Visitor', 'Postal Service'].map((name, index) => (
            <div 
              key={index}
              className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                activeChat === index ? 'bg-blue-50' : ''
              }`}
              onClick={() => setActiveChat(index)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <h3 className="font-medium">{name}</h3>
                  <p className="text-sm text-gray-500">Last message...</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="font-semibold">Amazon Delivery</h2>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                Online
              </span>
            </div>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <Video className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {messages.map(message => (
            <div
              key={message.id}
              className={`mb-4 flex ${
                message.sender === 'owner' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className={`max-w-[70%] ${
                message.sender === 'owner' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white'
              } rounded-lg p-3 shadow`}>
                {message.content}
                <div className={`text-xs mt-1 ${
                  message.sender === 'owner' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Responses */}
        <div className="p-2 bg-white border-t">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {quickResponses.map((response, index) => (
              <button
                key={index}
                className="px-3 py-1 bg-gray-100 rounded-full text-sm whitespace-nowrap hover:bg-gray-200"
              >
                {response}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t">
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Image className="w-5 h-5 text-gray-500" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Paperclip className="w-5 h-5 text-gray-500" />
            </button>
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationSystem;
