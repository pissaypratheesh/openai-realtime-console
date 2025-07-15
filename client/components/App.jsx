import { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";
import MarkdownMessage from "./MarkdownMessage";
import InterviewMode from "./InterviewMode";
import ThirdPersonAdvisor from "./ThirdPersonAdvisor";
import DebugPanel from "./DebugPanel"; // Import DebugPanel
import ImageUploadPanel from "./ImageUploadPanel"; // Import ImageUploadPanel
import { ClipboardFilePOC } from "./ClipboardFilePOC"; // Import ClipboardFilePOC
import { GlobalClipboardDisplay } from "./GlobalClipboardDisplay"; // Import GlobalClipboardDisplay
import { ConversationAnalyzer } from "../utils/conversationAnalyzer";
import { calculateRealtimeCost, calculateChatCompletionsCost, aggregateCosts, formatCost } from "../utils/costCalculator";

/* global setTimeout, clearTimeout, AbortController, alert, requestAnimationFrame, FileReader */

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [modelsUsed, setModelsUsed] = useState([]); // Initialize modelsUsed state
  
  // Cost tracking state
  const [sessionCosts, setSessionCosts] = useState([]);
  const [totalSessionCost, setTotalSessionCost] = useState(0);
  
  // Interview Mode state
  const [isInterviewMode, setIsInterviewMode] = useState(false);
  const [conversationAnalyzer, setConversationAnalyzer] = useState(null);
  const [interviewSettings, setInterviewSettings] = useState({
    responseThreshold: 0.7,
    autoRespond: true,
    showAnalysis: true,
    interviewType: 'general'
  });
  
  // Third Person Advisor Mode state
  const [isThirdPersonAdvisorMode, setIsThirdPersonAdvisorMode] = useState(false);
  const [advisorSettings, setAdvisorSettings] = useState({
    silentListening: true,
    onlyRespondToText: true,
    advisorPersonality: 'professional' // professional, casual, technical
  });
  
  // Voice listening control
  const [isListeningPaused, setIsListeningPaused] = useState(false);
  const audioStreamRef = useRef(null);
  const isListeningPausedRef = useRef(false);
  const shouldAutoResumeRef = useRef(false);
  
  // Cost optimization and response control
  const [responseBlocked, setResponseBlocked] = useState(false);
  const [costLimit, setCostLimit] = useState(5.00); // $5 default limit
  const [responseCount, setResponseCount] = useState(0);
  const [maxResponsesPerSession, setMaxResponsesPerSession] = useState(50);
  
  // Mode management - ensure only one mode is active at a time
  const [currentMode, setCurrentMode] = useState('normal'); // 'normal', 'interview', 'advisor'
  
  // Clipboard POC state
  const [showClipboardPOC, setShowClipboardPOC] = useState(false);
  
  // Auto-scroll state and refs
  const conversationContainerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  
  const peerConnection = useRef(null);
  const eventListenersAttached = useRef(false);

  // Initialize conversation analyzer
  useEffect(() => {
    setConversationAnalyzer(new ConversationAnalyzer());
  }, []);

  // Electron global shortcuts support
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      console.log("🖥️ Electron detected - setting up global shortcuts");
      
      // Handle global clipboard paste (Ctrl+L)
      window.electronAPI.onGlobalClipboardPaste((content) => {
        console.log("📋 Global clipboard paste triggered (Ctrl+L):", content);
        if (content && content.trim()) {
          // Add clipboard content to conversation
          const clipboardMessage = {
            type: 'user',
            content: content,
            timestamp: new Date().toLocaleTimeString(),
            isClipboard: true
          };
          
          setConversations(prev => [...prev, clipboardMessage]);
          
          // Send to AI if session is active
          if (isSessionActive && currentMode === 'normal') {
            sendTextMessage(content);
          }
        }
      });
      
      // Handle global session toggle
      window.electronAPI.onGlobalSessionToggle(() => {
        console.log("🔄 Global session toggle triggered");
        if (isSessionActive) {
          stopSession();
        } else {
          startSession();
        }
      });
      
      // Handle global pause toggle
      window.electronAPI.onGlobalPauseToggle(() => {
        console.log("⏸️ Global pause toggle triggered");
        toggleListeningPause();
      });
      
      // Cleanup listeners on unmount
      return () => {
        if (window.electronAPI) {
          window.electronAPI.removeAllListeners('global-clipboard-paste');
          window.electronAPI.removeAllListeners('global-session-toggle');
          window.electronAPI.removeAllListeners('global-pause-toggle');
        }
      };
    }
  }, [isSessionActive, currentMode]);



  // Auto-scroll to bottom when new messages arrive (only if auto-scroll is enabled)
  useEffect(() => {
    if (shouldAutoScroll && conversationContainerRef.current) {
      const container = conversationContainerRef.current;
      
      // Simple scroll to bottom without any complex checks
      setTimeout(() => {
        if (conversationContainerRef.current && shouldAutoScroll) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [conversations, shouldAutoScroll]);

  // Very simple scroll handler - disable auto-scroll when user scrolls up
  const handleScroll = () => {
    if (!conversationContainerRef.current) return;
    
    const container = conversationContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
    
    if (isAtBottom) {
      // User is at bottom - enable auto-scroll
      setShouldAutoScroll(true);
    } else {
      // User scrolled up - disable auto-scroll
      setShouldAutoScroll(false);
    }
  };



  // Toggle interview mode
  const toggleInterviewMode = () => {
    setIsInterviewMode(prev => {
      const newMode = !prev;
      if (newMode) {
        console.log("🎤 Interview mode activated");
        conversationAnalyzer?.reset();
        setCurrentMode('interview');
        setIsThirdPersonAdvisorMode(false); // Disable advisor mode
      } else {
        console.log("🎤 Interview mode deactivated");
        setCurrentMode('normal');
      }
      return newMode;
    });
  };

  // Toggle third person advisor mode
  const toggleThirdPersonAdvisorMode = () => {
    console.log("🔄 Toggling Third Person Advisor Mode. Current state:", isThirdPersonAdvisorMode);
    setIsThirdPersonAdvisorMode(prev => {
      const newMode = !prev;
      console.log("🔄 New advisor mode state:", newMode);
      
      if (newMode) {
        console.log("🧑‍💼 Third Person Advisor mode activated");
        setCurrentMode('advisor');
        setIsInterviewMode(false); // Disable interview mode
        console.log("🔄 Current mode set to: advisor");
        
        // Update session instructions for advisor mode
        if (isSessionActive) {
          const sessionConfig = {
            type: "session.update",
            session: {
              instructions: getSessionInstructions(),
              modalities: ["text", "audio"],
              input_audio_transcription: {
                model: "whisper-1"
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              },
            },
          };
          sendClientEvent(sessionConfig);
          console.log("🧑‍💼 Session instructions updated for Third Person Advisor mode");
        }
      } else {
        console.log("🧑‍💼 Third Person Advisor mode deactivated");
        setCurrentMode('normal');
        console.log("🔄 Current mode set to: normal");
        
        // Update session instructions for normal mode
        if (isSessionActive) {
          const sessionConfig = {
            type: "session.update",
            session: {
              instructions: getSessionInstructions(),
              modalities: ["text", "audio"],
              input_audio_transcription: {
                model: "whisper-1"
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              },
            },
          };
          sendClientEvent(sessionConfig);
          console.log("🧑‍💼 Session instructions updated for normal mode");
        }
      }
      return newMode;
    });
  };

  // Toggle listening pause
  const toggleListeningPause = () => {
    const newPauseState = !isListeningPaused;
    console.log(newPauseState ? "⏸️ Voice listening paused" : "▶️ Voice listening resumed");
    
    // Update state and refs
    setIsListeningPaused(newPauseState);
    isListeningPausedRef.current = newPauseState;
    
    // Track if user paused during response generation for auto-resume
    if (newPauseState && isGeneratingResponse) {
      console.log("📝 User paused during response generation - will auto-resume after response");
      shouldAutoResumeRef.current = true;
    } else if (!newPauseState) {
      console.log("📝 User manually resumed - clearing auto-resume flag");
      shouldAutoResumeRef.current = false;
    }
    
    // Control the actual audio track
    if (audioStreamRef.current) {
      const audioTrack = audioStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !newPauseState;
        console.log(`🎤 Audio track ${newPauseState ? 'disabled' : 'enabled'}`);
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (event) => {
      // Check for Ctrl+P (Control key on all platforms including Mac) - Pause/Resume
      if (event.ctrlKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        if (isSessionActive) {
          toggleListeningPause();
        }
      }
      
      // Check for Ctrl+S - Start/Stop session
      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (isSessionActive) {
          console.log("🛑 Stopping session via Ctrl+S");
          stopSession();
        } else {
          console.log("🚀 Starting session via Ctrl+S");
          startSession();
        }
      }
      
             // Check for Ctrl+V - Send clipboard content to AI
       if (event.ctrlKey && event.key.toLowerCase() === 'v') {
         event.preventDefault();
         if (isSessionActive && currentMode === 'normal') {
           try {
             console.log("📋 Reading clipboard content via Ctrl+V");
             const clipboardText = await navigator.clipboard.readText();
             if (clipboardText && clipboardText.trim()) {
               console.log("📤 Sending clipboard content to AI:", clipboardText.substring(0, 100) + "...");
               
               // Add the clipboard content to conversation display first
               setConversations((prev) => [
                 ...prev,
                 {
                   id: crypto.randomUUID(),
                   type: "user",
                   content: clipboardText,
                   timestamp: new Date().toLocaleTimeString(),
                   isVoice: false,
                   isClipboard: true,
                 },
               ]);
               
               // Then send to AI
               sendTextMessage(clipboardText);
             } else {
               console.log("📋 Clipboard is empty or contains no text");
               alert("Clipboard is empty or contains no text");
             }
           } catch (error) {
             console.error("❌ Failed to read clipboard:", error);
             alert("Failed to read clipboard. Make sure you've copied some text first.");
           }
         } else if (!isSessionActive) {
           console.log("⚠️ Cannot send clipboard content - session not active");
           alert("Cannot send clipboard content - start a session first (Ctrl+S)");
         } else if (currentMode !== 'normal') {
           console.log("⚠️ Cannot send clipboard content - not in normal mode");
           alert("Cannot send clipboard content - switch to normal mode first");
         }
       }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSessionActive, currentMode, toggleListeningPause]);

  // Analyze transcript for interview mode
  const analyzeForInterview = (transcript) => {
    if (!isInterviewMode || !conversationAnalyzer || !transcript) {
      return null;
    }

    const analysis = conversationAnalyzer.analyzeTranscript(transcript);
    console.log("🔍 Interview analysis:", analysis);

    // Check if AI should respond based on analysis
    if (analysis.shouldRespond && 
        analysis.confidence >= interviewSettings.responseThreshold &&
        interviewSettings.autoRespond &&
        !isGeneratingResponse) {
      
      console.log(`🤖 AI should respond (confidence: ${(analysis.confidence * 100).toFixed(0)}%):`, analysis.reason);
      
      // Generate context-aware response
      const responseContext = analysis.suggestedResponse;
      const contextualPrompt = generateInterviewResponse(responseContext);
      
      // Send the contextual response
      setTimeout(() => {
        if (!isGeneratingResponse) {
          setIsGeneratingResponse(true);
          sendTextMessage(contextualPrompt);
        }
      }, 1000); // Small delay to feel natural
    }

    return analysis;
  };

  // Generate appropriate interview response based on context
  const generateInterviewResponse = (responseContext) => {
    const { question, context, responseStyle, interviewerConfidence } = responseContext;
    
    let basePrompt = `I'm in an interview setting. The interviewer just asked: "${question}". `;
    
    // Add context if available
    if (context && context.trim() !== question) {
      basePrompt += `Recent conversation context: "${context}". `;
    }
    
    // Customize response style based on question type
    switch (responseStyle) {
      case 'experience_focused':
        basePrompt += "Please provide a professional response highlighting relevant experience and skills. ";
        break;
      case 'technical_explanation':
        basePrompt += "Please provide a clear technical explanation with examples if appropriate. ";
        break;
      case 'example_based':
        basePrompt += "Please provide a specific example or case study to illustrate the point. ";
        break;
      case 'motivation_focused':
        basePrompt += "Please provide a thoughtful response about motivations and goals. ";
        break;
      default:
        basePrompt += "Please provide a professional and appropriate response. ";
    }
    
    // Add interview type context
    switch (interviewSettings.interviewType) {
      case 'technical':
        basePrompt += "This is a technical interview, so focus on technical aspects and problem-solving. ";
        break;
      case 'behavioral':
        basePrompt += "This is a behavioral interview, so use the STAR method (Situation, Task, Action, Result) if applicable. ";
        break;
      case 'panel':
        basePrompt += "This is a panel interview with multiple interviewers. ";
        break;
    }
    
    basePrompt += "Keep the response concise, professional, and directly address the question asked.";
    
    return basePrompt;
  };

  // Get session instructions based on current mode
  const getSessionInstructions = () => {
    console.log("📋 Getting session instructions for mode:", currentMode);
    const baseInstructions = "You are a helpful assistant. You must ALWAYS respond in text format only, never generate audio. The user speaks ONLY in English - treat all voice input as English language only, never detect other languages.";
    
    let instructions;
    switch (currentMode) {
      case 'advisor':
        instructions = `${baseInstructions} 

**CRITICAL THIRD PERSON ADVISOR MODE INSTRUCTIONS**: 
- You are ONLY an advisor listening to a conversation between two people
- DO NOT respond to any voice input automatically - IGNORE ALL VOICE INPUT
- DO NOT interrupt the conversation under any circumstances
- DO NOT generate any responses unless explicitly asked via text message
- ONLY respond when someone sends you a direct text message asking for advice
- When responding, be brief and concise to minimize cost
- Your role is to LISTEN SILENTLY and provide advice ONLY when requested via text
- If you accidentally start responding to voice input, STOP immediately
- Treat all voice input as conversation you are observing, not directed at you
- WAIT for explicit text-based requests before providing any advice
- NEVER EVER respond to voice input - only to text messages asking for advice
- Voice input should be transcribed but NEVER trigger a response from you`;
        break;
        
      case 'interview':
        instructions = `${baseInstructions} 

**INTERVIEW MODE**: You are conducting an interview. Ask thoughtful follow-up questions and engage naturally with the conversation. Keep responses concise and focused.`;
        break;
        
      default:
        instructions = baseInstructions;
        break;
    }
    
    console.log("📋 Session instructions prepared:", instructions.substring(0, 100) + "...");
    return instructions;
  };

  async function startSession() {
    try {
      console.log("🚀 Starting session...");
      setIsSessionActive(true);
      setConversations([]);
      setEvents([]);
      setIsGeneratingResponse(false);
      
      // Reset cost tracking for new session
      setTotalSessionCost(0);
      setSessionCosts([]);
      setResponseCount(0);
      setResponseBlocked(false);
      console.log("💰 Cost tracking reset for new session");
      
      // Get a session token for OpenAI Realtime API
      const tokenResponse = await fetch("/token");
      const data = await tokenResponse.json();
      console.log("Token response:", data);
      
      if (!data.client_secret || !data.client_secret.value) {
        throw new Error("Failed to get ephemeral token");
      }
      
      const EPHEMERAL_KEY = data.client_secret.value;

      // Create a peer connection
      const pc = new RTCPeerConnection();

      // Add local audio track for microphone input
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      
      // Store the audio stream for pause/resume control
      audioStreamRef.current = ms;
      
      pc.addTrack(ms.getTracks()[0]);

      // Set up data channel for sending and receiving events
      const dc = pc.createDataChannel("oai-events");
      
      // Set up data channel event handlers
      dc.addEventListener("open", () => {
        console.log("📡 Data channel opened, configuring session...");
        setIsSessionActive(true);
        setEvents([]);
        setConversations([]);
        setSessionCosts([]);
        setTotalSessionCost(0);
        
                 // Configure session for text-only output now that data channel is ready
         const sessionConfig = {
           type: "session.update",
           session: {
             instructions: getSessionInstructions(),
             modalities: ["text", "audio"],
             input_audio_transcription: {
               model: "whisper-1"
             },
             // Keep turn detection active for transcription, but control responses via instructions
             turn_detection: {
               type: "server_vad",
               threshold: 0.5,
               prefix_padding_ms: 300,
               silence_duration_ms: 500,
             },
           },
         };
        
        console.log("📤 Sending session configuration:", sessionConfig);
        dc.send(JSON.stringify(sessionConfig));
      });

      setDataChannel(dc);

      // Start the session using the Session Description Protocol (SDP)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview-2025-06-03";
      console.log("Sending SDP offer to OpenAI...");
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        console.error("SDP Response error:", errorText);
        throw new Error(`SDP response failed: ${sdpResponse.status} ${errorText}`);
      }

      const answer = {
        type: "answer",
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);

      peerConnection.current = pc;
      console.log("WebRTC connection established successfully");
    } catch (error) {
      console.error("Error starting session:", error);
      alert("Failed to start session: " + error.message);
    }
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }

    peerConnection.current.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    if (peerConnection.current) {
      peerConnection.current.close();
    }

    // Clean up audio stream reference
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }

    setIsSessionActive(false);
    setIsListening(false);
    setIsGeneratingResponse(false);
    setIsListeningPaused(false);
    isListeningPausedRef.current = false;
    shouldAutoResumeRef.current = false;
    setDataChannel(null);
    peerConnection.current = null;
  }

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();

      console.log("📤 SENDING EVENT:", message.type, message);

      // send event before setting timestamp since the backend peer doesn't expect this field
      dataChannel.send(JSON.stringify(message));

      // if guard just in case the timestamp exists by miracle
      if (!message.timestamp) {
        message.timestamp = timestamp;
      }
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  // Send a text message to the model
  function sendTextMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    if (!isGeneratingResponse) {
      setIsGeneratingResponse(true);
      sendClientEvent({ 
        type: "response.create",
        response: {
          modalities: ["text"]
        }
      });
    }
  }

  // Send an advice request message in Third Person Advisor Mode
  function sendAdviceMessage(adviceRequest) {
    console.log("🧑‍💼 Sending advice request:", adviceRequest);
    
    // Get recent conversation context (last 10 messages)
    const recentConversation = conversations
      .filter(msg => msg.type === "user" && msg.isVoice) // Only voice messages from users
      .slice(-10) // Last 10 messages
      .map(msg => `"${msg.content}"`)
      .join('\n');
    
    // Create context-aware advice request
    const contextualRequest = `Based on the conversation I've been listening to:

RECENT CONVERSATION:
${recentConversation}

ADVICE REQUEST: ${adviceRequest}

Please provide thoughtful advice based on the conversation context above.`;

    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: contextualRequest,
          },
        ],
      },
    };

    // Add the advice request to conversation display
    setConversations((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "user",
        content: adviceRequest,
        timestamp: new Date().toLocaleTimeString(),
        isVoice: false,
        isAdviceRequest: true,
      },
    ]);

    sendClientEvent(event);
    if (!isGeneratingResponse) {
      setIsGeneratingResponse(true);
      sendClientEvent({ 
        type: "response.create",
        response: {
          modalities: ["text"],
          max_output_tokens: 300 // Reasonable limit for advice
        }
      });
    }
  }

  // Send an image to the model using Chat Completions API
  async function sendImageMessage(imageData, text = "Please wait, analyze this image") {
    console.log("📸 Analyzing image with Chat Completions API");
    console.log("🖼️ Image data:", { 
      mediaType: imageData.media_type, 
      dataLength: imageData.data.length 
    });

    // Add user message to conversation
    const userMessageId = crypto.randomUUID();
    const loadingMessageId = crypto.randomUUID();
    
    // System prompt being sent to the API
    const systemPrompt = `Analyze this image and respond based on category:
CODING QUESTION: Provide JavaScript solution with:

 - Brute force approach (code + time/space complexity)
 - Optimized approach (code + time/space complexity + algorithm explanation)
 - How the optimal algorithm works conceptually
 - Sample input data walkthrough step-by-step
 - Example I/O demonstration

OTHER QUESTION: Answer comprehensively in relevant context
NO QUESTION: Describe image content + predict next logical step/progression if visible
Be detailed, technical, and complete in explanations.`;

    setConversations((prev) => [
      ...prev,
      {
        id: userMessageId,
        type: "user",
        content: `${text} [Image uploaded: ${imageData.fileName || imageData.media_type}]`,
        timestamp: new Date().toLocaleTimeString(),
        hasImage: true,
        imageData: `data:${imageData.media_type};base64,${imageData.data}`,
        imageName: imageData.fileName || imageData.media_type,
      },
      {
        id: crypto.randomUUID(),
        type: "system",
        content: systemPrompt,
        timestamp: new Date().toLocaleTimeString(),
        isSystemPrompt: true,
      },
      {
        id: loadingMessageId,
        type: "assistant",
        content: "🔍 Analyzing your image... Please wait while I process and understand the content.",
        timestamp: new Date().toLocaleTimeString(),
        hasImage: true,
        isAnalyzing: true,
      },
    ]);

    // Set up timeout handling without aborting the request
    let hasTimedOut = false;
    
    try {
      // Get the current conversation history before the new messages
      const currentConversations = conversations.filter(msg => !msg.hasImage); // Exclude previous image messages to avoid token limits
      
      console.log("🚀 Starting image analysis request...");
      const timeoutId = setTimeout(() => {
        console.log("⏰ Request is taking longer than expected...");
        hasTimedOut = true;
        
        // Show timeout message but don't abort - keep waiting for response
        setConversations((prev) => {
          const updated = prev.map((msg) => {
            if (msg.id === loadingMessageId) {
              return {
                ...msg,
                content: "⏰ This is taking longer than expected... Still analyzing your image, please wait.",
                isAnalyzing: true, // Keep analyzing state
              };
            }
            return msg;
          });
          return updated;
        });
      }, 30000); // Show timeout message after 30 seconds
      
      // Use Chat Completions API for image analysis since Realtime API doesn't support images
      // Include conversation history for context continuity
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          image: `data:${imageData.media_type};base64,${imageData.data}`,
          conversationHistory: currentConversations
        })
        // No signal - let it run as long as needed
      });
      
      clearTimeout(timeoutId);
      console.log("📡 Received response, status:", response.status, hasTimedOut ? "(after timeout message)" : "");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("📥 API Response:", result);
      
      // Track cost for this image analysis
      if (result.cost) {
        const costInfo = {
          ...result.cost,
          timestamp: new Date().toISOString(),
          type: 'image_analysis'
        };
        setSessionCosts(prev => [...prev, costInfo]);
        setTotalSessionCost(prev => prev + result.cost.totalCost);
        console.log(`💰 Image analysis cost: ${formatCost(result.cost.totalCost)}`);
      }
      
      // Prepare the final content with timing info if needed
      let finalContent = result.analysis;
      if (hasTimedOut) {
        finalContent = `✅ **Analysis Complete** (took longer than expected)\n\n${result.analysis}`;
        console.log("📝 Response received after timeout message");
      }
      
      // Replace the loading/timeout message with the actual response
      setConversations((prev) => {
        console.log("🔄 Updating conversation, looking for loadingMessageId:", loadingMessageId);
        let foundAndReplaced = false;
        
        const updated = prev.map((msg) => {
          if (msg.id === loadingMessageId) {
            console.log("✅ Found loading message, replacing with:", finalContent);
            foundAndReplaced = true;
            return {
              ...msg,
              content: finalContent,
              isAnalyzing: false,
            };
          }
          return msg;
        });
        
        // Fallback: if we couldn't find the loading message, replace the last analyzing message
        if (!foundAndReplaced) {
          console.log("⚠️ Loading message not found by ID, looking for last analyzing message");
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].isAnalyzing && updated[i].type === "assistant") {
              console.log("✅ Found analyzing message at index", i, "replacing with:", finalContent);
              updated[i] = {
                ...updated[i],
                content: finalContent,
                isAnalyzing: false,
              };
              foundAndReplaced = true;
              break;
            }
          }
        }
        
        // Last resort: add as new message if still not found
        if (!foundAndReplaced) {
          console.log("⚠️ No analyzing message found, adding as new message");
          updated.push({
            id: crypto.randomUUID(),
            type: "assistant",
            content: finalContent,
            timestamp: new Date().toLocaleTimeString(),
            hasImage: true,
            isAnalyzing: false,
          });
        }
        
        console.log("📝 Updated conversations:", updated);
        return updated;
      });

      console.log("✅ Image analysis completed:", result.analysis);
      
    } catch (error) {
      console.error("❌ Error analyzing image:", error);
      
      let errorMessage = "Sorry, I encountered an error analyzing the image.";
      
      if (error.message.includes('fetch')) {
        errorMessage = "🌐 Network error. Please check your internet connection and try again.";
      } else if (error.message.includes('timeout')) {
        errorMessage = "⏰ Network timeout. The request took too long. Please try again.";
      } else {
        errorMessage = `❌ Error: ${error.message}`;
      }
      
      // Add timing context if error occurred after timeout message
      if (hasTimedOut) {
        errorMessage = `❌ **Error occurred after timeout**\n\n${errorMessage}`;
      }
      
      // Replace the loading message with error message
      setConversations((prev) => {
        console.log("🔄 Updating conversation with error, looking for loadingMessageId:", loadingMessageId);
        const updated = prev.map((msg) => {
          if (msg.id === loadingMessageId) {
            console.log("✅ Found loading message, replacing with error:", errorMessage);
            return {
              ...msg,
              content: errorMessage,
              isAnalyzing: false,
            };
          }
          return msg;
        });
        console.log("📝 Updated conversations with error:", updated);
        return updated;
      });
    }
  }

  // Handle voice input toggle
  function toggleVoiceInput() {
    // Voice input is automatically handled by WebRTC connection
    // This is just for UI feedback
    console.log("Voice input toggled - audio is transmitted via WebRTC");
  }

  // Test function to add a Mermaid diagram message
  function addTestMermaidMessage() {
    const testMessage = {
      id: crypto.randomUUID(),
      type: "assistant",
      content: `
# Test Mermaid Diagram

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> A
\`\`\`

This is a test message with a Mermaid diagram.
      `,
      timestamp: new Date().toLocaleTimeString(),
      isVoice: false,
    };
    
    setConversations((prev) => [...prev, testMessage]);
  }

  // Test function to simulate voice transcription
  function addTestVoiceTranscription() {
    const testTranscript = "Hello, this is a test voice message to check if transcription is working in advisor mode.";
    console.log("🧪 Adding test voice transcription:", testTranscript);
    
    setConversations((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "user",
        content: testTranscript,
        timestamp: new Date().toLocaleTimeString(),
        isVoice: true,
      },
    ]);
    
    console.log("🧪 Test transcription added to conversations");
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel && !eventListenersAttached.current) {
      console.log("📡 Attaching event listeners to data channel");
      eventListenersAttached.current = true;
      
      // Define event handlers
      const handleMessage = (e) => {
        const event = JSON.parse(e.data);
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString();
        }

        setEvents((prev) => [event, ...prev]);

        // Log all events for debugging
        console.log("📥 RECEIVED EVENT:", event.type, event);
        
        // Special logging for response-related events
        if (event.type.startsWith("response.")) {
          console.log("🤖 RESPONSE EVENT:", event.type, event);
        }

        // Extract conversation content for display
        if (event.type === "response.text.delta") {
          // Handle streaming text responses
          if (event.delta) {
            // Estimate tokens for real-time cost tracking (rough approximation)
            const deltaTokens = Math.ceil(event.delta.length / 4); // Rough estimate: 4 chars per token
            const estimatedCost = deltaTokens * 0.02 / 1000; // $0.02 per 1K output tokens
            
            // Update running cost estimate
            setTotalSessionCost(prev => prev + estimatedCost);
            
            setConversations((prev) => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.type === "assistant" && lastMessage.streaming) {
                // Update existing streaming message
                return prev.map((msg, index) => 
                  index === prev.length - 1 
                    ? { ...msg, content: msg.content + event.delta }
                    : msg
                );
              } else {
                // Start new streaming message
                return [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    type: "assistant",
                    content: event.delta,
                    timestamp: new Date().toLocaleTimeString(),
                    streaming: true,
                    isVoice: true, // Mark as voice-related response
                  },
                ];
              }
            });
          }
        } else if (event.type === "response.text.done") {
          // Mark streaming as complete
          setConversations((prev) => 
            prev.map((msg, index) => 
              index === prev.length - 1 && msg.streaming
                ? { ...msg, streaming: false }
                : msg
            )
          );
        } else if (event.type === "response.audio_transcript.delta") {
          // Handle audio transcript streaming (fallback when AI generates audio instead of text)
          console.log("🎵 Audio transcript delta:", event);
          if (event.delta) {
            setConversations((prev) => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.type === "assistant" && lastMessage.streaming) {
                // Update existing streaming message
                return prev.map((msg, index) => 
                  index === prev.length - 1 
                    ? { ...msg, content: msg.content + event.delta }
                    : msg
                );
              } else {
                // Start new streaming message
                return [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    type: "assistant",
                    content: event.delta,
                    timestamp: new Date().toLocaleTimeString(),
                    streaming: true,
                    isVoice: true, // Mark as voice-related response
                  },
                ];
              }
            });
          }
        } else if (event.type === "response.audio_transcript.done") {
          // Mark audio transcript streaming as complete
          console.log("🎵 Audio transcript done:", event);
          setConversations((prev) => 
            prev.map((msg, index) => 
              index === prev.length - 1 && msg.streaming
                ? { ...msg, streaming: false }
                : msg
            )
          );
        } else if (event.type === "response.done") {
          // Handle complete responses
          console.log("✅ Response completed, resetting generation flag");
          console.log("📊 Full response.done event:", event);
          console.log("🔄 Auto-resume check - shouldAutoResume:", shouldAutoResumeRef.current, "isListeningPaused:", isListeningPausedRef.current);
          setIsGeneratingResponse(false);
          
          // Auto-resume listening if user paused during response generation
          if (shouldAutoResumeRef.current && isListeningPausedRef.current) {
            console.log("🔄 Auto-resuming voice listening after response completion");
            setTimeout(() => {
              console.log("🔄 Executing auto-resume...");
              setIsListeningPaused(false);
              isListeningPausedRef.current = false;
              shouldAutoResumeRef.current = false;
              
              // Re-enable the audio track
              if (audioStreamRef.current) {
                const audioTrack = audioStreamRef.current.getAudioTracks()[0];
                if (audioTrack) {
                  audioTrack.enabled = true;
                  console.log("🎤 Audio track re-enabled after auto-resume");
                }
              }
              
              console.log("▶️ Voice listening automatically resumed after response completion");
            }, 500); // Small delay to ensure response is fully processed
          } else {
            console.log("🔄 Auto-resume conditions not met:", {
              shouldAutoResume: shouldAutoResumeRef.current,
              isListeningPaused: isListeningPausedRef.current
            });
          }
          
          // Track cost for this response if usage information is available
          // Check multiple possible locations for usage data
          let usage = null;
          if (event.response && event.response.usage) {
            usage = event.response.usage;
          } else if (event.usage) {
            usage = event.usage;
          }
          
          if (usage) {
            console.log("💰 Found usage data:", usage);
            const costInfo = calculateRealtimeCost(usage);
            const costData = {
              ...costInfo,
              timestamp: new Date().toISOString(),
              type: 'realtime_response'
            };
            setSessionCosts(prev => [...prev, costData]);
            setTotalSessionCost(prev => prev + costInfo.totalCost);
            console.log(`💰 Realtime response cost: ${formatCost(costInfo.totalCost)}`);
            
            // Check if approaching cost limit
            const newTotal = totalSessionCost + costInfo.totalCost;
            if (newTotal >= costLimit * 0.8 && newTotal < costLimit) {
              console.log(`⚠️ Approaching cost limit: ${formatCost(newTotal)}/${formatCost(costLimit)}`);
            } else if (newTotal >= costLimit) {
              console.log(`🚫 Cost limit reached: ${formatCost(newTotal)}/${formatCost(costLimit)}`);
              setResponseBlocked(true);
            }
          } else {
            console.log("⚠️ No usage data found in response.done event");
          }
          if (event.response && event.response.output) {
            event.response.output.forEach((output) => {
              if (output.type === "message" && output.content) {
                output.content.forEach((content) => {
                  if (content.type === "text") {
                    setConversations((prev) => {
                      // Check if this is already handled by streaming
                      const lastMessage = prev[prev.length - 1];
                      if (lastMessage && lastMessage.type === "assistant" && lastMessage.streaming) {
                        return prev.map((msg, index) => 
                          index === prev.length - 1 
                            ? { ...msg, content: content.text, streaming: false }
                            : msg
                        );
                      } else {
                        return [
                          ...prev,
                          {
                            id: crypto.randomUUID(),
                            type: "assistant",
                            content: content.text,
                            timestamp: new Date().toLocaleTimeString(),
                            isVoice: true, // Mark as voice-related response
                          },
                        ];
                      }
                    });
                  }
                });
              }
            });
          }
        } else if (event.type === "conversation.item.input_audio_transcription.completed") {
          // Handle voice input transcription
          console.log("🎤 Voice transcription completed:", event);
          console.log("🧑‍💼 Current mode:", currentMode, "isThirdPersonAdvisorMode:", isThirdPersonAdvisorMode);
          console.log("⏸️ Is listening paused:", isListeningPaused);
          
          // Skip processing if listening is paused
          if (isListeningPaused) {
            console.log("⏸️ Voice listening is paused, skipping transcription processing");
            return;
          }
          
          if (event.transcript) {
            console.log("📝 Transcript received:", event.transcript);
            
            // Estimate cost for input audio transcription (rough approximation)
            const transcriptTokens = Math.ceil(event.transcript.length / 4); // Rough estimate: 4 chars per token
            const inputAudioCost = transcriptTokens * 0.10 / 1000; // $0.10 per 1K input audio tokens
            
            // Update running cost estimate
            setTotalSessionCost(prev => prev + inputAudioCost);
            
            // Add to session costs for tracking
            const costData = {
              model: 'gpt-4o-realtime-preview',
              totalCost: inputAudioCost,
              timestamp: new Date().toISOString(),
              type: 'audio_transcription',
              breakdown: {
                input_audio_tokens: transcriptTokens,
              }
            };
            setSessionCosts(prev => [...prev, costData]);
            
            console.log("💬 Adding transcript to conversations...");
            setConversations((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                type: "user",
                content: event.transcript,
                timestamp: new Date().toLocaleTimeString(),
                isVoice: true,
              },
            ]);
            console.log("✅ Transcript added to conversations");
            
            // Analyze transcript for interview mode
            const interviewAnalysis = analyzeForInterview(event.transcript);
            
            // In Third Person Advisor Mode, store the conversation but don't auto-respond
            if (isThirdPersonAdvisorMode) {
              console.log("🧑‍💼 In Third Person Advisor mode - conversation stored, no auto-response");
              // Don't return early - let the conversation be stored above
              // Just skip the response generation logic below
            } else {
              // Check cost and response limits before allowing any response
              if (totalSessionCost >= costLimit) {
                console.log(`💰 Cost limit reached ($${costLimit}), blocking automatic responses`);
                setResponseBlocked(true);
                return;
              }
              
              if (responseCount >= maxResponsesPerSession) {
                console.log(`🔢 Response limit reached (${maxResponsesPerSession}), blocking automatic responses`);
                setResponseBlocked(true);
                return;
              }
              
              // Only trigger automatic response if not in interview mode or if interview analysis says not to respond
              const shouldAutoRespond = !isInterviewMode || (interviewAnalysis && !interviewAnalysis.shouldRespond);
              
              if (shouldAutoRespond && !responseBlocked) {
                // Increment response count
                setResponseCount(prev => prev + 1);
                
                // Trigger text-only response after transcription (only if not already generating)
                setTimeout(() => {
                  if (!isGeneratingResponse) {
                    console.log("🤖 Triggering text-only response for transcript:", event.transcript);
                    console.log("🔄 Setting isGeneratingResponse to true - shouldAutoResume:", shouldAutoResumeRef.current, "isListeningPaused:", isListeningPausedRef.current);
                    setIsGeneratingResponse(true);
                    const responseEvent = { 
                      type: "response.create",
                      response: {
                        modalities: ["text"],
                        max_output_tokens: 500
                      }
                    };
                    console.log("📤 Sending response.create event:", responseEvent);
                    sendClientEvent(responseEvent);
                  } else {
                    console.log("⏳ Response already being generated, skipping new response trigger");
                  }
                }, 100);
              } else if (responseBlocked) {
                console.log("🚫 Response blocked due to cost or response limits");
              } else if (isInterviewMode) {
                console.log("🎤 In interview mode - response handling managed by conversation analyzer");
              }
            }
          }
        } else if (event.type === "conversation.item.input_audio_transcription.failed") {
          console.error("❌ Voice transcription failed:", event);
        } else if (event.type === "conversation.item.created") {
          console.log("📝 Conversation item created:", event);
          // Check if this is an audio item that needs transcription
          if (event.item && event.item.type === "message" && event.item.role === "user") {
            const hasAudio = event.item.content && event.item.content.some(c => c.type === "input_audio");
            if (hasAudio) {
              console.log("🎵 Audio message detected, waiting for transcription...");
            }
          }
        } else if (event.type === "conversation.item.input_audio_transcription.partial") {
          // Handle partial voice transcription (real-time)
          console.log("Partial voice transcription:", event);
          if (event.transcript) {
            setConversations((prev) => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage && lastMessage.type === "user" && lastMessage.isPartial) {
                // Update existing partial message
                return prev.map((msg, index) => 
                  index === prev.length - 1 
                    ? { ...msg, content: event.transcript }
                    : msg
                );
              } else {
                // Start new partial message
                return [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    type: "user",
                    content: event.transcript,
                    timestamp: new Date().toLocaleTimeString(),
                    isVoice: true,
                    isPartial: true,
                  },
                ];
              }
            });
          }
        } else if (event.type === "input_audio_buffer.speech_started") {
          console.log("🎤 Speech started detected");
          setIsListening(true);
        } else if (event.type === "input_audio_buffer.speech_stopped") {
          console.log("🔇 Speech stopped detected");
          setIsListening(false);
          
          // Don't trigger response here - let the transcription complete first
        } else if (event.type === "response.created") {
          console.log("🤖 Response created:", event);
          console.log("🔄 Response generation started - shouldAutoResume:", shouldAutoResumeRef.current, "isListeningPaused:", isListeningPausedRef.current);
          setIsGeneratingResponse(true);
        } else if (event.type === "response.output_item.added") {
          console.log("📤 Response output item added:", event);
        } else if (event.type === "response.content_part.added") {
          console.log("📝 Response content part added:", event);
        } else if (event.type === "response.output_item.done") {
          console.log("✅ Response output item done:", event);
        } else if (event.type === "error") {
          console.error("❌ Error event:", event);
          console.error("❌ Error details:", event.error);
          if (event.error) {
            // Reset response generation flag on error
            setIsGeneratingResponse(false);
            
            // Don't show alert for "active response" errors as they're now handled
            if (event.error.type !== "invalid_request_error" || 
                !event.error.message?.includes("active response")) {
              alert(`API Error: ${event.error.type || 'Unknown'} - ${event.error.message || 'No message'}`);
            }
          }
        }
      };

      const handleOpen = () => {
        console.log("📡 Data channel open event received in useEffect");
        // Session state is now handled in the startSession function
      };

      // Add event listeners
      dataChannel.addEventListener("message", handleMessage);
      dataChannel.addEventListener("open", handleOpen);
    }
  }, [dataChannel, isGeneratingResponse]);

  // Reset the event listeners flag when session stops
  useEffect(() => {
    if (!isSessionActive) {
      eventListenersAttached.current = false;
    }
  }, [isSessionActive]);

  return (
    <div className="flex h-screen bg-gray-100 font-sans relative">
      {/* Top Navigation Bar */}
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center bg-white shadow-md z-10">
        <div className="flex items-center gap-4 w-full m-4 pb-2 border-0 border-b border-solid border-gray-200">
          <img style={{ width: "24px" }} src={logo} alt="OpenAI Logomark" />
          <h1 className="text-xl font-semibold text-gray-800">AI Realtime Console</h1>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col pt-16 pb-0 overflow-hidden">
        {/* Conversation Display */}
        <section className="flex-1 px-4 pt-4 pb-20 overflow-y-auto relative" ref={conversationContainerRef} onScroll={handleScroll}>
          {/* Voice Input Status Indicator */}
          {isSessionActive && isListeningPaused && (
            <div className="mb-4 p-3 rounded-lg border-l-4 border-l-yellow-500 bg-yellow-50">
              <div className="flex items-center gap-2">
                <span className="text-yellow-600 font-medium">⏸️ Voice Input Paused</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                  🔇 Not Hearing
                </span>
              </div>
              <p className="text-sm text-yellow-600 mt-1">Voice input is paused. Click the Resume button to continue listening.</p>
            </div>
          )}
          
          {/* Keyboard Shortcuts Help */}
          <div className="mb-4 p-3 rounded-lg border-l-4 border-l-gray-400 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">⌨️ Keyboard Shortcuts</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                🌐 Browser Focus Required
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1 space-y-1">
              <div><kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+S</kbd> - Start/Stop session</div>
              <div><kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+P</kbd> - Pause/Resume voice input</div>
              <div><kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+V</kbd> - Send clipboard content to AI (normal mode only)</div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              💡 Make sure the browser window is focused when using these shortcuts
            </div>
          </div>

          {/* Clipboard File POC */}
          <div className="mb-4">
            <button
              onClick={() => setShowClipboardPOC(!showClipboardPOC)}
              className="w-full text-left p-3 rounded-lg border-l-4 border-l-purple-400 bg-purple-50 hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-purple-600 font-medium">🧪 Clipboard File Access POC</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    Experimental
                  </span>
                </div>
                <span className="text-purple-600">
                  {showClipboardPOC ? '▼' : '▶'}
                </span>
              </div>
              <p className="text-sm text-purple-600 mt-1">Test clipboard file detection and monitoring</p>
            </button>
            
            {showClipboardPOC && (
              <div className="mt-2">
                <ClipboardFilePOC />
              </div>
            )}
          </div>

          {/* Current Mode Indicator */}
          {currentMode !== 'normal' && (
            <div className="mb-4 p-3 rounded-lg border-l-4 bg-opacity-50">
              {currentMode === 'interview' && (
                <div className="border-l-blue-500 bg-blue-50">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 font-medium">🎯 Interview Mode Active</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">AI will analyze conversation context and respond appropriately to interview questions.</p>
                </div>
              )}
              {currentMode === 'advisor' && (
                <div className="border-l-indigo-500 bg-indigo-50">
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-600 font-medium">🧑‍💼 Third Person Advisor Mode Active</span>
                    {isListening && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 animate-pulse">
                        🎧 Listening...
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-indigo-600 mt-1">AI is silently listening to your conversation. Send a text message to request advice.</p>
                  <div className="mt-2 text-xs text-indigo-500">
                    📊 Conversation messages captured: {conversations.filter(msg => msg.type === "user" && msg.isVoice).length}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex flex-col gap-4">
            {conversations.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                Start a conversation by speaking or uploading an image...
              </div>
            ) : (
              conversations.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-lg max-w-[80%] ${
                    msg.type === "user"
                      ? "bg-blue-100 ml-auto"
                      : msg.type === "system"
                      ? "bg-yellow-50 mx-auto border-2 border-yellow-200"
                      : "bg-gray-100 mr-auto"
                  }`}
                >
                  <div className={`p-3 rounded-lg ${
                    msg.type === "user" 
                      ? msg.isVoice 
                        ? "bg-blue-50 border-l-4 border-blue-400" 
                        : "bg-gray-50 border-l-4 border-gray-400"
                      : msg.type === "system"
                      ? "bg-yellow-100 border-l-4 border-yellow-500"
                      : "bg-green-50 border-l-4 border-green-400"
                  }`}>
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium">
                        {msg.type === "user" ? (
                          msg.isVoice ? "🎤 Voice" : msg.isClipboard ? "📋 Clipboard" : "💬 Text"
                        ) : msg.type === "system" ? (
                          "⚙️ System Prompt"
                        ) : (
                          "🤖 AI"
                        )}
                      </span>
                      {msg.isVoice && isThirdPersonAdvisorMode && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                          👂 Overheard
                        </span>
                      )}
                      {msg.streaming && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                          ⏳ Generating...
                        </span>
                      )}
                      {msg.isAnalyzing && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                          🔍 Analyzing...
                        </span>
                      )}
                      {msg.isAdviceRequest && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                          🧑‍💼 Advice Request
                        </span>
                      )}
                      <span>- {msg.timestamp}</span>
                    </div>
                  </div>
                  {msg.type === "assistant" ? (
                    <MarkdownMessage content={msg.content} isStreaming={msg.streaming} />
                  ) : msg.type === "system" ? (
                    <div className="text-sm text-gray-700 font-mono bg-gray-50 p-3 rounded border-l-4 border-yellow-400">
                      <div className="font-semibold text-yellow-700 mb-2">📋 Instructions being sent to AI:</div>
                      <pre className="whitespace-pre-wrap text-xs leading-relaxed">{msg.content}</pre>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {msg.hasImage && msg.imageData && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <img
                            src={msg.imageData}
                            alt={msg.imageName || "Uploaded image"}
                            className="max-w-full max-h-64 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow block mx-auto"
                            style={{ display: 'block', margin: '0 auto' }}
                            onClick={() => {
                              // Create modal to show full-size image
                              const modal = document.createElement('div');
                              modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
                              modal.onclick = () => modal.remove();
                              
                              const img = document.createElement('img');
                              img.src = msg.imageData;
                              img.className = 'max-w-full max-h-full object-contain';
                              img.onclick = (e) => e.stopPropagation();
                              
                              const closeBtn = document.createElement('button');
                              closeBtn.innerHTML = '×';
                              closeBtn.className = 'absolute top-4 right-4 text-white text-4xl hover:text-gray-300';
                              closeBtn.onclick = () => modal.remove();
                              
                              modal.appendChild(img);
                              modal.appendChild(closeBtn);
                              document.body.appendChild(modal);
                            }}
                          />
                          <p className="text-sm text-gray-600 mt-3 text-center">
                            📷 {msg.imageName || "Uploaded image"} - Click to view full size
                          </p>
                        </div>
                      )}
                      <div className="text-lg text-gray-800">{msg.content}</div>
                    </div>
                  )}
                </div>
              ))
            )}
            <div className="h-20" /> {/* Add some padding at the bottom for floating elements */}
          </div>
          

        </section>
      </main>

      {/* Floating Pause/Resume Button */}
      {isSessionActive && (
        <button
          onClick={toggleListeningPause}
          className={`fixed top-20 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-200 flex items-center gap-2 text-white font-medium ${
            isListeningPaused 
              ? 'bg-yellow-500 hover:bg-yellow-600' 
              : 'bg-gray-600 hover:bg-gray-700'
          }`}
          title={isListeningPaused ? 'Resume Voice Input (Ctrl+P)' : 'Pause Voice Input (Ctrl+P)'}
        >
          {isListeningPaused ? (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Resume</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Pause</span>
            </>
          )}
        </button>
      )}

      {/* Floating Image Upload Button */}
      <button
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
                      fileName: file.name,
                    },
                    `Please analyze this image: ${file.name}`
                  );
                };
                reader.readAsDataURL(file);
              }
            };
            input.click();
          }}
          className={`fixed z-50 p-3 rounded-full shadow-lg transition-all duration-200 flex items-center gap-2 text-white font-medium bg-teal-500 hover:bg-teal-600 ${
            isSessionActive ? 'top-36 right-4' : 'top-20 right-4'
          }`}
          title="Upload Image for Analysis"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">Image</span>
        </button>

      {/* Floating Controls (Outside main for fixed positioning relative to viewport) */}
      <SessionControls
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
        sendImageMessage={sendImageMessage}
        totalSessionCost={totalSessionCost}
        sessionCosts={sessionCosts}
        // Mode selector props
        currentMode={currentMode}
        isInterviewMode={isInterviewMode}
        toggleInterviewMode={toggleInterviewMode}
        isThirdPersonAdvisorMode={isThirdPersonAdvisorMode}
        toggleThirdPersonAdvisorMode={toggleThirdPersonAdvisorMode}
      />

      {/* Global Clipboard Display - shows when Ctrl+V is pressed anywhere */}
      <GlobalClipboardDisplay />

    </div>
  );
}
