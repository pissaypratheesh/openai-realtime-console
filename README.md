# Voice-to-Text AI Assistant

This is a modified version of the OpenAI Realtime Console that implements a **Voice-to-Text AI Assistant**. The application allows users to speak to the AI and receive text responses, with additional support for image analysis.

## Features

- 🎤 **Voice Input**: Speak to the AI using your microphone
- 📝 **Text Output**: AI responds only in text format (no audio output)
- 🖼️ **Image Analysis**: Drag and drop images for AI analysis
- 💬 **Conversation History**: View your complete conversation with the AI
- 🔄 **Real-time Processing**: Uses OpenAI's Realtime API with WebRTC

## Key Changes from Original

This implementation differs from the original OpenAI Realtime Console:

1. **Audio Output Disabled**: AI responses are text-only
2. **Voice Input Only**: Primary interaction is through voice
3. **Image Upload**: Drag and drop image analysis capability
4. **Conversation UI**: Clean chat interface showing conversation history
5. **Voice/Image Indicators**: Visual indicators for voice input and image uploads

## Installation and Usage

Before you begin, you'll need an OpenAI API key - [create one in the dashboard here](https://platform.openai.com/settings/api-keys). Create a `.env` file from the example file and set your API key in there:

```bash
cp .env.example .env
```

Running this application locally requires [Node.js](https://nodejs.org/) to be installed. Install dependencies for the application with:

```bash
npm install
```

Start the application server with:

```bash
npm run dev
```

This should start the Voice-to-Text AI Assistant on [http://localhost:3000](http://localhost:3000).

## How to Use

1. **Start a Session**: Click "Start Session" to begin
2. **Voice Input**: Click "Start Listening" and speak to the AI
3. **Image Analysis**: Drag and drop images to the right panel and click "Analyze"
4. **View Conversation**: Your conversation history appears in the main panel
5. **Debug**: View raw API events in the debug panel at the bottom right

## Technical Implementation

- **Frontend**: React with Vite for fast development
- **Backend**: Express.js server for API token management
- **AI Model**: OpenAI GPT-4o Realtime API (2024-12-17)
- **Audio Processing**: WebRTC for real-time voice input
- **Image Processing**: Base64 encoding for image analysis
- **Styling**: Tailwind CSS for responsive UI

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Voice    │───▶│   WebRTC Client  │───▶│  OpenAI API     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Image Upload  │───▶│   React UI       │◀───│  Text Response  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## File Structure

```
client/
├── components/
│   ├── App.jsx              # Main application component
│   ├── SessionControls.jsx  # Voice input controls
│   ├── ImageUpload.jsx      # Image drag & drop component
│   ├── EventLog.jsx         # Debug event logging
│   └── Button.jsx           # Reusable button component
├── pages/
│   └── index.jsx            # Main page
└── assets/
    └── openai-logomark.svg  # OpenAI logo
```

## Environment Variables

Create a `.env` file with:

```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

## Browser Compatibility

This application requires:
- Modern browser with WebRTC support
- Microphone permissions for voice input
- JavaScript enabled

## License

MIT
