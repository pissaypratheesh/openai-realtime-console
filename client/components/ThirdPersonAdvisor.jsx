import { useState } from 'react';
import { Users, MessageCircle, Settings, Info } from 'react-feather';

export default function ThirdPersonAdvisor({ 
  isActive, 
  onToggle, 
  advisorSettings, 
  onSettingsChange,
  onSendAdvice,
  isSessionActive,
  // Cost optimization props
  totalSessionCost,
  costLimit,
  setCostLimit,
  responseCount,
  maxResponsesPerSession,
  setMaxResponsesPerSession,
  responseBlocked,
  setResponseBlocked,
  conversationCount
}) {
  const [adviceText, setAdviceText] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const handleSendAdvice = () => {
    if (adviceText.trim() && isSessionActive) {
      onSendAdvice(adviceText);
      setAdviceText('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAdvice();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Third Person Advisor</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              isActive 
                ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                : 'bg-gray-100 text-gray-600 border border-gray-300'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </button>
        </div>
      </div>

      {/* Conversation Context Display */}
      {isActive && isSessionActive && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600">👂</span>
            <span className="text-sm font-medium text-blue-700">Listening Status</span>
          </div>
          <div className="text-sm text-blue-600">
            📝 Conversation messages captured: <span className="font-medium">{conversationCount}</span>
          </div>
          <div className="text-xs text-blue-500 mt-1">
            The AI is actively listening and building context. Send a text message below to request advice.
          </div>
          {conversationCount > 0 && (
            <div className="mt-2 text-xs text-blue-500">
              💡 Ready to provide advice based on the conversation context
            </div>
          )}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Advisor Settings</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={advisorSettings.silentListening}
                onChange={(e) => onSettingsChange({ ...advisorSettings, silentListening: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-600">Silent Listening Mode</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={advisorSettings.onlyRespondToText}
                onChange={(e) => onSettingsChange({ ...advisorSettings, onlyRespondToText: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-600">Only Respond to Text</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Personality:</span>
              <select
                value={advisorSettings.advisorPersonality}
                onChange={(e) => onSettingsChange({ ...advisorSettings, advisorPersonality: e.target.value })}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="technical">Technical</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Mode Description */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="text-xs space-y-1 text-blue-700">
              <li>• AI listens silently to your conversation</li>
              <li>• Only responds when you ask for advice via text</li>
              <li>• Provides neutral, third-party solutions</li>
              <li>• Perfect for mediation and problem-solving</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Cost Optimization Controls */}
      {isActive && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <span className="text-green-600">💰</span>
            Cost Optimization
          </h4>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Cost Limit ($)</label>
              <input
                type="number"
                step="0.50"
                min="0.50"
                max="50.00"
                value={costLimit}
                onChange={(e) => setCostLimit(parseFloat(e.target.value))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                disabled={!isSessionActive}
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 mb-1">Max Responses</label>
              <input
                type="number"
                min="1"
                max="200"
                value={maxResponsesPerSession}
                onChange={(e) => setMaxResponsesPerSession(parseInt(e.target.value))}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                disabled={!isSessionActive}
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
            <span>Current Cost: ${totalSessionCost.toFixed(4)}</span>
            <span>Responses: {responseCount}/{maxResponsesPerSession}</span>
          </div>
          
          {responseBlocked && (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded p-2 mb-2">
              <span className="text-xs text-red-600">🚫 Responses blocked due to limits</span>
              <button
                onClick={() => setResponseBlocked(false)}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
              >
                Unblock
              </button>
            </div>
          )}
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                totalSessionCost >= costLimit ? 'bg-red-500' : 
                totalSessionCost >= costLimit * 0.8 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min((totalSessionCost / costLimit) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Advice Input */}
      {isActive && isSessionActive && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MessageCircle className="w-4 h-4" />
            <span>Ask for advice about the conversation:</span>
          </div>
          <div className="flex gap-2">
            <textarea
              value={adviceText}
              onChange={(e) => setAdviceText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 'What's the best solution for this disagreement?' or 'How can both parties find common ground?'"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm resize-none"
              rows="3"
            />
            <button
              onClick={handleSendAdvice}
              disabled={!adviceText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
            >
              Ask
            </button>
          </div>
          <div className="text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      )}

      {/* Status Messages */}
      {isActive && !isSessionActive && (
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">Start a session to activate Third Person Advisor mode</p>
        </div>
      )}

      {!isActive && (
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">Click "Active" to enable Third Person Advisor mode</p>
        </div>
      )}
    </div>
  );
} 