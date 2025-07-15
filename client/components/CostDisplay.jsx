import React from 'react';
import { DollarSign, TrendingUp, Clock, Zap } from 'react-feather';
import { formatCost } from '../utils/costCalculator';

const CostDisplay = ({ totalCost, sessionCosts, isSessionActive }) => {
  // Calculate breakdown by type
  const realtimeCosts = sessionCosts.filter(c => c.type === 'realtime_response');
  const imageCosts = sessionCosts.filter(c => c.type === 'image_analysis');
  const transcriptionCosts = sessionCosts.filter(c => c.type === 'audio_transcription');
  
  const realtimeTotal = realtimeCosts.reduce((sum, c) => sum + c.totalCost, 0);
  const imageTotal = imageCosts.reduce((sum, c) => sum + c.totalCost, 0);
  const transcriptionTotal = transcriptionCosts.reduce((sum, c) => sum + c.totalCost, 0);
  
  // Calculate total tokens
  const totalTokens = sessionCosts.reduce((sum, c) => {
    if (c.breakdown) {
      return sum + Object.values(c.breakdown).reduce((tokenSum, tokens) => {
        return tokenSum + (typeof tokens === 'number' ? tokens : 0);
      }, 0);
    }
    return sum;
  }, 0);

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-5 h-5 text-green-600" />
        <h3 className="text-sm font-semibold text-gray-800">Session Cost</h3>
        {isSessionActive && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600">Live</span>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        {/* Total Cost */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900">
            Total: {formatCost(totalCost)}
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{sessionCosts.length} requests</span>
          </div>
        </div>
        
        {/* Real-time indicator */}
        {isSessionActive && (
          <div className="text-center">
            <span className="text-xs text-green-600 font-medium">
              💰 Real-time cost tracking in INR
            </span>
          </div>
        )}
        
        {/* Breakdown */}
        {sessionCosts.length > 0 && (
          <div className="space-y-2">
            {realtimeCosts.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                  <span className="text-gray-600">Voice Chat</span>
                </div>
                <span className="font-medium text-gray-800">
                  {formatCost(realtimeTotal)}
                </span>
              </div>
            )}
            
            {imageCosts.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-600">Image Analysis</span>
                </div>
                <span className="font-medium text-gray-800">
                  {formatCost(imageTotal)}
                </span>
              </div>
            )}
            
            {transcriptionCosts.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-600">Audio Transcription</span>
                </div>
                <span className="font-medium text-gray-800">
                  {formatCost(transcriptionTotal)}
                </span>
              </div>
            )}
            
            {/* Token count */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>Total Tokens</span>
              </div>
              <span>{totalTokens.toLocaleString()}</span>
            </div>
          </div>
        )}
        
        {/* No usage message */}
        {sessionCosts.length === 0 && (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">
              {isSessionActive ? 'No API usage yet' : 'Start a session to track costs'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CostDisplay; 