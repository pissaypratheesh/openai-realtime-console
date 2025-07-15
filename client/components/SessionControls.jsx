import { useState, useRef, useEffect } from "react";
import { CloudLightning, CloudOff, Mic, MicOff, Send, ChevronUp, ChevronDown, MessageSquare, Code, Image } from "react-feather";
import Button from "./Button";
import CostDisplay from "./CostDisplay";

/* global setTimeout, alert, FileReader */

function SessionActive({
  stopSession,
  toggleVoiceInput,
  isListening,
  sendClientEvent,
  sendTextMessage,
  isGeneratingResponse,
  addTestMermaidMessage,
  addTestVoiceTranscription,
  startSession,
  isSessionActive,
  setIsSessionActive,
  sendImageMessage, // Added sendImageMessage prop
  totalSessionCost,
  sessionCosts,
  // Mode selector props
  currentMode,
  isInterviewMode,
  toggleInterviewMode,
  isThirdPersonAdvisorMode,
  toggleThirdPersonAdvisorMode
}) {
  const [testMessage, setTestMessage] = useState("");
  const [isActivating, setIsActivating] = useState(false);
  // Removed fileInputRef and imageUploadStatus states

  function handleStartSession() {
    if (isActivating) return;
    setIsActivating(true);
    startSession();
  }

  useEffect(() => {
    if (isSessionActive) {
      setIsActivating(false);
    }
  }, [isSessionActive]);

  function triggerResponse() {
    if (!isGeneratingResponse) {
      console.log("🤖 Manual text-only response trigger");
      sendClientEvent({
        type: "response.create",
        response: {
          modalities: ["text"]
        }
      });
    } else {
      console.log("⏳ Response already being generated, ignoring manual trigger");
    }
  }

  function sendTestMessage() {
    if (testMessage.trim()) {
      console.log("📝 Sending test message:", testMessage);
      sendTextMessage(testMessage);
      setTestMessage("");
    }
  }

  return (
    <div className="flex flex-col items-center justify-end w-full h-full p-4">
      {/* Start Session / Session Active Indicator */}
      {!isSessionActive && (
        <div className="mb-4 text-center">
          <Button
            onClick={handleStartSession}
            className={isActivating ? "bg-gray-600" : "bg-red-600"}
            icon={<CloudLightning height={16} />}
            disabled={isActivating}
          >
            {isActivating ? "starting session..." : "start session"}
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            Start a session to begin voice conversations
          </p>
          
          {/* Mode Selector */}
          <div className="mt-4 w-full">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Select Mode:</h4>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (currentMode !== 'normal') {
                    if (isInterviewMode) toggleInterviewMode();
                    if (isThirdPersonAdvisorMode) toggleThirdPersonAdvisorMode();
                  }
                }}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentMode === 'normal' 
                    ? 'bg-green-100 text-green-800 border border-green-300' 
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                🎤 Normal Mode
              </button>
              <button
                onClick={toggleInterviewMode}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentMode === 'interview' 
                    ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                🎯 Interview Mode
              </button>
              <button
                onClick={toggleThirdPersonAdvisorMode}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentMode === 'advisor' 
                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' 
                    : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                🧑‍💼 Third Person Advisor
              </button>
            </div>
          </div>
          
          {/* Cost Display when session is not active */}
          <div className="mt-4 w-full">
            <CostDisplay 
              totalCost={totalSessionCost}
              sessionCosts={sessionCosts}
              isSessionActive={isSessionActive}
            />
          </div>
        </div>
      )}

      {isSessionActive && (
        <>
          <div className="mb-4 flex flex-col gap-2 w-full">
            {/* Listening and Trigger Response Buttons */}
            <div className="flex gap-2 w-full">
              <Button
                onClick={toggleVoiceInput}
                className={`flex-1 ${isListening ? "bg-red-500 animate-pulse" : "bg-green-500"}`}
                icon={isListening ? <MicOff height={20} /> : <Mic height={20} />}
              >
                {isListening ? "Stop Listening" : "Start Listening"}
              </Button>
              <Button
                onClick={triggerResponse}
                className={`flex-1 ${isGeneratingResponse ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500"}`}
                disabled={isGeneratingResponse}
              >
                {isGeneratingResponse ? "Generating..." : "Trigger Response"}
              </Button>
            </div>

            
            {/* Text Input */}
            <div className="w-full">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendTestMessage()}
                placeholder="Type a test message..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            {/* Send/Test Mermaid/Image Upload Buttons */}
            <div className="flex gap-2 w-full justify-end">
              <Button onClick={sendTestMessage} className="bg-purple-500" icon={<Send height={16} />}>
                Send
              </Button>
              <Button
                onClick={addTestMermaidMessage}
                className="bg-orange-500 px-3 py-1 text-xs w-8 h-8 flex items-center justify-center"
              >
                M
              </Button>
              <Button
                onClick={addTestVoiceTranscription}
                className="bg-green-500 px-3 py-1 text-xs w-8 h-8 flex items-center justify-center"
                title="Test Voice Transcription"
              >
                🎤
              </Button>
              <Button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const imageData = event.target.result;
                        const [header, base64Data] = imageData.split(',');
                        const mediaType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
                        
                        sendImageMessage(
                          {
                            type: 'base64',
                            media_type: mediaType,
                            data: base64Data,
                          },
                          `Please analyze this image: ${file.name}`
                        );
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
                className="bg-teal-500 px-3 py-1 text-xs w-8 h-8 flex items-center justify-center"
                title="Upload Image"
              >
                <Image height={16} />
              </Button>
            </div>
          </div>

          {/* Status Messages */}
          <div className="text-sm text-gray-600 mb-4 w-full text-center">
            {isListening ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span>Listening... Speak now</span>
              </div>
            ) : (
              <span>Click to start voice input</span>
            )}
            {isGeneratingResponse && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-600 font-medium">AI is generating response...</span>
              </div>
            )}
          </div>
          
          {/* Cost Display */}
          <div className="mb-4 w-full">
            <CostDisplay 
              totalCost={totalSessionCost}
              sessionCosts={sessionCosts}
              isSessionActive={isSessionActive}
            />
          </div>
          
          {/* Disconnect Button */}
          <Button 
            onClick={stopSession} 
            icon={<CloudOff height={16} />}
            className="bg-gray-600 w-full"
          >
            disconnect
          </Button>
        </>
      )}
    </div>
  );
}

