import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const formData = await request.formData();

  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const question = String(formData.get('question') || '').trim();
  const permissionToPublish =
    formData.get('permissionToPublish') === 'yes';

  // Hidden honeypot field for basic spam protection.
  const website = String(formData.get('website') || '').trim();

  if (website) {
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (!email || !question) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Email and question are required.',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const apiKey = env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('RESEND_API_KEY is not available.');

    return new Response(
      JSON.stringify({
        success: false,
        message: 'The question service is temporarily unavailable.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const safeName = name || 'Not provided';

  const emailBody = `
New China Transit Guide question

Name: ${safeName}
Email: ${email}

Permission to publish:
${permissionToPublish ? 'Yes' : 'No'}

Question:
${question}
  `.trim();

  const resendResponse = await fetch(
    'https://api.resend.com/emails',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'China Transit Guide <onboarding@resend.dev>',
        to: ['boli1974@gmail.com'],
        reply_to: email,
        subject: 'New question from China Transit Guide',
        text: emailBody,
      }),
    }
  );

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();
    console.error('Resend error:', errorText);

    return new Response(
      JSON.stringify({
        success: false,
        message: 'We could not send your question. Please try again.',
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Thank you. We received your question.',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
