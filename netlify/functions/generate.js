const SYSTEM_RULES = `Você ajuda estudantes a montar currículos profissionais.
REGRAS OBRIGATÓRIAS:
- Use SOMENTE as informações fornecidas pelo participante.
- Nunca invente experiências, empresas, cursos, habilidades, idiomas ou dados pessoais.
- Melhore apenas a organização e a redação das informações.
- Use linguagem profissional, clara e objetiva.
- Adapte o currículo ao objetivo profissional informado.
- Mostre somente as seções que possuem informações e nunca crie seções vazias.

FORMATO DA RESPOSTA:
# NOME
Linha de contato, somente se tiver sido informada.
## OBJETIVO PROFISSIONAL
## FORMAÇÃO
## EXPERIÊNCIAS
## CURSOS E CERTIFICAÇÕES
## HABILIDADES
## IDIOMAS
## PROJETOS OU ATIVIDADES

Ao final, se faltar algo importante, inclua a seção "--- \n Para revisar:" com uma lista curta.`;

// Cada modelo tem seu próprio tempo máximo (em ms).
// Soma = 9s, para caber no limite de ~10s da Netlify.
const MODELOS = [
  { nome: "gemini-3.8-flash", ms: 6000 },
  { nome: "gemini-3.1-flash-lite", ms: 3000 }
];

export default async function handler(request) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido." }), { status: 405, headers });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Variável GEMINI_API_KEY não configurada no Netlify." }),
      { status: 500, headers }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido." }), { status: 400, headers });
  }

  const prompt = String(body?.prompt || "").trim();
  if (!prompt || prompt.length < 10) {
    return new Response(JSON.stringify({ error: "Prompt muito curto." }), { status: 400, headers });
  }

  for (const { nome, ms } of MODELOS) {
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
            contents: [
              {
                role: "user",
                parts: [
                  { text: `${SYSTEM_RULES}\n\nDADOS DO ESTUDANTE PARA O CURRÍCULO:\n${prompt}` }
                ]
              }
            ],
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
          .filter((p) => p.text && !p.thought)
          .map((p) => p.text)
          .join("");

        if (text) {
          return new Response(JSON.stringify({ text }), { status: 200, headers });
        }
      } else {
        console.warn(`Erro em ${nome}:`, data?.error?.message);
      }
    } catch (err) {
      console.warn(`Falha em ${nome}:`, err.message);
    }
  }

  return new Response(
    JSON.stringify({ error: "Serviço temporariamente indisponível na Google API. Tente novamente em alguns instantes." }),
    { status: 503, headers }
  );
}
