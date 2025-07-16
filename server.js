import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import http from "http";
import { WebSocketServer } from "ws";
import { TextDecoder } from "util";
import "dotenv/config";

/* global setTimeout */

// Import the services from otherproject
import ClipboardService from "./services/clipboardService.js";
import ScreenshotService from "./services/screenshotService.js";
import KeyboardService from "./services/keyboardService.js";
import WebSocketService from "./services/websocketService.js";
import { SYSTEM_PROMPT_IMAGE_ANALYSIS } from "./services/prompts.js";

const app = express();
const port = process.env.PORT || 5173;
const apiKey = process.env.OPENAI_API_KEY;

// Create HTTP server for both Express and WebSocket
const server = http.createServer(app);

// Initialize services
const clipboardService = new ClipboardService();
const screenshotService = new ScreenshotService();
const keyboardService = new KeyboardService();
const websocketService = new WebSocketService(server);

// Add JSON parsing middleware
app.use(express.json({ limit: '10mb' }));

// Browser-based keyboard shortcuts only
console.log("⌨️  Browser keyboard shortcuts available:");
console.log("   Ctrl+R - Start/Stop session (when browser is focused)");
console.log("   Ctrl+P - Pause/Resume voice input (when browser is focused)");
console.log("   Ctrl+V - Send clipboard content to AI (when browser is focused)");

console.log("🌐 Global keyboard shortcuts available:");
console.log("   Ctrl+S - Capture screenshot and analyze with AI (global)");

// Configure Vite middleware for React client
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
  clearScreen: false,
});
app.use(vite.middlewares);

// Handle .well-known requests (often from browsers/extensions)
app.get("/.well-known/*", (req, res) => {
  res.status(404).send("Not found");
});

// Add cache control for development and security headers for microphone access
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Add security headers for microphone/camera access on local network
  res.setHeader('Permissions-Policy', 'microphone=*, camera=*');
  res.setHeader('Feature-Policy', 'microphone *; camera *');
  
  // Add CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  next();
});

