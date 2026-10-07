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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Variável GROQ_API_KEY não configurada no Netlify." }),
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

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_RULES },
          { role: "user", content: `DADOS DO ESTUDANTE PARA O CURRÍCULO:\n${prompt}` }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro na Groq API:", data);
      return new Response(
        JSON.stringify({ error: data?.error?.message || "Erro na geração do currículo." }),
        { status: response.status, headers }
      );
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      return new Response(JSON.stringify({ error: "A IA não retornou conteúdo." }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ text }), { status: 200, headers });

  } catch (err) {
    console.error("Erro interno:", err);
    return new Response(
      JSON.stringify({ error: "Erro de conexão com o servidor de IA." }),
      { status: 500, headers }
    );
  }
}
  
