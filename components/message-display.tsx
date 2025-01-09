interface Message {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

interface MessageDisplayProps {
  messages: Message[];
  currentLanguage: string;
}

export function MessageDisplay({ messages, currentLanguage }: MessageDisplayProps) {
  const formatMessageDate = (timestamp: number) => {
    const messageDate = new Date(timestamp);
    const now = new Date();
    const isToday = messageDate.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === messageDate.toDateString();
    const isThisYear = messageDate.getFullYear() === now.getFullYear();

    const timeStr = messageDate.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();

    if (isToday) {
      return timeStr;
    } else if (isYesterday) {
      return `Yesterday ${timeStr}`;
    } else if (isThisYear) {
      return messageDate.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).toLowerCase();
    } else {
      return messageDate.toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).toLowerCase();
    }
  };

  return (
    <div className="w-full space-y-2 px-2 py-4 bg-white">
      {messages.map((message, index) => {
        const isSentByUser = message.sourceLang === currentLanguage;
        const showTimestamp = index === messages.length - 1 || 
          new Date(messages[index + 1]?.timestamp).getTime() - new Date(message.timestamp).getTime() > 30000;
        
        const nextMessage = messages[index + 1];
        const isNextMessageDifferentSender = nextMessage && 
          (nextMessage.sourceLang === currentLanguage) !== isSentByUser;

        return (
          <div key={message.id} 
            className={`space-y-2 ${
              isNextMessageDifferentSender ? 'mb-8' : 'mb-2'
            }`}
          >
            {showTimestamp && (
              <div className="flex justify-center my-4">
                <span className="text-[11px] text-gray-500">
                  {formatMessageDate(message.timestamp)}
                </span>
              </div>
            )}
            <div className={`flex flex-col ${isSentByUser ? 'items-end' : 'items-start'}`}>
              <div className={`relative max-w-[255px] ${isSentByUser ? 'send-bubble' : 'receive-bubble'}`}>
                <div className="space-y-0">
                  <p className="text-[16px] leading-[20px]">{message.originalText}</p>
                  <p className={`text-[14px] leading-[18px] ${
                    isSentByUser ? 'text-blue-50/90' : 'text-gray-600/90'
                  }`}>
                    {message.translatedText}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 