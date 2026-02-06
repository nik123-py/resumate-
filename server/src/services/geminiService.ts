/**
 * geminiService.ts
 * -----------------------------------------------
 * Server-side Gemini API integration.
 * Keeps the API key off the client. Provides
 * resume credibility scoring and AI suggestions.
 * -----------------------------------------------
 */

import { config } from '../config';
import https from 'https';
import http from 'http';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string; code?: number };
}

/**
 * Make a raw request to Gemini API.
 */
async function callGemini(prompt: string): Promise<string> {
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const url = `${BASE_URL}/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const requestBody = JSON.stringify({
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  });

  return new Promise<string>((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed: GeminiResponse = JSON.parse(data);

          if (parsed.error) {
            reject(new Error(`Gemini API error: ${parsed.error.message} (code ${parsed.error.code})`));
            return;
          }

          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            reject(new Error('Gemini returned empty response'));
            return;
          }

          resolve(text);
        } catch (e) {
          reject(new Error(`Failed to parse Gemini response: ${e}`));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`Gemini request failed: ${e.message}`)));
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Gemini request timeout (30s)'));
    });

    req.write(requestBody);
    req.end();
  });
}

// -----------------------------------------------
// Public API
// -----------------------------------------------

export interface ScoreResult {
  score: number;
  explanation: string;
  highlights: Array<{ field: string; advice: string }>;
}

/**
 * Score a resume against a job description.
 * Returns a credibility score (0-100) with explanation.
 */
export async function scoreResume(cvText: string, jobDescription?: string): Promise<ScoreResult> {
  const prompt = `You are an expert recruiter and ATS specialist. Analyze this resume ${
    jobDescription ? 'against the following job description' : 'for general competitiveness'
  } and provide a credibility score.

${jobDescription ? `Job Description:\n${jobDescription}\n\n` : ''}Resume:\n${cvText}

Respond ONLY in this exact JSON format (no markdown, no code fences, no extra text):
{
  "score": <number 0-100>,
  "explanation": "<one paragraph summary of strengths and weaknesses>",
  "highlights": [
    {"field": "<section name>", "advice": "<specific, actionable improvement tip>"},
    {"field": "<section name>", "advice": "<specific, actionable improvement tip>"},
    {"field": "<section name>", "advice": "<specific, actionable improvement tip>"}
  ]
}

Scoring guidelines:
- 0-30: Major gaps, missing key sections, poor formatting
- 30-60: Decent but needs significant improvement in content or structure
- 60-80: Good resume, minor improvements needed
- 80-100: Excellent, highly competitive for the role

Be honest, specific, and actionable. Return valid JSON only.`;

  console.info('[Gemini] Scoring resume...');

  const rawResponse = await callGemini(prompt);

  // Clean potential markdown wrapping
  const cleaned = rawResponse
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 0)),
      explanation: parsed.explanation || 'Unable to generate explanation.',
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 5) : [],
    };
  } catch {
    console.error('[Gemini] Failed to parse score response:', cleaned.slice(0, 200));
    throw new Error('Gemini returned invalid JSON for scoring');
  }
}

/**
 * Generate a contextual nudge/suggestion for a returning user.
 */
export async function generateNudge(context: {
  weakestSection?: string;
  completionPercent?: number;
  lastAction?: string;
}): Promise<string> {
  const prompt = `You are a friendly resume coach. The user is returning to edit their resume.
Context:
- Weakest section: ${context.weakestSection || 'unknown'}
- Overall completion: ${context.completionPercent || 0}%
- Last action: ${context.lastAction || 'unknown'}

Generate ONE short, encouraging, specific suggestion (max 20 words) to help them improve their resume right now. Be warm but direct.`;

  const response = await callGemini(prompt);
  return response.trim().replace(/^["']|["']$/g, '');
}

/**
 * Analyze resume and provide detailed improvement suggestions.
 */
export async function analyzeResume(cvText: string): Promise<{
  overallAssessment: string;
  suggestions: Array<{ section: string; suggestion: string; priority: 'high' | 'medium' | 'low' }>;
}> {
  const prompt = `You are a professional resume reviewer. Analyze this resume and provide detailed improvement suggestions.

Resume:
${cvText}

Respond ONLY in this exact JSON format (no markdown, no code fences):
{
  "overallAssessment": "<2-3 sentence overall assessment>",
  "suggestions": [
    {"section": "<section name>", "suggestion": "<specific improvement>", "priority": "high"},
    {"section": "<section name>", "suggestion": "<specific improvement>", "priority": "medium"},
    {"section": "<section name>", "suggestion": "<specific improvement>", "priority": "low"}
  ]
}

Provide 3-5 suggestions ordered by priority. Return valid JSON only.`;

  const rawResponse = await callGemini(prompt);
  const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return {
      overallAssessment: 'Unable to analyze resume at this time.',
      suggestions: [],
    };
  }
}
