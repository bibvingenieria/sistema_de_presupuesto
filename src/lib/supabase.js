import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mltcrzpphrlczkoyxgcc.supabase.co'
const supabaseKey = 'sb_publishable_QTFTM79hIjwFSk6LLAoL1g_DiRWNACv'

export const supabase = createClient(supabaseUrl, supabaseKey)