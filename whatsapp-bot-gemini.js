import dotenv from "dotenv";
import { Client } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

dotenv.config();

// Google Generative AI setup
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Basic chatbot function
async function generateAnswer(prompt) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
}

// Chatbot with history
const userChats = {};

function getChatSession(userId) {
    if (!userChats[userId]) {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        userChats[userId] = model.startChat({
            history: [], // Start with an empty history
            generationConfig: {
                maxOutputTokens: 200,
            },
        });
    }
    return userChats[userId];
}

async function handleUserMessage(userId, message) {
    try {
        const chat = getChatSession(userId);
        const result = await chat.sendMessage(message);
        const response = await result.response;
        return await response.text();
    } catch (error) {
        console.error(`Error handling message for user ${userId}:`, error);
        throw new Error("Failed to process the message.");
    }
}

// WhatsApp bot functionality
const client = new Client();

client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
    console.log("Client is ready!");
});

client.on("message", async (msg) => {
    if (msg.body === "Hallo") {
        msg.reply("Hello, can i help you?");
    }
    if (msg.body === "!ping") {
        msg.reply("pong");
    }
    if (msg.body.startsWith("!echo ")) {
        // Replies with the same message
        msg.reply(msg.body.slice(6));
    }
    if (msg.body === "!mediainfo" && msg.hasMedia) {
        msg.reply("I am sorry. I am just answering a text-based chat.");
        const attachmentData = await msg.downloadMedia();
        msg.reply(`
            *Media info*
            MimeType: ${attachmentData.mimetype}
            Filename: ${attachmentData.filename}
            Data (length): ${attachmentData.data.length}
        `);
    }

    if (msg.body.startsWith("!ai-basic ")) {
        try {
            const userPrompt = msg.body.slice(10);
            const aiResponse = await generateAnswer(userPrompt);
            msg.reply(aiResponse);
        } catch (error) {
            console.error(error);
            msg.reply("Sorry, I encountered an error while processing your request.");
        }
    }

    if (msg.body.startsWith("!ai ")) {
        try {
            const userId = msg.from;
            const userMessage = msg.body.slice(4);
            const aiResponse = await handleUserMessage(userId, userMessage);
            msg.reply(aiResponse);
        } catch (error) {
            console.error("Error processing message:", error);
            msg.reply("Sorry, I encountered an error while processing your message.");
        }
    }
});

client.initialize();
