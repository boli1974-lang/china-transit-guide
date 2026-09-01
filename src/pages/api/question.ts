import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_QUESTION_LENGTH = 3000;

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_SECONDS = 60 * 60;

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function isValidEmail(email: string) {
  if (email.length > MAX_EMAIL_LENGTH) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function checkRateLimit(request: Request) {
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown';

  const key = `question-rate:${ip}`;

  const existing = await env.SESSION.get(key);
  const count = Number(existing || '0');

  if (count >= RATE_LIMIT_MAX) {
    return false;
  }

  await env.SESSION.put(
    key,
    String(count + 1),
    {
      expirationTtl: RATE_LIMIT_SECONDS,
    }
  );

  return true;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const question = String(formData.get('question') || '').trim();

    const permissionToPublish =
      formData.get('permissionToPublish') === 'yes';

    // Hidden honeypot field for basic bot protection.
    const website = String(formData.get('website') || '').trim();

    if (website) {
      return jsonResponse({
        success: true,
        message: 'Thank you. We received your question.',
      });
    }

    if (!email || !question) {
      return jsonResponse(
        {
          success: false,
          message: 'Email and question are required.',
        },
        400
      );
    }

    if (!isValidEmail(email)) {
      return jsonResponse(
        {
          success: false,
          message: 'Please enter a valid email address.',
        },
        400
      );
    }

    if (name.length > MAX_NAME_LENGTH) {
      return jsonResponse(
        {
          success: false,
          message: 'Please shorten your name.',
        },
        400
      );
    }

    if (question.length > MAX_QUESTION_LENGTH) {
      return jsonResponse(
        {
          success: false,
          message: 'Please keep your question under 3,000 characters.',
        },
        400
      );
    }

    const allowed = await checkRateLimit(request);

    if (!allowed) {
      return jsonResponse(
        {
          success: false,
          message:
            'Too many questions have been submitted from this connection. Please try again later.',
        },
        429
      );
    }

    const apiKey = env.RESEND_API_KEY;

    if (!apiKey) {
      console.error('RESEND_API_KEY is not available.');

      return jsonResponse(
        {
          success: false,
          message:
            'The question service is temporarily unavailable. Please try again later.',
        },
        500
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

      return jsonResponse(
        {
          success: false,
          message:
            'We could not send your question. Please try again.',
        },
        502
      );
    }

    return jsonResponse({
      success: true,
      message: 'Thank you. We received your question.',
    });
  } catch (error) {
    console.error('Question submission error:', error);

    return jsonResponse(
      {
        success: false,
        message:
          'Something went wrong while submitting your question. Please try again.',
      },
      500
    );
  }
};