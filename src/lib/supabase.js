import { createClient } from '@supabase/supabase-js'

// Updated Supabase credentials for self-hosted instance
const SUPABASE_URL = 'https://supabase-ps4go-u52959.vm.elestio.app'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU0MDM1MzAwLCJleHAiOjIwNjkzOTUzMDB9.d4XNaC6kGDXC59LySD4V2XYXs3SB0hzoTEgyrQrqO40'

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