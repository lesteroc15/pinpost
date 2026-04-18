const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateDescription({ businessName, businessType, address, existingText }) {
  let prompt;

  if (existingText && existingText.trim()) {
    prompt = `Rewrite and improve the following job description into a professional Google Business Profile post for ${businessName || 'a local service company'}. The job was completed at ${address}. Keep the key details from the original text but make it 2-3 polished sentences. Mention the neighborhood or city. Sound proud of the work. No hashtags. No emojis.

Original text: "${existingText}"`;
  } else {
    prompt = `Write a short, professional Google Business Profile post for ${businessName || 'a local service company'}, a ${businessType || 'local service'} company, describing a completed job at ${address}. Keep it 2-3 sentences, mention the neighborhood or city, and sound proud of the work. No hashtags. No emojis.`;
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }]
  });
  return message.content[0].text.trim();
}

module.exports = { generateDescription };
