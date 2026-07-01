import { Client } from 'pg'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: './.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase variables in .env.local')
  process.exit(1)
}

const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '')
const connectionString = `postgresql://postgres:${encodeURIComponent('Cypher-Aura-19')}@db.${projectId}.supabase.co:5432/postgres`

const pgClient = new Client({
  connectionString
})

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('Connecting to PostgreSQL database via connection string...')
  try {
    await pgClient.connect()
    console.log('Connected!')

    console.log('Reading migration schema script...')
    const sqlPath = path.join(process.cwd(), './supabase_schema.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('Executing database schema creation query...')
    await pgClient.query(sql)
    console.log('Tables and database schema created successfully!')

    // Run auth user seeds
    console.log('Seeding Auth Admin user...')
    const { data: userList } = await supabase.auth.admin.listUsers()
    let adminUser = userList?.users.find(u => u.email === 'admin@learnix.com')
    
    if (!adminUser) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'admin@learnix.com',
        password: 'admin123',
        email_confirm: true,
        user_metadata: { full_name: 'Admin User', role: 'admin' }
      })
      if (createError) {
        console.error('Error creating admin user:', createError.message)
      } else {
        adminUser = newUser.user
        console.log('Admin user created successfully!')
      }
    } else {
      console.log('Admin user already exists.')
    }

    if (adminUser) {
      console.log('Seeding profiles table with admin role metadata...')
      await pgClient.query(`
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES ('${adminUser.id}', 'admin@learnix.com', 'Admin User', 'admin')
        ON CONFLICT (id) DO UPDATE SET role = 'admin';
      `)
    }

    console.log('Database migration seed complete!')

  } catch (err: any) {
    console.error('Migration error:', err.message)
  } finally {
    await pgClient.end()
  }
}

runMigration()
