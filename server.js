import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;

// Add JSON parsing middleware
app.use(express.json({ limit: '10mb' }));

// Browser-based keyboard shortcuts only
console.log("⌨️  Browser keyboard shortcuts available:");
console.log("   Ctrl+S - Start/Stop session (when browser is focused)");
console.log("   Ctrl+P - Pause/Resume voice input (when browser is focused)");
console.log("   Ctrl+V - Send clipboard content to AI (when browser is focused)");

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

// Add cache control for development
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
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

// API endpoint for image analysis using Chat Completions API with conversation context
app.post('/api/analyze-image', async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  console.log(`🚀 [${requestId}] Starting image analysis request at ${new Date().toISOString()}`);
  console.log(`📊 [${requestId}] Request size: ${JSON.stringify(req.body).length} bytes`);
  
  try {
    const { text, image, conversationHistory } = req.body;
    
    if (!text || !image) {
      console.log(`❌ [${requestId}] Missing required data - text: ${!!text}, image: ${!!image}`);
      return res.status(400).json({ error: 'Missing text or image data' });
    }

    console.log(`🖼️ [${requestId}] Analyzing image with Chat Completions API (with context)...`);
    console.log(`📝 [${requestId}] Text prompt: "${text}"`);
    console.log(`📷 [${requestId}] Image data length: ${image.length} characters`);
    console.log(`💬 [${requestId}] Conversation history items: ${conversationHistory?.length || 0}`);
    
    // Build conversation context from history
    const messages = [];
    
    // Add system message for consistency with Realtime API
    messages.push({
      role: 'system',
      content: `Analyze this image and respond based on category:
                CODING QUESTION: Provide JavaScript solution with:

                 - Brute force approach (code + time/space complexity)
                 - Optimized approach (code + time/space complexity + algorithm explanation)
                 - How the optimal algorithm works conceptually
                 - Sample input data walkthrough step-by-step
                 - Example I/O demonstration

                OTHER QUESTION: Answer comprehensively in relevant context
                NO QUESTION: Describe image content + predict next logical step/progression if visible
                Be detailed, technical, and complete in explanations.`
        });
    
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
    
    // Prepare the request payload
    const requestPayload = {
      model: 'o4-mini', // Use o4-mini for image analysis (reasoning model)
      messages: messages,
      max_completion_tokens: 25000 // Increased significantly for reasoning models that need extra tokens for internal reasoning
      // Note: temperature parameter removed as o4-mini only supports default value of 1
    };
    
    console.log(`📤 [${requestId}] Sending request to OpenAI API...`);
    console.log(`🔧 [${requestId}] Model: ${requestPayload.model}`);
    console.log(`📊 [${requestId}] Messages count: ${messages.length}`);
    console.log(`🎯 [${requestId}] Max completion tokens: ${requestPayload.max_completion_tokens}`);
    
    // LOG THE EXACT PROMPT BEING SENT
    console.log(`📝 [${requestId}] === EXACT PROMPT BEING SENT ===`);
    messages.forEach((msg, index) => {
      console.log(`📝 [${requestId}] Message ${index + 1} (${msg.role}):`);
      if (typeof msg.content === 'string') {
        console.log(`📝 [${requestId}]   Content: "${msg.content}"`);
      } else if (Array.isArray(msg.content)) {
        msg.content.forEach((item, itemIndex) => {
          if (item.type === 'text') {
            console.log(`📝 [${requestId}]   Text ${itemIndex + 1}: "${item.text}"`);
          } else if (item.type === 'image_url') {
            console.log(`📝 [${requestId}]   Image ${itemIndex + 1}: ${item.image_url.url.substring(0, 50)}...`);
          }
        });
      }
    });
    console.log(`📝 [${requestId}] === END EXACT PROMPT ===`);
    
    const apiRequestStart = Date.now();
    
    // Use Chat Completions API for image analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload)
    });
    
    const apiRequestTime = Date.now() - apiRequestStart;
    console.log(`⏱️ [${requestId}] OpenAI API request completed in ${apiRequestTime}ms`);
    console.log(`📡 [${requestId}] Response status: ${response.status} ${response.statusText}`);
    console.log(`📋 [${requestId}] Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.log(`❌ [${requestId}] OpenAI API error response`);
      const errorData = await response.text();
      console.error(`❌ [${requestId}] Chat Completions API error:`, errorData);
      console.log(`📊 [${requestId}] Error response length: ${errorData.length} characters`);
      
      const totalTime = Date.now() - startTime;
      console.log(`⏱️ [${requestId}] Total request time (with error): ${totalTime}ms`);
      
      return res.status(response.status).json({ error: 'Failed to analyze image' });
    }

    console.log(`✅ [${requestId}] Parsing response JSON...`);
    const parseStart = Date.now();
    const data = await response.json();
    const parseTime = Date.now() - parseStart;
    
    console.log(`📊 [${requestId}] JSON parsing completed in ${parseTime}ms`);
    console.log(`📝 [${requestId}] Response structure:`, {
      id: data.id,
      object: data.object,
      model: data.model,
      choices_count: data.choices?.length,
      usage: data.usage
    });
    
    if (!data.choices || data.choices.length === 0) {
      console.error(`❌ [${requestId}] No choices in response:`, data);
      return res.status(500).json({ error: 'No analysis result received' });
    }
    
    const analysis = data.choices[0].message.content;
    console.log(`📝 [${requestId}] Analysis content length: ${analysis?.length || 0} characters`);
    console.log(`📝 [${requestId}] Analysis preview: "${analysis?.substring(0, 200)}${analysis?.length > 200 ? '...' : ''}"`);
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ [${requestId}] Image analysis completed with context in ${totalTime}ms`);
    console.log(`📊 [${requestId}] Token usage:`, data.usage);
    
    // Calculate cost for the request
    const calculateCost = (usage) => {
      const pricing = {
        'o1-mini': {
          input: 0.003,
          output: 0.012,
          reasoning: 0.003,
        }
      };
      
      const model = 'o1-mini';
      const p = pricing[model];
      
      const inputCost = (usage.prompt_tokens || 0) * p.input / 1000;
      const outputCost = (usage.completion_tokens || 0) * p.output / 1000;
      const reasoningCost = (usage.reasoning_tokens || 0) * p.reasoning / 1000;
      
      return {
        model,
        inputCost,
        outputCost,
        reasoningCost,
        totalCost: inputCost + outputCost + reasoningCost,
        usage: {
          prompt_tokens: usage.prompt_tokens || 0,
          completion_tokens: usage.completion_tokens || 0,
          reasoning_tokens: usage.reasoning_tokens || 0,
          total_tokens: usage.total_tokens || 0,
        }
      };
    };
    
    const costInfo = calculateCost(data.usage);
    console.log(`💰 [${requestId}] Cost: $${costInfo.totalCost.toFixed(4)}`);
    
    res.json({ 
      analysis,
      usage: data.usage,
      cost: costInfo
    });
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ [${requestId}] Error in image analysis after ${totalTime}ms:`, error);
    console.error(`❌ [${requestId}] Error stack:`, error.stack);
    console.error(`❌ [${requestId}] Error name:`, error.name);
    console.error(`❌ [${requestId}] Error message:`, error.message);
    
    res.status(500).json({ 
      error: 'Internal server error',
      requestId: requestId,
      duration: totalTime
    });
  }
});

// Render the React client
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;

  try {
    const template = await vite.transformIndexHtml(
      url,
      fs.readFileSync("./client/index.html", "utf-8"),
    );
    const { render } = await vite.ssrLoadModule("./client/entry-server.jsx");
    const appHtml = await render(url);
    const html = template.replace(`<!--ssr-outlet-->`, appHtml?.html);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite.ssrFixStacktrace(e);
    next(e);
  }
});

app.listen(port, () => {
  console.log(`Express server running on *:${port}`);
  console.log(`Voice-to-Text AI Assistant ready!`);
  console.log(`Nodemon auto-restart enabled for development`);
});