// API route for token generation
app.get("/token", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2025-06-03",
          voice: "alloy",
          instructions: "You are a helpful assistant that responds only in text format. You can analyze images and hear voice input, but always respond with text only. When you hear voice input, first acknowledge what you heard, then provide your response.",
          input_audio_format: "pcm16",
          output_audio_format: "pcm16", // Required format, but we'll disable audio in session
          input_audio_transcription: {
            model: "whisper-1"
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          },
          tools: [],
          tool_choice: "auto",
          temperature: 0.8,
          max_response_output_tokens: 4096
        }),
      },
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// API endpoint for image analysis using Chat Completions API with conversation context - STREAMING VERSION
app.post('/api/analyze-image', async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  console.log(`🚀 [${requestId}] Starting STREAMING image analysis request at ${new Date().toISOString()}`);
  console.log(`📊 [${requestId}] Request size: ${JSON.stringify(req.body).length} bytes`);
  
  // Set up SSE headers for streaming
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Helper function to send SSE data
  const sendSSE = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { text, image, conversationHistory } = req.body;
    
    if (!text || !image) {
      console.log(`❌ [${requestId}] Missing required data - text: ${!!text}, image: ${!!image}`);
      sendSSE('error', { error: 'Missing text or image data', requestId });
      res.end();
      return;
    }

    sendSSE('status', { message: 'Starting image analysis...', requestId, timestamp: new Date().toISOString() });

    console.log(`🖼️ [${requestId}] Analyzing image with Chat Completions API (with context)...`);
    console.log(`📝 [${requestId}] Text prompt: "${text}"`);
    console.log(`📷 [${requestId}] Image data length: ${image.length} characters`);
    console.log(`💬 [${requestId}] Conversation history items: ${conversationHistory?.length || 0}`);
    
    // Build conversation context from history
    const messages = [];
    
    // Add system message for consistency with Realtime API
    messages.push({
      role: 'system',
      content: SYSTEM_PROMPT_IMAGE_ANALYSIS
    });
    
    sendSSE('status', { message: 'Building conversation context...', requestId });
    
    // Add conversation history for context
    if (conversationHistory && conversationHistory.length > 0) {
      console.log(`📚 [${requestId}] Adding ${conversationHistory.length} messages for context`);
      conversationHistory.forEach((msg, index) => {
        console.log(`📝 [${requestId}] Context message ${index + 1}: ${msg.type} - "${msg.content?.substring(0, 100)}${msg.content?.length > 100 ? '...' : ''}"`);
        if (msg.type === 'user') {
          messages.push({
            role: 'user',
            content: msg.content
          });
        } else if (msg.type === 'assistant') {
          messages.push({
            role: 'assistant',
            content: msg.content
          });
        }
      });
    } else {
      console.log(`📚 [${requestId}] No conversation history provided`);
    }
    
    // Add current image message
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: text
        },
        {
          type: 'image_url',
          image_url: {
            url: image
          }
        }
      ]
    });
    
    sendSSE('status', { message: 'Sending request to OpenAI...', requestId });
    
    // Prepare the request payload with streaming enabled
    const requestPayload = {
      model: 'gpt-4o', // Use gpt-4o for better image analysis quality (same cost as gpt-4o-mini for images)
      messages: messages,
      max_completion_tokens: 16384, // Maximum supported by gpt-4o
      stream: true // Enable streaming
    };
    
    console.log(`📤 [${requestId}] Sending STREAMING request to OpenAI API...`);
    console.log(`🔧 [${requestId}] Model: ${requestPayload.model}`);
    console.log(`📊 [${requestId}] Messages count: ${messages.length}`);
    console.log(`🎯 [${requestId}] Max completion tokens: ${requestPayload.max_completion_tokens}`);
    console.log(`🔄 [${requestId}] Streaming enabled: ${requestPayload.stream}`);
    
    const apiRequestStart = Date.now();
    
    // Use Chat Completions API for image analysis with streaming
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });
    
    const apiRequestTime = Date.now() - apiRequestStart;
    console.log(`⏱️ [${requestId}] OpenAI API streaming request initiated in ${apiRequestTime}ms`);
    console.log(`📡 [${requestId}] Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.log(`❌ [${requestId}] OpenAI API error response`);
      const errorData = await response.text();
      console.error(`❌ [${requestId}] Chat Completions API error:`, errorData);
      
      sendSSE('error', { error: 'Failed to analyze image', details: errorData, requestId });
      res.end();
      return;
    }

    sendSSE('status', { message: 'Receiving streamed response from OpenAI...', requestId });

    // Stream the response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullAnalysis = '';
    let totalUsage = null;
    let chunkCount = 0;

    console.log(`🔄 [${requestId}] Starting to read streaming response...`);

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log(`✅ [${requestId}] Streaming completed after ${chunkCount} chunks`);
          break;
        }

        chunkCount++;
        console.log(`📦 [${requestId}] Received chunk ${chunkCount}, size: ${value?.length || 0} bytes`);

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        console.log(`📝 [${requestId}] Chunk content preview: "${chunk.substring(0, 100)}${chunk.length > 100 ? '...' : ''}"`);

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        console.log(`📋 [${requestId}] Processing ${lines.length} lines from chunk ${chunkCount}`);

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          console.log(`📄 [${requestId}] Processing line: "${line}"`);
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              console.log(`🏁 [${requestId}] Stream completed with [DONE] signal`);
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              console.log(`🔍 [${requestId}] Parsed data:`, JSON.stringify(parsed, null, 2));
              
              if (parsed.choices && parsed.choices[0]) {
                const delta = parsed.choices[0].delta;
                
                if (delta.content) {
                  // Stream the content chunk to frontend
                  fullAnalysis += delta.content;
                  console.log(`📤 [${requestId}] Sending content chunk: "${delta.content}"`);
                  sendSSE('chunk', { 
                    content: delta.content, 
                    requestId,
                    timestamp: new Date().toISOString()
                  });
                }
              }

              // Capture usage information if available
              if (parsed.usage) {
                totalUsage = parsed.usage;
                console.log(`📊 [${requestId}] Final usage:`, totalUsage);
              }

            } catch (parseError) {
              console.error(`❌ [${requestId}] Error parsing streaming data:`, parseError);
              console.error(`❌ [${requestId}] Raw data that failed to parse: "${data}"`);
            }
          }
        }
      }
    } catch (streamError) {
      console.error(`❌ [${requestId}] Error reading stream:`, streamError);
      sendSSE('error', { error: 'Error reading stream', details: streamError.message, requestId });
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ [${requestId}] Streaming image analysis completed in ${totalTime}ms`);
    console.log(`📝 [${requestId}] Final analysis length: ${fullAnalysis?.length || 0} characters`);
    
    // Calculate cost for the request
    const calculateCost = (usage) => {
      if (!usage) return null;
      
      const pricing = {
        'gpt-4o': {
          input: 0.0025,   // $2.50 per 1M input tokens
          output: 0.01,    // $10.00 per 1M output tokens
        }
      };
      
      const model = 'gpt-4o';
      const p = pricing[model];
      
      const inputCost = (usage.prompt_tokens || 0) * p.input / 1000;
      const outputCost = (usage.completion_tokens || 0) * p.output / 1000;
      
      return {
        model,
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost,
        usage: {
          prompt_tokens: usage.prompt_tokens || 0,
          completion_tokens: usage.completion_tokens || 0,
          total_tokens: usage.total_tokens || 0,
        }
      };
    };
    
    const costInfo = totalUsage ? calculateCost(totalUsage) : null;
    if (costInfo) {
      console.log(`💰 [${requestId}] Total cost: $${costInfo.totalCost.toFixed(4)}`);
    }
    
    // Send completion event with final data
    sendSSE('complete', { 
      analysis: fullAnalysis,
      usage: totalUsage,
      cost: costInfo,
      requestId,
      duration: totalTime,
      timestamp: new Date().toISOString()
    });
    
    // End the SSE connection
    res.end();
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] Error in streaming image analysis after ${totalTime}ms:`, error);
    console.error(`❌ [${requestId}] Error stack:`, error.stack);
    
    sendSSE('error', { 
      error: 'Internal server error',
      requestId: requestId,
      duration: totalTime,
      details: error.message
    });
    
    res.end();
  }
});

// API endpoint for Chat Completions - for text-only communication without active session
app.post('/api/chat-completions', async (req, res) => {
  const requestId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  console.log(`💬 [${requestId}] Starting chat completions request at ${new Date().toISOString()}`);
  
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log(`❌ [${requestId}] Missing or invalid messages array`);
      return res.status(400).json({ error: 'Messages array is required' });
    }

    console.log(`📝 [${requestId}] Processing ${messages.length} messages`);
    console.log(`📝 [${requestId}] Last message: "${messages[messages.length - 1]?.content?.substring(0, 100)}..."`);
    
    const requestPayload = {
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 200000,
      temperature: 0.7,
      stream: true
    };
    
    console.log(`📡 [${requestId}] Sending request to OpenAI Chat Completions API...`);
    const apiRequestStart = Date.now();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });
    
    const apiRequestTime = Date.now() - apiRequestStart;
    console.log(`⏱️ [${requestId}] OpenAI API request completed in (chat-completions) ${apiRequestTime}ms`);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ [${requestId}] Chat Completions API error:`, errorData);
      return res.status(response.status).json({ error: 'Failed to get chat response' });
    }

    // Set up Server-Sent Events for streaming
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    let fullResponse = '';
    let usage = null;
    
    // Process the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              console.log(`✅ [${requestId}] Streaming completed`);
              res.write(`data: ${JSON.stringify({ type: 'done', usage, requestId })}\n\n`);
              res.end();
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.choices && parsed.choices[0]) {
                const choice = parsed.choices[0];
                
                if (choice.delta && choice.delta.content) {
                  const content = choice.delta.content;
                  fullResponse += content;
                  
                  // Send the chunk to client
                  res.write(`data: ${JSON.stringify({ 
                    type: 'chunk', 
                    content: content,
                    requestId 
                  })}\n\n`);
                }
                
                if (choice.finish_reason === 'stop') {
                  usage = parsed.usage;
                }
              }
            } catch (parseError) {
              // Skip malformed JSON chunks
              continue;
            }
          }
        }
      }
    } catch (streamError) {
      console.error(`❌ [${requestId}] Streaming error:`, streamError);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: 'Streaming failed',
        requestId 
      })}\n\n`);
      res.end();
    }
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] Error in chat completions after ${totalTime}ms:`, error);
    
    res.status(500).json({ 
      error: 'Internal server error',
      requestId: requestId,
      duration: totalTime
    });
  }
});

