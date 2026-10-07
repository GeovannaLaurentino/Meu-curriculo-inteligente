// Função serverless do Netlify: guarda a chave da API (variável de ambiente) e chama o provedor de IA.
// Para trocar de provedor, adicione uma função em `providers` e mude AI_PROVIDER.
const SYSTEM_RULES = `Você ajuda estudantes do ensino médio a montar o primeiro currículo.
REGRAS OBRIGATÓRIAS:
- Use SOMENTE as informações fornecidas pelo participante.
- Não invente experiências, empresas, cursos, habilidades, idiomas ou dados pessoais.
- Melhore a organização e a redação sem alterar os fatos. Evite exageros.
- Linguagem profissional, clara e objetiva, adaptada ao objetivo profissional informado.
- Mostre apenas seções que tenham informações. Nunca crie seções vazias.
FORMATO (Markdown, em português):
# NOME
Linha de contato (somente se informada)
## OBJETIVO PROFISSIONAL
## FORMAÇÃO
## EXPERIÊNCIAS
## CURSOS E CERTIFICAÇÕES
## HABILIDADES
## IDIOMAS
## PROJETOS OU ATIVIDADES
Ao final do currículo, escreva uma linha com apenas --- e depois "Para revisar:" com uma lista curta das informações importantes que faltaram (ex.: contato, formação). Se nada faltar, omita essa parte.
Se o pedido não for sobre criar um currículo, explique gentilmente que você só ajuda com isso.`;

const providers = {
  async gemini(prompt) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY não configurada');
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const generationConfig = { temperature: 0.4 };
    if (model.includes('2.5-flash')) generationConfig.thinkingConfig = { thinkingBudget: 0 };
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_RULES }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig
      })
    });
    if (!r.ok) throw new Error('Provedor respondeu ' + r.status);
    const d = await r.json();
    const text = d.candidates?.[0]?.content?.parts?.map(p => p.text).join('');
    if (!text) throw new Error('Resposta vazia');
    return text;
  }
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad' }, 400); }
  const prompt = String(body?.prompt || '').trim();
  if (prompt.length < 20) return json({ error: 'short' }, 400);
  if (prompt.length > 4000) return json({ error: 'long' }, 400);
  try {
    const text = await providers[process.env.AI_PROVIDER || 'gemini'](prompt);
    return json({ text });
} catch (e) {
  console.error(e);
  return json({
    error: e.message || 'Erro desconhecido'
  }, 503);
}
};

export const config = { path: '/api/generate' };
