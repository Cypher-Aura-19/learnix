import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const { user_email, course_title, student_name } = await request.json()
    const apiKey = process.env.BREVO_API_KEY
    const senderEmail = process.env.BREVO_SENDER_EMAIL

    if (!apiKey) {
      return NextResponse.json({ error: 'BREVO_API_KEY (SMTP password) is not configured.' }, { status: 500 })
    }
    if (!senderEmail) {
      return NextResponse.json({ error: 'BREVO_SENDER_EMAIL is not configured.' }, { status: 500 })
    }

    // Configure Nodemailer transporter with Brevo SMTP relay settings
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: senderEmail,
        pass: apiKey,
      },
    })

    // Send onboarding email
    const info = await transporter.sendMail({
      from: `"Learnix Academy" <${senderEmail}>`,
      to: user_email,
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
        </div>
      `,
    })

    console.log('Nodemailer SMTP Dispatch Result:', info)
    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (err: any) {
    console.error('Nodemailer SMTP Dispatch Failure:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