// Add WebSocket API routes
// Set API key for services
app.post('/api/set-openai-key', (req, res) => {
  const { apiKey } = req.body;
  if (apiKey) {
    process.env.OPENAI_API_KEY = apiKey;
    res.json({ success: true, message: 'OpenAI API key updated' });
  } else {
    res.json({ success: false, message: 'API key is required' });
  }
});

// Add IP to target list
app.post('/api/add-ip', (req, res) => {
  const { ip } = req.body;
  if (websocketService.addTargetIP(ip)) {
    res.json({ success: true, message: `IP ${ip} added to target list` });
  } else {
    res.json({ success: false, message: 'Invalid IP or IP already exists' });
  }
});

// Remove IP from target list
app.post('/api/remove-ip', (req, res) => {
  const { ip } = req.body;
  if (websocketService.removeTargetIP(ip)) {
    res.json({ success: true, message: `IP ${ip} removed from target list` });
  } else {
    res.json({ success: false, message: 'IP not found in target list' });
  }
});

// Get current IP list and connections
app.get('/api/ips', (req, res) => {
  const status = websocketService.getStatus();
  res.json(status);
});

// Send custom message
app.post('/api/send-message', (req, res) => {
  const { message } = req.body;
  if (message) {
    const count = websocketService.broadcastToTargets({ 
      type: 'custom', 
      message,
      timestamp: new Date().toISOString()
    });
    res.json({ 
      success: true, 
      message: `Message sent to ${count} connected clients` 
    });
  } else {
    res.json({ success: false, message: 'Message is required' });
  }
});

