
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mdcymhgqzvdrojasuxhb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kY3ltaGdxenZkcm9qYXN1eGhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODE1MTUsImV4cCI6MjA4NjE1NzUxNX0.r-f-G-PTnphI-H8zKWgXS5-UK1ftpJddLCv8kQ_Tf1M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

