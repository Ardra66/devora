const { GoogleGenAI } = require("@google/genai");

if (!process.env.GEMINI_API_KEY) {
throw new Error("GEMINI_API_KEY is missing from the server .env file.");
}

const ai = new GoogleGenAI({
apiKey: process.env.GEMINI_API_KEY,
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function analyzeCode(code, fileName) {
const prompt = `
You are Devora AI, an expert programming assistant.

Analyze this source file: ${fileName}

Provide:

1. A simple explanation of what the code does.
2. Potential bugs or issues.
3. Security concerns, if any.
4. Suggestions for improvement.

Clearly distinguish confirmed issues from potential concerns.
If something cannot be determined from this file alone, say so.

SOURCE CODE:
${code}
`;

for (let attempt = 1; attempt <= 3; attempt++) {
try {
const response = await Promise.race([
  ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
  }),
  new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("Gemini request timed out. Please try again.")),
      60000
    )
  ),
]);

  if (!response.text) {
    throw new Error("Gemini returned an empty response.");
  }

  return response.text;
} catch (error) {
  const status = error.status || error.code;

  if (![429, 500, 502, 503, 504].includes(Number(status)) ||
      attempt === 3) {
    throw error;
  }

  console.log(`Gemini temporarily unavailable. Retry ${attempt}/3...`);
  await wait(attempt * 2000);
}

}
}

module.exports = { analyzeCode };
