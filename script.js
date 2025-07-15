let recognition;
let isListening = false;
let transcriptBox;
let backgroundMusic;
let transcriptVisible = false;

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
  transcriptBox = document.getElementById("transcriptBox");

  backgroundMusic = document.getElementById("backgroundMusic");
  if (backgroundMusic) {
    backgroundMusic.volume = 0.3;
    backgroundMusic.play().catch(e => console.log("Autoplay prevented:", e));
  }

  // 👇 Add these lines below
  document.getElementById("sendButton").addEventListener("click", async () => {
    const input = document.getElementById("chatInput");
    const userInput = input.value.trim();
    if (!userInput) return;

    appendToTranscript(`<b>You:</b> ${userInput}<br><i>💭 Thinking...</i><br>`);
    input.value = "";

    try {
      const reply = await getGPTReply(userInput, uploadedFileContent);
      appendToTranscript(`<b>Coach:</b> ${reply}<br><br>`);
      speak(reply);
    } catch (err) {
      console.error(err);
      appendToTranscript(`<b>Coach:</b> Sorry, something went wrong.<br><br>`);
    }
  });

  let uploadedFileContent = ""; // global variable to store file text

document.getElementById("fileUpload").addEventListener("change", () => {
  const file = document.getElementById("fileUpload").files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (event) {
    uploadedFileContent = event.target.result;

    appendToTranscript(`<i>📎 Uploaded file:</i> ${file.name}<br>`);
    appendToTranscript(`<i>🧠 File ready for reference in your next message.</i><br>`);
  };

  if (file.type === "application/pdf") {
    appendToTranscript(`<i>⚠️ PDF text extraction requires backend support.</i><br>`);
    // Optional: fallback warning
  } else {
    reader.readAsText(file);
  }
});

});

function appendToTranscript(html) {
  const box = document.getElementById("transcriptContent");
  if (box) {
    box.innerHTML += html;
    box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  }
}

function toggleTranscript() {
  if (!transcriptBox) {
    transcriptBox = document.getElementById("transcriptBox");
  }

  transcriptVisible = !transcriptVisible;
  transcriptBox.style.display = transcriptVisible ? 'block' : 'none';
}

function startListening() {
  if (!transcriptBox) {
    transcriptBox = document.getElementById("transcriptBox");
  }

  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert("Speech recognition not supported in this browser. Please use Chrome or Edge.");
    return;
  }

  if (isListening) {
    console.log("Already listening...");
    return;
  }

  if (recognition) {
    recognition.abort();
    recognition = null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onstart = () => {
    isListening = true;
    if (backgroundMusic) backgroundMusic.volume = 0.1;
    if (transcriptBox && transcriptVisible) {
      transcriptBox.innerHTML += `<i>🎤 Listening...</i><br>`;
      transcriptBox.scrollTo({ top: transcriptBox.scrollHeight, behavior: 'smooth' });
    }
  };

  recognition.onresult = async (event) => {
    const userInput = event.results?.[0]?.[0]?.transcript;
    if (!userInput) return;

    if (transcriptBox && transcriptVisible) {
      transcriptBox.innerHTML = transcriptBox.innerHTML.replace(`<i>🎤 Listening...</i><br>`, '');
      transcriptBox.innerHTML += `<b>You:</b> ${userInput}<br><i>💭 Thinking...</i><br>`;
      transcriptBox.scrollTo({ top: transcriptBox.scrollHeight, behavior: 'smooth' });
    }

    try {
      const reply = await getGPTReply(userInput, uploadedFileContent);
      if (transcriptBox && transcriptVisible) {
        transcriptBox.innerHTML = transcriptBox.innerHTML.replace(`<i>💭 Thinking...</i><br>`, '');
        transcriptBox.innerHTML += `<b>Coach:</b> ${reply}<br><br>`;
        transcriptBox.scrollTo({ top: transcriptBox.scrollHeight, behavior: 'smooth' });
      }
      speak(reply);
    } catch (error) {
      console.error("Error processing speech:", error);
      if (transcriptBox && transcriptVisible) {
        transcriptBox.innerHTML = transcriptBox.innerHTML.replace(`<i>💭 Thinking...</i><br>`, '');
        transcriptBox.innerHTML += `<b>Coach:</b> Sorry, I had trouble processing that. Please try again.<br><br>`;
      }
    }
  };

  recognition.onerror = (event) => {
    console.error("Recognition error:", event.error);
    isListening = false;
    if (event.error === 'aborted' || event.error === 'no-speech') return;
    if (transcriptBox && transcriptVisible) {
      transcriptBox.innerHTML = transcriptBox.innerHTML.replace(`<i>🎤 Listening...</i><br>`, '');
      transcriptBox.innerHTML += `<i>❌ Speech recognition error: ${event.error}</i><br>`;
    }
  };

  recognition.onend = () => {
    isListening = false;
    if (transcriptBox && transcriptVisible) {
      transcriptBox.innerHTML = transcriptBox.innerHTML.replace(`<i>🎤 Listening...</i><br>`, '');
    }
  };

  try {
    recognition.start();
  } catch (error) {
    console.error("Failed to start recognition:", error);
    isListening = false;
    if (transcriptBox && transcriptVisible) {
      transcriptBox.innerHTML += `<i>❌ Failed to start speech recognition</i><br>`;
    }
  }
}

async function getGPTReply(userInput, fileText = "") {
  try {
    const response = await fetch("https://healthmate-backend-9bhw.onrender.com/api/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userInput,
        fileText
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed: ${response.status} - ${errorText}`);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.reply) {
      return data.reply;
    } else {
      throw new Error("Invalid response format from backend");
    }
  } catch (error) {
    console.error("Error getting GPT reply:", error);
    return "I'm having trouble connecting right now. Please try again later.";
  }
}


function speak(text) {
  if ('speechSynthesis' in window) {
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.pitch = 1.1;
    utterance.rate = 0.85;
    utterance.volume = 0.9;

    const pickVoice = () => {
      const voices = synth.getVoices();
      const femaleVoice = voices.find(voice =>
        voice.lang.startsWith('en') && (
          voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('woman') ||
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('victoria') ||
          voice.name.toLowerCase().includes('karen') ||
          voice.name.toLowerCase().includes('susan') ||
          voice.name.toLowerCase().includes('zira') ||
          voice.name.toLowerCase().includes('allison') ||
          voice.name.toLowerCase().includes('ava') ||
          voice.name.toLowerCase().includes('serena')
        )
      );
      utterance.voice = femaleVoice || voices.find(v => v.lang.startsWith("en"));
      synth.speak(utterance);
    };

    utterance.onend = () => {
      console.log("Speech ended. Restarting recognition...");
      setTimeout(() => {
        if (backgroundMusic && !isListening) {
          backgroundMusic.volume = 0.3;
        }
      }, 3000);
      startListening();
    };

    if (synth.getVoices().length === 0) {
      synth.onvoiceschanged = pickVoice;
    } else {
      pickVoice();
    }
  } else {
    console.log("Speech synthesis not supported");
  }
}
