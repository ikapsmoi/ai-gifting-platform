export default async function handler(req, res) {
  try {
    const { brief } = req.body;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5",
        input: `
You are a corporate gifting expert.

User requirement: ${brief}

Return JSON:
{
  "summary": "short summary",
  "audience": "",
  "budget": "",
  "occasion": "",
  "giftOptions": [
    {
      "name": "",
      "introLine1": "",
      "introLine2": "",
      "imageUrl": "",
      "whatsappUrl": ""
    }
  ]
}
        `,
      }),
    });

    const data = await response.json();

    const text = data.output?.[0]?.content?.[0]?.text || "{}";

    const parsed = JSON.parse(text);

    res.status(200).json({ data: parsed });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}