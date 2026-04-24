import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@supabase/supabase-js";

// 🚀 1. Supabase se connection banaya
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      // 🚀 THE MAGIC FIX: Timer 3.5s se badha kar 10s kar diya!
      httpOptions: {
        timeout: 10000, 
      }
    }),
  ],
  callbacks: {
    // 🚀 2. Jab user login button dabata hai, ye function chalta hai
    async signIn({ user }) {
      if (user.email) {
        
        // Check karte hain ki kya ye user apne database mein pehle se hai?
        const { data: existingUser } = await supabase
          .from('users')
          .select('email')
          .eq('email', user.email)
          .single();

        // Agar user pehli baar aaya hai (naya user hai), toh usko DB mein save kar lo!
        if (!existingUser) {
          await supabase.from('users').insert([
            { email: user.email, name: user.name }
          ]);
          console.log("🔥 Naya user database mein save ho gaya:", user.email);
        }
      }
      return true; // Login successful
    },
  },
});   

export { handler as GET, handler as POST };