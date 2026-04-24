import { createClient } from "@supabase/supabase-js";

// Supabase setup
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function processAiToken(email: string) {
  // 1. Fetch User
  const { data: userDB } = await supabase
    .from('users')
    .select('ai_count, paid_tokens, last_used_date, is_pro')
    .eq('email', email)
    .single();

  if (!userDB) return { allowed: false, error: "User nahi mila bhai database mein." };

  // 2. Midnight Reset Check
  const today = new Date().toISOString().split('T')[0];
  let currentAiCount = userDB.ai_count || 0;

  if (userDB.last_used_date !== today) {
    currentAiCount = 0; // Naya din, count reset
  }

  // 3. Limit Check Logic
  const DAILY_FREE_LIMIT = 5;
  let isUsingPaidToken = false;

  if (currentAiCount >= DAILY_FREE_LIMIT && !userDB.is_pro) {
    if (userDB.paid_tokens && userDB.paid_tokens > 0) {
      isUsingPaidToken = true; // Paise wale token use karenge
    } else {
      // Dono zero hain, bhaga do!
      return { 
        allowed: false, 
        needsPayment: true, 
        error: "Daily limit exceeded! Wait for tomorrow or buy 20 tokens for ₹50." 
      };
    }
  }

  // 4. Charge the Token (Balance update)
  if (isUsingPaidToken) {
    await supabase.from('users').update({ paid_tokens: userDB.paid_tokens - 1 }).eq('email', email);
  } else {
    await supabase.from('users').update({ ai_count: currentAiCount + 1, last_used_date: today }).eq('email', email);
  }

  // 5. Green Signal
  return { allowed: true };
}