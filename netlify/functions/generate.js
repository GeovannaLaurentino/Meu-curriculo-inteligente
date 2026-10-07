async function gerarComGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no Netlify.");
  }

  // Tenta o 3.8-flash e usa o 1.5-flash-8b (muito mais rápido) como fallback imediato
  const modelos = ["gemini-3.8-flash", "gemini-1.5-flash-8b"];

  for (const model of modelos) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: SYSTEM_RULES }]
            },
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1000 
            }
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        const text = data?.candidates?.[0]?.content?.parts
          ?.map(part => part.text || "")
          .join("");

        if (text) return text;
      }

      console.warn(`Modelo ${model} retornou erro:`, data?.error?.message);
    } catch (err) {
      console.warn(`Erro ao chamar ${model}:`, err.message);
    }
  }

  throw new Error("Serviço temporariamente indisponível. Tente novamente em alguns segundos.");
}
