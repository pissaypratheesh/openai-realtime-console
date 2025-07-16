import React, { useState } from 'react';
// Simple icon components using Unicode symbols
const ChevronUp = ({ className }) => <span className={className}>⬆️</span>;
const ChevronDown = ({ className }) => <span className={className}>⬇️</span>;
const Monitor = ({ className }) => <span className={className}>🖥️</span>;

const DebugPanel = ({ events }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <div className={`fixed bottom-4 right-[calc(70px+1rem)] z-50 transition-all duration-300 ease-in-out transform ${
      isExpanded 
        ? 'w-[360px] h-auto bg-white border border-gray-200 rounded-lg shadow-xl p-4' 
        : 'w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-700 shadow-lg flex items-center justify-center cursor-pointer'
    }`}>
      {/* Expand/Collapse Button */}
      <button
        onClick={toggleExpanded}
        className={`absolute top-2 right-2 p-2 rounded-full text-white transition-colors duration-200 ${
          isExpanded ? 'bg-gray-500 hover:bg-gray-600' : 'bg-transparent hover:bg-gray-700'
        }`}
        title={isExpanded ? 'Collapse Debug Panel' : 'Expand Debug Panel'}
      >
        {isExpanded ? (
          <ChevronDown height={20} />
        ) : (
          <Monitor height={20} />
        )}
      </button>

      {isExpanded ? (
        <div className="flex-1 overflow-y-auto pt-8">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">AI Models Used</h3>
          <div className="text-xs space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-cyan-100 text-cyan-800">
                🔄 Realtime
              </span>
              <span className="text-gray-600">Voice conversations (gpt-4o-realtime-preview)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                📊 o4-mini
              </span>
              <span className="text-gray-600">Image analysis with conversation context</span>
            </div>
          </div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Debug Events</h3>
          <div className="text-xs space-y-1">
            {events.slice(0, 8).map((event, i) => (
              <div key={i} className={`p-1 rounded ${
                event.type?.startsWith('response.') ? 'bg-green-100' : 
                event.type?.includes('transcription') ? 'bg-blue-100' : 
                'bg-gray-100'
              }`}>
                <div className="font-mono text-xs">{event.type}</div>
                <div className="text-gray-600">{event.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <span className="text-white text-xs font-semibold uppercase tracking-wider">
          Debug
        </span>
      )}
    </div>
  );
};

export default DebugPanel; 