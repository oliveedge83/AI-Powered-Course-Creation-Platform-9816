import { createClient } from '@supabase/supabase-js'

// Updated Supabase credentials for self-hosted instance
const SUPABASE_URL = 'https://hsemulflbotzniswhgiy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzZW11bGZsYm90em5pc3doZ2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzODI1MTQsImV4cCI6MjA3MDk1ODUxNH0.FZKxxdSTj5gHEIktBGvYTsZ7Ao1ZHHW7De6vY22swEA'

if(SUPABASE_URL === 'https://<PROJECT-ID>.supabase.co' || SUPABASE_ANON_KEY === '<ANON_KEY>'){
  throw new Error('Missing Supabase variables');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

export default supabase