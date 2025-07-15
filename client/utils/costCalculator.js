// OpenAI API Cost Calculator
// Pricing as of January 2025 (prices in USD per 1000 tokens)
// Current USD to INR exchange rate (approximate)
const USD_TO_INR_RATE = 85.0; // Update this as needed

const PRICING = {
  // Realtime API pricing (per 1000 tokens)
  'gpt-4o-realtime-preview': {
    input_text: 0.005,      // $0.005 per 1K input text tokens
    output_text: 0.02,      // $0.02 per 1K output text tokens
    input_audio: 0.10,      // $0.10 per 1K input audio tokens
    output_audio: 0.20,     // $0.20 per 1K output audio tokens
  },
  
  // Chat Completions API pricing (per 1000 tokens)
  'o1-mini': {
    input: 0.003,           // $0.003 per 1K input tokens
    output: 0.012,          // $0.012 per 1K output tokens
    reasoning: 0.003,       // $0.003 per 1K reasoning tokens
  },
  
  // Whisper API pricing (per minute)
  'whisper-1': {
    per_minute: 0.006,      // $0.006 per minute
  }
};

/**
 * Calculate cost for Realtime API usage
 * @param {Object} usage - Usage statistics from Realtime API
 * @param {number} usage.input_text_tokens - Number of input text tokens
 * @param {number} usage.output_text_tokens - Number of output text tokens
 * @param {number} usage.input_audio_tokens - Number of input audio tokens
 * @param {number} usage.output_audio_tokens - Number of output audio tokens
 * @returns {Object} Cost breakdown
 */
export function calculateRealtimeCost(usage) {
  const model = 'gpt-4o-realtime-preview';
  const pricing = PRICING[model];
  
  const inputTextCost = (usage.input_text_tokens || 0) * pricing.input_text / 1000;
  const outputTextCost = (usage.output_text_tokens || 0) * pricing.output_text / 1000;
  const inputAudioCost = (usage.input_audio_tokens || 0) * pricing.input_audio / 1000;
  const outputAudioCost = (usage.output_audio_tokens || 0) * pricing.output_audio / 1000;
  
  const totalCost = inputTextCost + outputTextCost + inputAudioCost + outputAudioCost;
  
  return {
    model,
    inputTextCost,
    outputTextCost,
    inputAudioCost,
    outputAudioCost,
    totalCost,
    breakdown: {
      input_text_tokens: usage.input_text_tokens || 0,
      output_text_tokens: usage.output_text_tokens || 0,
      input_audio_tokens: usage.input_audio_tokens || 0,
      output_audio_tokens: usage.output_audio_tokens || 0,
    }
  };
}

/**
 * Calculate cost for Chat Completions API usage (o1-mini)
 * @param {Object} usage - Usage statistics from Chat Completions API
 * @param {number} usage.prompt_tokens - Number of input/prompt tokens
 * @param {number} usage.completion_tokens - Number of output/completion tokens
 * @param {number} usage.reasoning_tokens - Number of reasoning tokens (for o1 models)
 * @returns {Object} Cost breakdown
 */
export function calculateChatCompletionsCost(usage) {
  const model = 'o1-mini';
  const pricing = PRICING[model];
  
  const inputCost = (usage.prompt_tokens || 0) * pricing.input / 1000;
  const outputCost = (usage.completion_tokens || 0) * pricing.output / 1000;
  const reasoningCost = (usage.reasoning_tokens || 0) * pricing.reasoning / 1000;
  
  const totalCost = inputCost + outputCost + reasoningCost;
  
  return {
    model,
    inputCost,
    outputCost,
    reasoningCost,
    totalCost,
    breakdown: {
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
      reasoning_tokens: usage.reasoning_tokens || 0,
      total_tokens: usage.total_tokens || 0,
    }
  };
}

/**
 * Calculate cost for Whisper API usage
 * @param {number} durationMinutes - Duration in minutes
 * @returns {Object} Cost breakdown
 */
export function calculateWhisperCost(durationMinutes) {
  const model = 'whisper-1';
  const pricing = PRICING[model];
  
  const totalCost = durationMinutes * pricing.per_minute;
  
  return {
    model,
    totalCost,
    breakdown: {
      duration_minutes: durationMinutes,
      rate_per_minute: pricing.per_minute,
    }
  };
}

/**
 * Format cost as currency string in INR
 * @param {number} cost - Cost in USD
 * @returns {string} Formatted cost string in INR
 */
export function formatCost(cost) {
  const inrCost = cost * USD_TO_INR_RATE;
  if (inrCost < 0.01) {
    return `₹${inrCost.toFixed(4)}`;
  }
  return `₹${inrCost.toFixed(2)}`;
}

/**
 * Convert USD to INR
 * @param {number} usdAmount - Amount in USD
 * @returns {number} Amount in INR
 */
export function convertToINR(usdAmount) {
  return usdAmount * USD_TO_INR_RATE;
}

/**
 * Aggregate multiple cost calculations
 * @param {Array} costs - Array of cost objects
 * @returns {Object} Aggregated cost summary
 */
export function aggregateCosts(costs) {
  const totalCost = costs.reduce((sum, cost) => sum + cost.totalCost, 0);
  
  const breakdown = {
    realtime: costs.filter(c => c.model === 'gpt-4o-realtime-preview'),
    chatCompletions: costs.filter(c => c.model === 'o1-mini'),
    whisper: costs.filter(c => c.model === 'whisper-1'),
  };
  
  return {
    totalCost,
    formattedCost: formatCost(totalCost),
    breakdown,
    requestCount: costs.length,
  };
}

/**
 * Estimate audio duration from tokens (rough approximation)
 * @param {number} audioTokens - Number of audio tokens
 * @returns {number} Estimated duration in minutes
 */
export function estimateAudioDuration(audioTokens) {
  // Rough approximation: ~1500 tokens per minute for audio
  return audioTokens / 1500;
} 