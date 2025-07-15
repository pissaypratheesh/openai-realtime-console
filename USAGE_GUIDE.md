# Voice-to-Text AI Assistant - Usage Guide

## ✅ **Your Application is Ready!**

Your Voice-to-Text AI Assistant is now properly configured with the latest OpenAI Realtime API model (`gpt-4o-realtime-preview-2024-12-17`) and should work correctly.

## 🚀 **How to Use**

### 1. **Start the Application**
```bash
npm run dev
```
Then open http://localhost:3000 in your browser.

### 2. **Start a Session**
- Click the **"Start Session"** button
- Wait for the connection to establish (you'll see "Session Active" when ready)

### 3. **Voice Input (Speech-to-Text)**
- Click **"Start Listening"** to begin voice input
- **Speak clearly** into your microphone
- The AI will:
  - 🎤 Detect when you start speaking
  - 📝 Transcribe your speech to text
  - 🤖 Respond with text (no audio output)
  - Display both your transcribed speech and the AI's response

### 4. **Image Analysis**
- **Drag and drop** an image onto the right panel
- Or click **"Choose File"** to select an image
- Click **"Analyze"** to send the image to the AI
- The AI will analyze the image and respond with text

### 5. **Debug Information**
- Check the **browser console** (F12) for detailed event logs
- The **Debug Events** panel shows recent API events
- Look for these key events:
  - `🎤 Speech started detected`
  - `🔇 Speech stopped detected`
  - `📝 Conversation item created`
  - `🤖 Response created`

## 🔧 **Troubleshooting**

### If Voice Input Doesn't Work:

1. **Check Browser Permissions**
   - Allow microphone access when prompted
   - Check browser settings for microphone permissions

2. **Check Console for Errors**
   - Open browser console (F12)
   - Look for error messages
   - Should see: `"🎤 Speech started detected"` when you speak

3. **Verify Session is Active**
   - Make sure you see "Session Active" status
   - The "Start Listening" button should be available

4. **Check Audio Input**
   - Test your microphone in other applications
   - Ensure microphone is not muted
   - Try speaking louder and clearer

### If No Response from AI:

1. **Check API Key**
   - Ensure `OPENAI_API_KEY` is set in your environment
   - Verify the API key is valid and has credits

2. **Check Network**
   - Ensure internet connection is stable
   - Check browser network tab for failed requests

3. **Check Events**
   - Look for `response.text.delta` events in console
   - Should see streaming text responses

## 📋 **What You Should See**

### Successful Voice Interaction:
1. Click "Start Listening"
2. Speak: "Hello, can you help me?"
3. Console shows: `🎤 Speech started detected`
4. Console shows: `🔇 Speech stopped detected`
5. Console shows: `📝 Conversation item created`
6. Your speech appears as text in the conversation
7. AI responds with text

### Successful Image Analysis:
1. Drag an image to the right panel
2. Click "Analyze"
3. Image indicator appears in conversation
4. AI responds with image analysis in text

## 🎯 **Key Features Working**

- ✅ **Voice Input**: Microphone → Speech Recognition → Text
- ✅ **Text Output**: AI responses in text only (no audio)
- ✅ **Image Analysis**: Upload images for AI analysis
- ✅ **Real-time**: Streaming text responses
- ✅ **Debug Info**: Console logging and event panel

## 🆘 **Still Having Issues?**

If the application still doesn't work:

1. **Restart the server**: `npm run dev`
2. **Clear browser cache** and reload
3. **Check the browser console** for specific error messages
4. **Verify your OpenAI API key** has sufficient credits
5. **Try a different browser** (Chrome/Firefox recommended)

The application is now properly configured with the latest model and should work as expected! 