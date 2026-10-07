const SYSTEM_RULES = `
Você ajuda estudantes a montar currículos profissionais.

REGRAS OBRIGATÓRIAS:
- Use SOMENTE as informações fornecidas pelo participante.
- Nunca invente experiências, empresas, cursos, habilidades, idiomas ou dados pessoais.
- Melhore apenas a organização e a redação das informações.
- Não altere os fatos fornecidos.
- Use linguagem profissional, clara e objetiva.
- Adapte o currículo ao objetivo profissional informado.
- Mostre somente as seções que possuem informações.
- Nunca crie seções vazias.

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

Ao final do currículo, escreva:

---

Para revisar:

E coloque uma lista curta das informações importantes que estiverem faltando.

Se nenhuma informação importante estiver faltando, não coloque a seção "Para revisar".

Se o pedido não for sobre criação ou organização de currículo, explique gentilmente que você foi desenvolvido para auxiliar nessa atividade.
`;

async function gerarComGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no Netlify.");
  }

  // Corrigido para utilizar modelo válido (fallback para gemini-1.5-flash se não definido no ambiente)
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

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
          parts: [
            {
              text: SYSTEM_RULES
            }
          ]
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt
              }
            ]
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
    console.error("Erro Gemini:", data);
    throw new Error(
      data?.error?.message ||
      `Erro da API Gemini: ${response.status}`
    );
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map(part => part.text || "")
    .join("");

  if (!text) {
    throw new Error("A IA não retornou nenhum conteúdo.");
  }

  return text;
}

export default async function handler(request) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  // Trata requisições Preflight (OPTIONS)
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Método não permitido."
      }),
      {
        status: 405,
        headers
      }
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "Requisição inválida."
      }),
      {
        status: 400,
        headers
      }
    );
  }

  const prompt = String(body?.prompt || "").trim();

  if (prompt.length < 20) {
    return new Response(
      JSON.stringify({
        error: "O prompt é muito curto."
      }),
      {
        status: 400,
        headers
      }
    );
  }

  if (prompt.length > 4000) {
    return new Response(
      JSON.stringify({
        error: "O prompt ultrapassa o limite de 4000 caracteres."
      }),
      {
        status: 400,
        headers
      }
    );
  }

  try {
    const text = await gerarComGemini(prompt);

    return new Response(
      JSON.stringify({
        text
      }),
      {
        status: 200,
        headers
      }
    );
  } catch (error) {
    console.error("Erro ao gerar currículo:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Não foi possível gerar o currículo."
      }),
      {
        status: 503,
        headers
      }
    );
  }
}
