import type { CVData } from '../types';

interface AIResponse {
  content: string;
}

class AIService {
  private apiKey: string | null = null;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    // Try to get API key from localStorage or environment
    this.apiKey = localStorage.getItem('gemini_api_key') || 
                  import.meta.env.VITE_GEMINI_API_KEY || 
                  'AIzaSyAsW-sXWklyWeSFNCTjsCxCB6J2c5h4Yu8';
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    localStorage.setItem('gemini_api_key', apiKey);
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  private async makeRequest(prompt: string): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured. Please add your API key in settings.');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/models/gemini-2.5-flash:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              }
            ]
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API Error:', errorData);
        throw new Error(
          errorData.error?.message || 
          `API request failed with status ${response.status}: ${errorData.error?.status || 'Unknown error'}`
        );
      }

      const data = await response.json();
      console.log('Gemini Response:', data);
      
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from Gemini API');
      }
      
      return {
        content: data.candidates[0].content.parts[0].text,
      };
    } catch (error: any) {
      console.error('Request Error:', error);
      throw new Error(error.message || 'Failed to communicate with Gemini API');
    }
  }

  private formatCVData(cvData: CVData | null): string {
    if (!cvData) {
      return 'No CV data available.';
    }

    let formatted = `CV Title: ${cvData.title}\n\n`;
    
    cvData.sections.forEach(section => {
      if (!section.visible) return;
      
      formatted += `${section.title}:\n`;
      
      switch (section.type) {
        case 'contact':
          const contact = section.data;
          formatted += `- Name: ${contact.fullName || 'Not provided'}\n`;
          formatted += `- Email: ${contact.email || 'Not provided'}\n`;
          formatted += `- Phone: ${contact.phone || 'Not provided'}\n`;
          formatted += `- Location: ${contact.location || 'Not provided'}\n`;
          if (contact.website) formatted += `- Website: ${contact.website}\n`;
          if (contact.linkedin) formatted += `- LinkedIn: ${contact.linkedin}\n`;
          if (contact.github) formatted += `- GitHub: ${contact.github}\n`;
          break;
          
        case 'summary':
          formatted += `${section.data.content || 'No summary provided'}\n`;
          break;
          
        case 'experience':
          if (section.data.items && section.data.items.length > 0) {
            section.data.items.forEach((item: any) => {
              formatted += `- ${item.position} at ${item.company}\n`;
              formatted += `  Location: ${item.location}\n`;
              formatted += `  Period: ${item.startDate} - ${item.current ? 'Present' : item.endDate}\n`;
              formatted += `  Description: ${item.description}\n\n`;
            });
          } else {
            formatted += 'No experience entries\n';
          }
          break;
          
        case 'education':
          if (section.data.items && section.data.items.length > 0) {
            section.data.items.forEach((item: any) => {
              formatted += `- ${item.degree} in ${item.field}\n`;
              formatted += `  Institution: ${item.institution}\n`;
              formatted += `  Location: ${item.location}\n`;
              formatted += `  Period: ${item.startDate} - ${item.endDate}\n`;
              if (item.gpa) formatted += `  GPA: ${item.gpa}\n`;
              if (item.description) formatted += `  Description: ${item.description}\n\n`;
            });
          } else {
            formatted += 'No education entries\n';
          }
          break;
          
        case 'skills':
          if (section.data.items && section.data.items.length > 0) {
            formatted += section.data.items.join(', ') + '\n';
          } else {
            formatted += 'No skills listed\n';
          }
          break;
          
        default:
          formatted += JSON.stringify(section.data, null, 2) + '\n';
      }
      
      formatted += '\n';
    });
    
    return formatted;
  }

  async generateResponse(userMessage: string, cvData: CVData | null): Promise<string> {
    const systemPrompt = `You are an expert CV/resume assistant. You help users improve their resumes, write cover letters, prepare for interviews, and provide career advice. 

When responding:
- Be professional, helpful, and encouraging
- Provide specific, actionable advice
- Use proper formatting with bullet points and clear structure
- Focus on CV/resume best practices
- Be concise but comprehensive
- If asked about specific CV sections, provide detailed guidance

The user's current CV data is provided below for context. Use this information to give personalized advice.`;

    const cvContext = this.formatCVData(cvData);
    
    const fullPrompt = `${systemPrompt}\n\nHere is my current CV data:\n\n${cvContext}\n\nUser question: ${userMessage}\n\nPlease provide helpful advice:`;

    try {
      const response = await this.makeRequest(fullPrompt);
      return response.content;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  async generateCoverLetter(
    cvData: CVData | null, 
    jobDescription?: string, 
    companyName?: string
  ): Promise<string> {
    const prompt = `Generate a professional cover letter based on my CV. ${
      jobDescription ? `The job description is: ${jobDescription}` : ''
    } ${
      companyName ? `The company is: ${companyName}` : ''
    }`;

    return this.generateResponse(prompt, cvData);
  }

  async improveSection(
    cvData: CVData | null, 
    sectionType: string, 
    currentContent: string
  ): Promise<string> {
    const prompt = `Help me improve my ${sectionType} section. Current content: ${currentContent}. Please provide suggestions for improvement and a rewritten version.`;
    
    return this.generateResponse(prompt, cvData);
  }

  async generateInterviewQuestions(cvData: CVData | null): Promise<string> {
    const prompt = `Based on my CV, generate potential interview questions I might be asked and provide tips on how to answer them effectively.`;
    
    return this.generateResponse(prompt, cvData);
  }

  async suggestSkills(cvData: CVData | null): Promise<string> {
    const prompt = `Based on my experience and education, suggest additional skills I should consider adding to my CV to make it more competitive.`;
    
    return this.generateResponse(prompt, cvData);
  }

  /**
   * Resume Credibility Score
   * -----------------------------------------------
   * Estimates probability of shortlist (0-100) using
   * Gemini analysis. Returns score, explanation, and
   * per-section improvement highlights.
   * -----------------------------------------------
   * NOTE: This is an estimate, not authoritative.
   */
  async getCredibilityScore(
    cvData: CVData | null,
    jobDescription?: string
  ): Promise<{
    score: number;
    explanation: string;
    highlights: Array<{ field: string; advice: string }>;
  }> {
    if (!cvData) {
      return {
        score: 0,
        explanation: 'No resume data to analyze.',
        highlights: [],
      };
    }

    const cvText = this.formatCVData(cvData);

    const prompt = `You are an expert recruiter and ATS specialist. Analyze this resume ${
      jobDescription ? 'against the following job description' : 'for general competitiveness'
    } and provide a credibility score.

${jobDescription ? `Job Description:\n${jobDescription}\n\n` : ''}Resume:\n${cvText}

Respond ONLY in this exact JSON format (no markdown, no code fences):
{
  "score": <number 0-100>,
  "explanation": "<one paragraph summary>",
  "highlights": [
    {"field": "<section name>", "advice": "<specific improvement tip>"},
    {"field": "<section name>", "advice": "<specific improvement tip>"},
    {"field": "<section name>", "advice": "<specific improvement tip>"}
  ]
}

Scoring guidelines:
- 0-30: Major gaps, missing key sections
- 30-60: Decent but needs significant improvement
- 60-80: Good resume, minor improvements needed
- 80-100: Excellent, highly competitive

Be honest and specific. Return valid JSON only.`;

    try {
      const response = await this.makeRequest(prompt);
      const cleaned = response.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleaned);
      return {
        score: Math.min(100, Math.max(0, Number(parsed.score) || 0)),
        explanation: parsed.explanation || 'Unable to generate explanation.',
        highlights: Array.isArray(parsed.highlights)
          ? parsed.highlights.slice(0, 5)
          : [],
      };
    } catch (error: any) {
      console.error('[AIService] credibility score error:', error);
      // Fallback: simple heuristic based on completion
      return this.getHeuristicScore(cvData);
    }
  }

  /**
   * Fallback heuristic score when Gemini is unavailable.
   * Based on section completeness and content quality signals.
   */
  private getHeuristicScore(cvData: CVData): {
    score: number;
    explanation: string;
    highlights: Array<{ field: string; advice: string }>;
  } {
    let score = 0;
    const highlights: Array<{ field: string; advice: string }> = [];

    cvData.sections.forEach(section => {
      switch (section.type) {
        case 'contact': {
          const d = section.data || {};
          const filled = [d.fullName, d.email, d.phone, d.location].filter(Boolean).length;
          score += (filled / 4) * 15;
          if (filled < 4) highlights.push({ field: 'Contact', advice: 'Complete all contact fields.' });
          break;
        }
        case 'summary': {
          const len = (section.data?.content || '').length;
          if (len > 150) score += 20;
          else if (len > 50) score += 10;
          else highlights.push({ field: 'Summary', advice: 'Write a detailed professional summary (150+ characters).' });
          break;
        }
        case 'experience': {
          const items = section.data?.items || [];
          if (items.length >= 2) score += 30;
          else if (items.length === 1) score += 15;
          else highlights.push({ field: 'Experience', advice: 'Add at least 2 work experience entries.' });
          break;
        }
        case 'education': {
          const items = section.data?.items || [];
          if (items.length >= 1) score += 15;
          else highlights.push({ field: 'Education', advice: 'Add your education background.' });
          break;
        }
        case 'skills': {
          const items = section.data?.items || [];
          if (items.length >= 5) score += 20;
          else if (items.length >= 2) score += 10;
          else highlights.push({ field: 'Skills', advice: 'Add at least 5 relevant skills.' });
          break;
        }
      }
    });

    return {
      score: Math.round(Math.min(100, score)),
      explanation: `Heuristic analysis: Your resume scores ${Math.round(score)}/100 based on section completeness.`,
      highlights: highlights.slice(0, 3),
    };
  }
}

export const aiService = new AIService();
