const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateDescription({ businessName, businessType, address }) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Write a short, professional Google Business Profile post for ${businessName}, a ${businessType || 'local service'} company, describing a completed job at ${address}. Keep it 2-3 sentences, mention the neighborhood or city, and sound proud of the work. No hashtags. No emojis.`
    }]
  });
  return message.content[0].text.trim();
}

module.exports = { generateDescription };
