const modelos = [
  { nome: "gemini-3.8-flash", ms: 6000 },
  { nome: "gemini-3.1-flash-lite", ms: 3000 }
];

for (const { nome, ms } of modelos) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${nome}:generateContent`,
      {
        method: "POST",
        signal: AbortSignal.timeout(ms),
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${SYSTEM_RULES}\n\nDADOS DO ESTUDANTE PARA O CURRÍCULO:\n${prompt}` }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1500,
            thinkingConfig: { thinkingLevel: "minimal" }
          }
        })
      }
    );
    const data = await response.json();
    if (response.ok) {
      const text = (data?.candidates?.[0]?.content?.parts || [])
        .filter(p => p.text && !p.thought).map(p => p.text).join("");
      if (text) return new Response(JSON.stringify({ text }), { status: 200, headers });
    } else {
      console.warn(`Erro em ${nome}:`, data?.error?.message);
    }
  } catch (err) {
    console.warn(`Falha em ${nome}:`, err.message);
  }
}
