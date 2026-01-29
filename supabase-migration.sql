-- Add group_number column to profiles table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/xvjyqqgkdwzwvtcrtiqd/sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS group_number TEXT;
