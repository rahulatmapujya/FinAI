
import { GoogleGenAI, Type, GenerateContentResponse, Chat } from "@google/genai";
import { Transaction, Category, TransactionType } from '../types';
import { CATEGORIES } from '../constants';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Using mock data. To use the AI features, please provide a valid Google Gemini API key.");
}

const ai = process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;

// --- MOCK FUNCTIONS for when API key is not available ---
const mockCategorize = async (description: string): Promise<Category> => {
    await new Promise(res => setTimeout(res, 500));
    if (/paycheck|deposit/i.test(description)) return Category.Income;
    if (/groceries|market|food/i.test(description)) return Category.Groceries;
    if (/uber|lyft|transport/i.test(description)) return Category.Transport;
    if (/netflix|hulu|movie/i.test(description)) return Category.Entertainment;
    if (/bill|electric|water/i.test(description)) return Category.Utilities;
    if (/rent/i.test(description)) return Category.Rent;
    if (/amazon|target|shopping/i.test(description)) return Category.Shopping;
    return Category.Other;
};

const mockForecast = async (transactions: Transaction[]): Promise<{ date: string; forecast: number }[]> => {
    await new Promise(res => setTimeout(res, 1000));
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentDebits = transactions.filter(t => t.type === TransactionType.Debit && new Date(t.date) >= thirtyDaysAgo);
    const totalSpent = recentDebits.reduce((sum, t) => sum + t.amount, 0);
    const dailyAverage = totalSpent / 30 || 50;

    const forecastData: { date: string; forecast: number }[] = [];
    let cumulativeForecast = 0;
    for (let i = 1; i <= 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        cumulativeForecast += dailyAverage + (Math.random() - 0.5) * 10;
        forecastData.push({
            date: date.toISOString().split('T')[0],
            forecast: Math.round(cumulativeForecast * 100) / 100,
        });
    }
    return forecastData;
};

const mockInsights = async (transactions: Transaction[]): Promise<string> => {
    await new Promise(res => setTimeout(res, 800));
    const debitTotal = transactions.filter(t => t.type === 'Debit').reduce((acc, t) => acc + t.amount, 0);
    return `* You've spent a total of **$${debitTotal.toFixed(2)}** this month. Keep an eye on your spending goals!\n* Consider reviewing your **Entertainment** category for potential savings.`;
};

// --- API-powered functions ---

export const categorizeTransaction = async (description: string): Promise<Category> => {
    if (!ai) return mockCategorize(description);
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Categorize the following transaction description: "${description}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        category: {
                            type: Type.STRING,
                            enum: CATEGORIES,
                            description: "The most likely category for the transaction."
                        }
                    }
                }
            }
        });
        const json = JSON.parse(response.text);
        const category = json.category as Category;
        if (CATEGORIES.includes(category)) {
            return category;
        }
        return Category.Other;
    } catch (error) {
        console.error("Error categorizing transaction:", error);
        return Category.Other; // Fallback
    }
};

export const getExpenseForecast = async (transactions: Transaction[]): Promise<{ date: string; forecast: number }[]> => {
    if (!ai) return mockForecast(transactions);
    const historicalDebits = transactions
        .filter(t => t.type === TransactionType.Debit)
        .map(t => ({ date: t.date, amount: t.amount }));

    if (historicalDebits.length < 3) {
        return mockForecast(transactions); // Not enough data for a real forecast
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Based on the following historical daily expenses, project the CUMULATIVE daily expense for the next 30 days. Today's date is ${new Date().toISOString().split('T')[0]}. Provide the output as a JSON array of objects, where each object has "date" (in YYYY-MM-DD format) and "forecast" (a number representing the cumulative forecasted expense for that day). Historical data: ${JSON.stringify(historicalDebits)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            date: { type: Type.STRING },
                            forecast: { type: Type.NUMBER }
                        }
                    }
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error fetching expense forecast:", error);
        return mockForecast(transactions); // Fallback to mock
    }
};

export const getFinancialInsights = async (transactions: Transaction[]): Promise<string> => {
    if (!ai) return mockInsights(transactions);
    try {
        const summary = transactions.reduce((acc, t) => {
            if (t.type === 'Debit') {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
            }
            return acc;
        }, {} as Record<string, number>);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Here is a summary of a user's spending this month by category: ${JSON.stringify(summary)}. Provide 1-2 simple, personalized, text-based recommendations or insights in markdown format. For example: "You've spent $X on 'Category', which is Y% higher than your average. Consider...". Keep the insights concise and actionable.`,
        });

        return response.text;
    } catch (error) {
        console.error("Error fetching financial insights:", error);
        return "Could not generate insights at this time.";
    }
};


let chat: Chat | null = null;

export const startChat = () => {
  if (!ai) return;
  chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
        systemInstruction: `You are Fin-AI, a helpful personal finance assistant. You will answer questions based ONLY on the user's transaction data provided in the prompt. Do not invent any data. If you don't know the answer, say so. Respond concisely. You can answer questions like 'How much did I spend on [Category]?' or 'Show my last 5 transactions'. You cannot set reminders or perform actions.`,
    },
  });
}

export const sendMessageToBot = async (message: string, transactions: Transaction[]): Promise<string> => {
    if(!ai) {
        await new Promise(res => setTimeout(res, 500));
        return "I am a mock bot. I can't answer your questions without a Gemini API key.";
    }
    if (!chat) {
      startChat();
    }
    
    try {
        const fullPrompt = `Here is the user's transaction data (JSON format): ${JSON.stringify(transactions)}. The user asks: "${message}". Please answer based on the data provided.`;
        const response = await (chat as Chat).sendMessage({ message: fullPrompt });
        return response.text;
    } catch (error) {
        console.error("Error sending message to bot:", error);
        return "Sorry, I'm having trouble connecting right now.";
    }
};
