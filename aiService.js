// aiService.js
require("dotenv").config();
const { ChatGroq } = require("@langchain/groq");
const { DynamicTool } = require("langchain/tools");

const chat = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
  // Encourage concise answers
  temperature: 0.7,
  // Limit response size to keep audio short
  maxTokens: 500,
});

const hangupTool = new DynamicTool({
  name: "hangup",
  description: "Terminate the phone call when the conversation has concluded",
  func: async () => "Call ended",
});

const sessions = new Map();

function initSession(sessionId, { name, description, topic }) {
  const sysPrompt = `
You are a warm, friendly female call-center assistant from Delhi that speaks modern hindi.

On your **first reply only**,Dilever a natural give a short 2–3 sentence introduction in Delhi slang.
Wrap your entire answer in a single SSML <speak>…</speak> tag.
If you need a pause, use a brief <break time="100ms"/>.
be natural and dont sound robotic.
Dont use pure hindi.. just use normal one and mix it with english
After the first monologue, continue with normal back-and-forth SSML responses in Hindi. 

When you want to end the call, invoke the "hangup" tool after your final sentence. Do not speak the tool name aloud.

Topic: ${topic}  
Contact’s name: ${name}${description ? `, description: "${description}"` : ""}.  
Begin immediately with that brief introduction.
  `.trim();

  sessions.set(sessionId, [{ role: "system", content: sysPrompt }]);
}
async function handleUserMessage(sessionId, userText) {
  const history = sessions.get(sessionId) || [];
  history.push({ role: "user", content: userText });
  const response = await chat.call(history, { tools: [hangupTool] });
  const ssml = typeof response === "string" ? response : response.content;
  history.push({ role: "assistant", content: ssml });
  sessions.set(sessionId, history);
  const toolCalls =
    response.tool_calls || response.lc_kwargs?.tool_calls || [];
  return { ssml, toolCalls };
}

function endSession(sessionId) {
  sessions.delete(sessionId);
}

module.exports = { initSession, handleUserMessage, endSession };
