import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // Guard method
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const payload = await req.json()
    
    // Parse supabase webhook record
    // Webhook delivers data inside payload.record (for INSERT)
    const record = payload.record || payload
    
    const { user_email, course_title, student_name } = record

    if (!user_email || !course_title) {
      return new Response(JSON.stringify({ error: 'Missing user_email or course_title parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing RESEND_API_KEY env variable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Call Resend API to send onboarding email
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Learnix Academy <onboarding@resend.dev>',
        to: [user_email],
        subject: `Welcome to ${course_title}! 🎓`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 3px solid black; padding: 24px; box-shadow: 6px 6px 0px #000; background-color: #fcfcf9;">
            <h1 style="text-transform: uppercase; font-size: 28px; font-weight: 900; margin-bottom: 8px;">Learnix Academy</h1>
            <p style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #666; letter-spacing: 1px; margin-top: 0;">Learn. Grow. Achieve.</p>
            
            <hr style="border: 1px solid black; margin: 20px 0;" />
            
            <h2 style="text-transform: uppercase; font-size: 20px; font-weight: 800;">Hey ${student_name || 'Student'},</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #222;">
              Congratulations on enrolling in <strong>${course_title}</strong>! You have taken a massive first step towards mastering this subject.
            </p>
            
            <div style="background-color: #ffcc00; border: 2.5px solid black; padding: 16px; margin: 24px 0; box-shadow: 4px 4px 0px #000;">
              <h3 style="margin-top: 0; text-transform: uppercase; font-size: 14px; font-weight: 800;">Your Onboarding Checklist:</h3>
              <ul style="font-size: 13px; line-height: 1.5; padding-left: 20px; font-weight: 600; margin-bottom: 0;">
                <li>Log in to your student portal dashboard.</li>
                <li>Browse through the course curriculum and milestones.</li>
                <li>Complete your first milestone content review!</li>
              </ul>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #222;">
              If you have any questions or run into technical issues, simply reply to this email or contact support at <a href="mailto:support@learnix.com" style="color: black; font-weight: 700; text-decoration: underline;">support@learnix.com</a>.
            </p>
            
            <div style="margin-top: 32px; border-top: 2px solid black; padding-top: 16px; text-align: center;">
              <a href="https://learnix-academy.vercel.app" style="display: inline-block; background-color: #00ea8c; color: black; font-weight: 800; text-decoration: none; padding: 10px 20px; border: 2px solid black; box-shadow: 3px 3px 0px #000; text-transform: uppercase; font-size: 12px;">Go to Dashboard</a>
            </div>
          </div>
        `
      })
    })

    const resData = await res.json()
    return new Response(JSON.stringify(resData), {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
