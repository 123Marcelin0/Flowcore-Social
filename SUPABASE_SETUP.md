# Supabase Setup Guide

## Prerequisites

1. Create a free Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new project in your Supabase dashboard

## Environment Variables Setup

Create a `.env.local` file in your project root and add the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## How to Get Your Supabase Credentials

1. **Go to your Supabase project dashboard**
2. **Navigate to Settings > API**
3. **Copy the following values:**
   - **Project URL** → Use this for `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API Keys:**
     - **anon/public** → Use this for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - **service_role** → Use this for `SUPABASE_SERVICE_ROLE_KEY`

## Database Setup

The database schema has already been created in the `database/schema.sql` file. You need to run this SQL in your Supabase project:

1. **Go to your Supabase project dashboard**
2. **Navigate to the SQL Editor**
3. **Copy the contents of `database/schema.sql`**
4. **Run the SQL commands**

This will create all the necessary tables and Row Level Security policies.

## Example .env.local file

```env
# Replace with your actual values
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```

## Testing the Setup

After setting up the environment variables and database schema:

1. **Restart your development server:**
   ```bash
   npm run dev
   ```

2. **Check for any connection errors in the browser console**

3. **Try creating a new post through the UI to test the database integration**

## Authentication Setup

The project uses Supabase Auth with email/password authentication. The authentication is already configured in `lib/auth-context.tsx`.

## Next Steps

Once you have Supabase set up:

1. **Create a user account** through the login page
2. **Test creating posts** through the dashboard
3. **Explore the content hub** to see your posts and calendar events
4. **Set up social media integrations** (future enhancement)

## Troubleshooting

**Common issues:**

1. **"Invalid API key" error:** Make sure you're using the correct anon key from your Supabase project
2. **"Project not found" error:** Verify your project URL is correct
3. **Permission denied errors:** Check that RLS policies are properly set up by running the schema.sql file

**If you encounter any issues:**

1. Check the browser console for detailed error messages
2. Verify your environment variables are correct
3. Ensure the database schema was applied successfully
4. Check that your Supabase project is active and not paused

## Security Notes

- **Never commit your `.env.local` file** to version control
- **Keep your service role key secure** - it has admin privileges
- **Use the anon key for client-side operations** - it has limited permissions
- **The database has Row Level Security enabled** to protect user data 