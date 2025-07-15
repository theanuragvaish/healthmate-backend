const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve frontend files
app.use(express.static(__dirname));

// Enable JSON parsing
app.use(express.json());

// Route to proxy request to Groq API
app.post('/api/ask', async (req, res) => {
  const { userInput, fileText } = req.body;

  const combinedPrompt = `
The user has asked: "${userInput}"

${fileText ? `They've also uploaded the following content:\n\n"${fileText}"\n\nPlease use this information while answering.` : ""}
  `;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: "You are a calm and friendly wellness assistant. Use the uploaded content if it's available. Keep responses concise and helpful."
          },
          { role: "user", content: combinedPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    const data = await response.json();

    if (data.choices?.[0]?.message?.content) {
      res.json({ reply: data.choices[0].message.content.trim() });
    } else {
      res.status(500).json({ error: "Model did not return a valid reply." });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
