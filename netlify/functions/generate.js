async function chamarApiGemini(modelName, prompt, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
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
          temperature: 0.4
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.error?.message || `Erro status ${response.status}`;
    throw new Error(errorMsg);
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map(part => part.text || "")
    .join("");

  if (!text) {
    throw new Error("Resposta vazia da IA.");
  }

  return text;
}

async function gerarComGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no Netlify.");
  }

  // Lista de modelos para tentar em sequência caso um esteja congestionado
  const modelosParaTentar = [
    process.env.GEMINI_MODEL || "gemini-3.8-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro"
  ];

  let ultimoErro = null;

  for (const model of modelosParaTentar) {
    try {
      console.log(`Tentando gerar com o modelo: ${model}`);
      return await chamarApiGemini(model, prompt, apiKey);
    } catch (err) {
      console.warn(`Falha no modelo ${model}:`, err.message);
      ultimoErro = err;
      // Se for erro de demanda/espera, o loop passa para o próximo modelo automaticamente
    }
  }

  throw new Error(`Todos os modelos falharam. Último erro: ${ultimoErro?.message}`);
}
