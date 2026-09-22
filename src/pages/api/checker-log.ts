import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

type TransitRuleStatus = 'pass' | 'fail' | 'review';
type TransitAnswer = 'yes' | 'no' | 'unsure';

interface CheckerRuleResult {
  id: string;
  status: TransitRuleStatus;
}

interface CheckerLogPayload {
  anonymousSessionId: string;
  searchSequence: number;

  passportCountry: string;
  passportExpirationDate: string;

  previousCountryOrRegion: string;
  previousCountryOrRegionIsUnlisted: boolean;

  nextCountryOrRegion: string;
  nextCountryOrRegionIsUnlisted: boolean;

  entryPort: string;
  exitPort: string;

  arrivalDate: string;
  departureDate: string;

  staysWithinPermittedAreas: TransitAnswer;
  canEnterOnwardDestination: TransitAnswer;
  specialReviewCircumstances: TransitAnswer;

  overallStatus: TransitRuleStatus;
  rules: CheckerRuleResult[];

  checkerVersion: string;
  rulesVersion: string;

  entryPage?: string;
  referrer?: string;

  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;

  deviceType?: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseDateOnly(value: string): Date | null {
  if (!DATE_PATTERN.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function differenceInDays(from: Date, to: Date): number {
  return Math.floor(
    (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)
  );
}

function getPassportValidityBucket(days: number): string {
  if (days < 0) return 'expired';
  if (days < 90) return '<3m';
  if (days < 183) return '3-6m';
  if (days < 365) return '6-12m';
  return '12m+';
}

function isTransitAnswer(value: unknown): value is TransitAnswer {
  return value === 'yes' || value === 'no' || value === 'unsure';
}

function isRuleStatus(value: unknown): value is TransitRuleStatus {
  return value === 'pass' || value === 'fail' || value === 'review';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: CheckerLogPayload;

    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid JSON' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (
      !isNonEmptyString(body.anonymousSessionId) ||
      !Number.isInteger(body.searchSequence) ||
      body.searchSequence < 1 ||
      !isNonEmptyString(body.passportCountry) ||
      !isNonEmptyString(body.passportExpirationDate) ||
      !isNonEmptyString(body.previousCountryOrRegion) ||
      !isNonEmptyString(body.nextCountryOrRegion) ||
      !isNonEmptyString(body.entryPort) ||
      !isNonEmptyString(body.exitPort) ||
      !isNonEmptyString(body.arrivalDate) ||
      !isNonEmptyString(body.departureDate) ||
      !isTransitAnswer(body.staysWithinPermittedAreas) ||
      !isTransitAnswer(body.canEnterOnwardDestination) ||
      !isTransitAnswer(body.specialReviewCircumstances) ||
      !isRuleStatus(body.overallStatus) ||
      !Array.isArray(body.rules) ||
      !isNonEmptyString(body.checkerVersion) ||
      !isNonEmptyString(body.rulesVersion)
    ) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid payload' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    for (const rule of body.rules) {
      if (
        !rule ||
        !isNonEmptyString(rule.id) ||
        !isRuleStatus(rule.status)
      ) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid rule result' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const arrivalDate = parseDateOnly(body.arrivalDate);
    const departureDate = parseDateOnly(body.departureDate);
    const passportExpirationDate = parseDateOnly(
      body.passportExpirationDate
    );

    if (!arrivalDate || !departureDate || !passportExpirationDate) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid date' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const stayDays = differenceInDays(arrivalDate, departureDate);

    const passportValidityDaysAtArrival = differenceInDays(
      arrivalDate,
      passportExpirationDate
    );

    const passportValidityBucket = getPassportValidityBucket(
      passportValidityDaysAtArrival
    );

    const id = crypto.randomUUID();

    const cf = request.cf;
   const ipCountry =
  typeof cf?.country === 'string' ? cf.country : null;

    const insertSearch = env.CHECKER_DB.prepare(`
      INSERT INTO checker_searches (
        id,
        anonymous_session_id,
        search_sequence,
        passport_country,
        passport_validity_days_at_arrival,
        passport_validity_bucket,
        previous_country_or_region,
        previous_country_or_region_is_unlisted,
        next_country_or_region,
        next_country_or_region_is_unlisted,
        entry_port,
        exit_port,
        arrival_date,
        departure_date,
        stay_days,
        stays_within_permitted_areas,
        can_enter_onward_destination,
        special_review_circumstances,
        overall_status,
        checker_version,
        rules_version,
        entry_page,
        referrer,
        utm_source,
        utm_medium,
        utm_campaign,
       ip_country,
        device_type
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).bind(
      id,
      body.anonymousSessionId,
      body.searchSequence,
      body.passportCountry,
      passportValidityDaysAtArrival,
      passportValidityBucket,
      body.previousCountryOrRegion,
      body.previousCountryOrRegionIsUnlisted ? 1 : 0,
      body.nextCountryOrRegion,
      body.nextCountryOrRegionIsUnlisted ? 1 : 0,
      body.entryPort,
      body.exitPort,
      body.arrivalDate,
      body.departureDate,
      stayDays,
      body.staysWithinPermittedAreas,
      body.canEnterOnwardDestination,
      body.specialReviewCircumstances,
      body.overallStatus,
      body.checkerVersion,
      body.rulesVersion,
      body.entryPage ?? null,
      body.referrer ?? null,
      body.utmSource ?? null,
      body.utmMedium ?? null,
      body.utmCampaign ?? null,
      visitorCountry,
      body.deviceType ?? null
    );

    const ruleStatements = body.rules.map((rule) =>
      env.CHECKER_DB.prepare(`
        INSERT INTO checker_rule_results (
          checker_search_id,
          rule_id,
          rule_status
        )
        VALUES (?, ?, ?)
      `).bind(id, rule.id, rule.status)
    );

    await env.CHECKER_DB.batch([
      insertSearch,
      ...ruleStatements,
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        id,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Failed to log checker search', error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Unable to log checker search',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
