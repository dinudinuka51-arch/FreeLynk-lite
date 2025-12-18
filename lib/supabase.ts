
import { createClient } from '@supabase/supabase-js';

// User provided credentials
const supabaseUrl = 'https://ygirhkcboraqnqetorkg.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnaXJoa2Nib3JhcW5xZXRvcmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMDcwMDksImV4cCI6MjA4MTU4MzAwOX0.FltHWDHIG7xTFuBBybM-SGYyBTX9PbIO7cQs71EgopE';

export const supabase = createClient(supabaseUrl, supabaseKey);
