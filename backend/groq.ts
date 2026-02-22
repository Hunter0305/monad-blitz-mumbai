import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Score proof using Llama 3.3 70B via Groq
 * Returns a score (0-100) and reasoning
 */
export async function scoreProof(
  goalDescription: string,
  proofText: string
): Promise<{ score: number; reason: string }> {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You are a strict but fair goal completion verifier for TimeVault.
Score the proof 0-100 based on how well it proves the goal was completed.
Respond ONLY in valid JSON with no markdown: { "score": number, "reason": "short explanation" }

Scoring guide:
- 75-100: Clear, specific proof directly evidencing completion
- 40-74:  Partial or ambiguous proof, needs human review  
- 0-39:   No real proof, vague, or clearly incomplete

Be harsh on lazy submissions but fair to genuine attempts.`,
        },
        {
          role: "user",
          content: `GOAL: ${goalDescription}\n\nPROOF SUBMITTED: ${proofText}`,
        },
      ],
    });

    const raw = response.choices[0].message.content ?? "{}";
    
    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse Groq response:", raw);
      return { score: 0, reason: "Failed to parse AI response" };
    }

    return {
      score: Math.min(100, Math.max(0, parsed.score || 0)),
      reason: parsed.reason || "No reason provided",
    };
  } catch (error) {
    console.error("Groq API error:", error);
    throw new Error(`Groq scoring failed: ${error}`);
  }
}

/**
 * Batch score multiple proofs (useful for backfilling)
 */
export async function scoreProofsBatch(
  proofs: Array<{ goalDescription: string; proofText: string }>
): Promise<Array<{ score: number; reason: string }>> {
  return Promise.all(proofs.map((p) => scoreProof(p.goalDescription, p.proofText)));
}