// Keyboard listening controls
app.post('/api/start-listening', (req, res) => {
  keyboardService.startListening();
  res.json({ success: true, message: 'Keyboard listening started' });
});

app.post('/api/stop-listening', (req, res) => {
  keyboardService.stopListening();
  res.json({ success: true, message: 'Keyboard listening stopped' });
});

// Clipboard operations
app.get('/api/clipboard', (req, res) => {
  try {
    const content = clipboardService.readClipboard();
    res.json({ 
      success: true, 
      content: content || '',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({ 
      success: false, 
      message: 'Error reading clipboard',
      error: error.message 
    });
  }
});

app.post('/api/clipboard', (req, res) => {
  const { text } = req.body;
  try {
    const success = clipboardService.writeClipboard(text);
    if (success) {
      // Broadcast clipboard update to all clients
      websocketService.broadcastToTargets({
        type: 'clipboard_update',
        content: text,
        timestamp: new Date().toISOString()
      });
      res.json({ success: true, message: 'Text copied to clipboard' });
    } else {
      res.json({ success: false, message: 'Failed to copy to clipboard' });
    }
  } catch (error) {
    res.json({ 
      success: false, 
      message: 'Error writing to clipboard',
      error: error.message 
    });
  }
});

// Trigger screenshot and AI analysis
app.post('/api/capture-screenshot', async (req, res) => {
  try {
    console.log('📸 Screenshot API endpoint triggered');
    
    res.json({ 
      success: true, 
      message: 'Screenshot capture initiated',
      timestamp: new Date().toISOString() 
    });
    
    // Trigger screenshot capture and analysis
    await handleScreenshotAndAnalysis('api');
  } catch (error) {
    console.error('Screenshot API error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Manual trigger for keyboard shortcuts (for testing)
app.post('/api/trigger-shortcut', (req, res) => {
  const { keyCombo } = req.body;
  
  try {
    if (keyCombo === 'Ctrl+S') {
      keyboardService.triggerCtrlS();
      res.json({ 
        success: true, 
        message: 'Ctrl+S triggered manually',
        keyCombo: keyCombo 
      });
    } else {
      // Parse the key combination
      const isCtrl = keyCombo.includes('Ctrl+');
      const isCmd = keyCombo.includes('Cmd+');
      const keyName = keyCombo.split('+').pop().toLowerCase();
      
      keyboardService.triggerKeyCombination(keyCombo, {
        ctrl: isCtrl,
        meta: isCmd,
        name: keyName
      });
      
      res.json({ 
        success: true, 
        message: `${keyCombo} triggered manually`,
        keyCombo: keyCombo 
      });
    }
  } catch (error) {
    console.error('Manual trigger error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  const status = websocketService.getStatus();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      websocket: {
        targetIPs: status.targetIPs.length,
        activeConnections: status.connectionCount
      },
      keyboard: {
        listening: keyboardService.isActive()
      },
      openai: {
        configured: !!process.env.OPENAI_API_KEY
      }
    }
  });
});

// Screenshot and analysis handler function
async function handleScreenshotAndAnalysis(keyCombo) {
  try {
    console.log('Ctrl+S pressed - Capturing screenshot...');
    
    // Capture screenshot and get base64 data
    const screenshotData = await screenshotService.captureAndReturnBase64();
    console.log("\n\n\n\n🚀 ~ handleScreenshotAndAnalysis ~ screenshotData:", screenshotData)
    
    // Send screenshot to all connected clients
    websocketService.broadcastToTargets({
      type: 'screenshot',
      keyCombo: keyCombo,
      imagePath: screenshotData.imagePath,
      imageData: screenshotData.base64Data,
      timestamp: screenshotData.timestamp
    });
    
    // Process screenshot with OpenAI if configured
    if (process.env.OPENAI_API_KEY) {
      console.log('🤖 Processing screenshot with OpenAI Vision API...');
      
      // Prepare image analysis request
      const analysisResponse = await fetch('http://localhost:' + port + '/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: SYSTEM_PROMPT_IMAGE_ANALYSIS,
          image: `data:image/jpeg;base64,${screenshotData.base64Data}`,
          conversationHistory: []
        })
      });
      
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        
        // Send AI analysis to clients
        websocketService.broadcastToTargets({
          type: 'ai_analysis_complete',
          analysis: analysisData.analysis,
          usage: analysisData.usage,
          cost: analysisData.cost,
          timestamp: new Date().toISOString()
        });
        
        console.log('✅ AI analysis completed and sent to clients');
      } else {
        throw new Error('Failed to analyze screenshot');
      }
    } else {
      console.log('⚠️ OpenAI API key not configured - skipping AI analysis');
      websocketService.broadcastToTargets({
        type: 'ai_analysis_error',
        error: 'OpenAI API key not configured',
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Error processing screenshot:', error);
    websocketService.broadcastToTargets({
      type: 'screenshot_error',
      error: error.message,
      keyCombo: keyCombo,
      timestamp: new Date().toISOString()
    });
  }
}

// Setup event handlers for services
keyboardService.on('keypress', (data) => {
  handleKeypress(data);
});

websocketService.on('clipboard_request', (data) => {
  const content = clipboardService.readClipboard();
  websocketService.broadcastToTargets({
    type: 'clipboard_content',
    content: content || '',
    timestamp: new Date().toISOString()
  });
});

// Setup clipboard monitoring
clipboardService.monitorClipboard((content) => {
  if (content && typeof content === 'string') {
    console.log('Clipboard changed:', content.substring(0, 50) + (content.length > 50 ? '...' : ''));
    websocketService.broadcastToTargets({
      type: 'clipboard_update',
      content: content,
      timestamp: new Date().toISOString()
    });
  }
}, 2000); // Check every 2 seconds

async function handleKeypress(data) {
  const { keyCombo, timestamp } = data;
  
  // Special handling for Ctrl+S - screenshot and AI analysis
  if (keyCombo === 'Ctrl+S') {
    await handleScreenshotAndAnalysis(keyCombo);
  } else {
    // Send keyboard shortcut event for all other Ctrl/Cmd combinations
    console.log(`⌨️ Broadcasting keyboard shortcut: ${keyCombo}`);
    websocketService.broadcastToTargets({
      type: 'keyboard_shortcut',
      keyCombo: keyCombo,
      timestamp: timestamp
    });
  }
}

// Auto-start keyboard listening
keyboardService.startListening();

// Add some example IPs after startup
setTimeout(() => {
  websocketService.addTargetIP('192.168.1.100');
  websocketService.addTargetIP('192.168.1.101');
  console.log('Example IPs added to target list');
}, 1000);

// Serve the React client (client-side only, no SSR)
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;

  try {
    const template = await vite.transformIndexHtml(
      url,
      fs.readFileSync("./client/index.html", "utf-8"),
    );
    // Simply serve the template without SSR
    const html = template.replace(`<!--ssr-outlet-->`, `<div id="root"></div>`);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    next(e);
  }
});

// Graceful shutdown handlers
process.on('SIGINT', () => {
  console.log('\n🛑 Gracefully shutting down...');
  keyboardService.stopListening();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Gracefully shutting down...');
  keyboardService.stopListening();
  process.exit(0);
});

server.listen(port, () => {
  console.log(`Express server running on *:${port}`);
  console.log(`Voice-to-Text AI Assistant ready!`);
  console.log(`Nodemon auto-restart enabled for development`);
  console.log('');
  console.log('🚀 WebSocket server running on the same port');
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST /api/set-openai-key - Set OpenAI API key');
  console.log('  POST /api/add-ip - Add IP to target list');
  console.log('  POST /api/remove-ip - Remove IP from target list');
  console.log('  GET  /api/ips - Get current IP list');
  console.log('  POST /api/send-message - Send custom message');
  console.log('  POST /api/start-listening - Start keyboard listening');
  console.log('  POST /api/stop-listening - Stop keyboard listening');
  console.log('  GET  /api/clipboard - Read clipboard content');
  console.log('  POST /api/clipboard - Write to clipboard');
  console.log('  POST /api/capture-screenshot - Capture screenshot and analyze');
  console.log('  GET  /api/health - Health check');
  console.log(`  WebSocket endpoint: ws://localhost:${port}`);
  console.log('');
  console.log('🔧 Features:');
  console.log('  📸 Screenshot: Press Ctrl+S to capture screen and get AI analysis');
  console.log('  📋 Clipboard: Real-time monitoring and sync');
  console.log('  🔑 Set OpenAI API key via POST /api/set-openai-key or OPENAI_API_KEY env var');
  console.log('');
});