export default function SessionControls({
  startSession,
  stopSession,
  sendClientEvent,
  sendTextMessage,
  toggleVoiceInput,
  isListening,
  isSessionActive,
  isGeneratingResponse,
  addTestMermaidMessage,
  addTestVoiceTranscription,
  setIsSessionActive, // Passed down from App.jsx to control session state
  sendImageMessage, // Pass sendImageMessage to SessionActive
  totalSessionCost,
  sessionCosts,
  // Mode selector props
  currentMode,
  isInterviewMode,
  toggleInterviewMode,
  isThirdPersonAdvisorMode,
  toggleThirdPersonAdvisorMode
}) {
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);

  const toggleControlsExpanded = () => {
    setIsControlsExpanded(prev => !prev);
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out transform ${
      isControlsExpanded 
        ? 'w-[75vw] h-auto bg-white border border-gray-200 rounded-lg shadow-xl p-4' 
        : `w-14 h-14 rounded-full shadow-lg flex items-center justify-center cursor-pointer ${
            isSessionActive 
              ? 'bg-indigo-600 hover:bg-indigo-700' 
              : 'bg-red-600 hover:bg-red-700 animate-pulse'
          }`
    }`}>
      {/* Expand/Collapse Button */}
      <button
        onClick={toggleControlsExpanded}
        className={`absolute top-2 right-2 p-2 rounded-full text-white transition-colors duration-200 ${
          isControlsExpanded ? 'bg-gray-500 hover:bg-gray-600' : 'bg-transparent hover:bg-indigo-700'
        }`}
        title={isControlsExpanded ? 'Collapse Session Controls' : 'Expand Session Controls'}
      >
        {isControlsExpanded ? (
          <ChevronDown height={20} />
        ) : (
          <ChevronUp height={20} />
        )}
      </button>

      {isControlsExpanded ? (
        <SessionActive
          startSession={startSession} 
          stopSession={stopSession}
          sendClientEvent={sendClientEvent}
          sendTextMessage={sendTextMessage}
          toggleVoiceInput={toggleVoiceInput}
          isListening={isListening}
          isSessionActive={isSessionActive} 
          isGeneratingResponse={isGeneratingResponse}
          addTestMermaidMessage={addTestMermaidMessage}
          addTestVoiceTranscription={addTestVoiceTranscription}
          setIsSessionActive={setIsSessionActive}
          sendImageMessage={sendImageMessage} // Pass sendImageMessage
          totalSessionCost={totalSessionCost}
          sessionCosts={sessionCosts}
          // Mode selector props
          currentMode={currentMode}
          isInterviewMode={isInterviewMode}
          toggleInterviewMode={toggleInterviewMode}
          isThirdPersonAdvisorMode={isThirdPersonAdvisorMode}
          toggleThirdPersonAdvisorMode={toggleThirdPersonAdvisorMode}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-white">
          <CloudLightning height={20} className="mb-1" />
          <span className="text-xs font-medium">
            {isSessionActive ? "Controls" : "Start"}
          </span>
        </div>
      )}
    </div>
  );
}
