import React, { useState, useEffect } from 'react';

const InterviewMode = ({ 
  isInterviewMode, 
  onToggleInterviewMode, 
  conversationAnalysis, 
  onSettingsUpdate, // Added onSettingsUpdate prop
  settings: propSettings // Renamed settings prop to propSettings to avoid naming conflict
}) => {
  const [settings, setSettings] = useState(propSettings); // Initialize state from prop

  // Update internal settings state when propSettings changes
  useEffect(() => {
    setSettings(propSettings);
  }, [propSettings]);

  const [stats, setStats] = useState({
    totalQuestions: 0,
    aiResponses: 0,
    averageConfidence: 0,
    sessionDuration: 0
  });

  useEffect(() => {
    if (conversationAnalysis) {
      const summary = conversationAnalysis.getConversationSummary();
      setStats({
        totalQuestions: summary.totalQuestions,
        aiResponses: stats.aiResponses, // This would be tracked separately
        averageConfidence: summary.averageQuestionConfidence,
        sessionDuration: summary.conversationDuration
      });
    }
  }, [conversationAnalysis, stats.aiResponses]); // Added stats.aiResponses to dependency array for correctness

  // Pass settings updates back to parent
  const handleSettingsChange = (newSetting) => {
    setSettings(prev => {
      const updatedSettings = { ...prev, ...newSetting };
      onSettingsUpdate(updatedSettings); // Call parent update function
      return updatedSettings;
    });
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    if (confidence >= 0.4) return 'Low';
    return 'Very Low';
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out ${
      isInterviewMode 
        ? 'w-[360px] h-[calc(100vh-100px)] bg-white border border-gray-200 rounded-lg shadow-xl p-4 flex flex-col' 
        : 'w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 shadow-lg flex items-center justify-center cursor-pointer'
    }`}>
      <button
        onClick={onToggleInterviewMode}
        className={`absolute top-2 right-2 p-2 rounded-full text-white transition-colors duration-200 ${
          isInterviewMode ? 'bg-red-500 hover:bg-red-600' : 'bg-transparent hover:bg-blue-700'
        }`}
        title={isInterviewMode ? 'Stop Interview Mode' : 'Start Interview Mode'}
      >
        {isInterviewMode ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )}
      </button>

      {!isInterviewMode && (
        <span className="text-white text-xs font-semibold uppercase tracking-wider">
          AI
        </span>
      )}

      {isInterviewMode && (
        <div className="flex-1 overflow-y-auto pt-8"> {/* Added pt-8 to prevent content being hidden by button */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Interview Mode</h3>
          </div>
          {/* Settings Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Settings</h4>
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Response Threshold: {(settings.responseThreshold * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="0.9"
                  step="0.1"
                  value={settings.responseThreshold}
                  onChange={(e) => handleSettingsChange({ responseThreshold: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Conservative</span>
                  <span>Aggressive</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Interview Type</label>
                <select
                  value={settings.interviewType}
                  onChange={(e) => handleSettingsChange({ interviewType: e.target.value })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General Interview</option>
                  <option value="technical">Technical Interview</option>
                  <option value="behavioral">Behavioral Interview</option>
                  <option value="panel">Panel Interview</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoRespond"
                  checked={settings.autoRespond}
                  onChange={(e) => handleSettingsChange({ autoRespond: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="autoRespond" className="text-xs text-gray-600">
                  Auto-respond to questions
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showAnalysis"
                  checked={settings.showAnalysis}
                  onChange={(e) => handleSettingsChange({ showAnalysis: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="showAnalysis" className="text-xs text-gray-600">
                  Show real-time analysis
                </label>
              </div>
            </div>

            {/* Stats Panel */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Session Stats</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 p-2 rounded">
                  <div className="text-lg font-semibold text-blue-800"></div>
                  <div className="text-xs text-blue-600">Questions</div>
                </div>
                
                <div className="bg-green-50 p-2 rounded">
                  <div className="text-lg font-semibold text-green-800">{stats.aiResponses}</div>
                  <div className="text-xs text-green-600">AI Responses</div>
                </div>
                
                <div className="bg-yellow-50 p-2 rounded">
                  <div className={`text-lg font-semibold ${getConfidenceColor(stats.averageConfidence)}`}>
                    {(stats.averageConfidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-yellow-600">Avg Confidence</div>
                </div>
                
                <div className="bg-purple-50 p-2 rounded">
                  <div className="text-lg font-semibold text-purple-800">
                    {formatDuration(stats.sessionDuration)}
                  </div>
                  <div className="text-xs text-purple-600">Duration</div>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Analysis Display */}
          {settings.showAnalysis && conversationAnalysis && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Live Analysis</h4>
              
              {conversationAnalysis.conversationHistory.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {conversationAnalysis.conversationHistory.slice(-3).map((entry, index) => (
                    <div key={index} className="flex items-start space-x-3 p-2 bg-gray-50 rounded text-sm">
                      <div className="flex-shrink-0">
                        {entry.isQuestion?.detected ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            Question
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                            Statement
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-800 truncate"></div>
                        <div className="flex items-center space-x-2 mt-1">
                          {entry.isQuestion?.detected && (
                            <span className={`text-xs ${getConfidenceColor(entry.confidence)}`}>
                              {getConfidenceLabel(entry.confidence)} confidence
                            </span>
                          )}
                          {entry.isInterviewerSpeaking?.detected && (
                            <span className="text-xs text-indigo-600">Interviewer</span>
                          )}
                          {entry.shouldRespond && (
                            <span className="text-xs text-green-600">✓ Should respond</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <h5 className="text-sm font-medium text-blue-800 mb-1">How it works:</h5>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• AI listens to the conversation between interviewer and interviewee</li>
                <li>• Detects questions using speech patterns and keywords</li>
                <li>• Only responds when it detects an interviewer asking a question</li>
                <li>• Adjusts response style based on question type and context</li>
                <li>• Uses confidence thresholds to avoid interrupting inappropriately</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewMode; 