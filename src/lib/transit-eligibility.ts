import {
  CHINA_TRANSIT_MIN_DOCUMENT_VALIDITY_MONTHS,
  CHINA_TRANSIT_POLICY_HOURS,
  chinaTransitEligibleCountries,
  chinaTransitPorts,
} from '../data/china-transit-policy';

export type TransitAnswer = 'yes' | 'no' | 'unsure';

export type TransitRuleStatus = 'pass' | 'fail' | 'review';

export interface TransitEligibilityInput {
  nationality: string;
  passportExpirationDate: string;

  previousCountryOrRegion: string;
  nextCountryOrRegion: string;

  previousCountryOrRegionIsUnlisted?: boolean;
  nextCountryOrRegionIsUnlisted?: boolean;

  entryPort: string;
  exitPort: string;

  arrivalDateTime: string;
  departureDateTime: string;

  staysWithinPermittedAreas: TransitAnswer;
  canEnterOnwardDestination: TransitAnswer;
  specialReviewCircumstances: TransitAnswer;
}

export interface TransitRuleResult {
  id: string;
  label: string;
  status: TransitRuleStatus;
  message: string;
}

export interface TransitEligibilityResult {
  status: TransitRuleStatus;
  rules: TransitRuleResult[];
  deadlineChinaDateTime?: string;
  deadlineChinaDateTimeDisplay?: string;
}

const eligibleCountrySet = new Set<string>(chinaTransitEligibleCountries);

const portMap = new Map(
  chinaTransitPorts.map((port) => [port.portName, port])
);

function normalizePlace(value: string) {
  return value.trim().toLowerCase();
}

function addDaysToDateString(dateString: string, days: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function addMonthsToDateString(dateString: string, months: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex =
    ((targetMonthIndex % 12) + 12) % 12;

  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, normalizedMonthIndex + 1, 0)
  ).getUTCDate();

  const targetDay = Math.min(day, lastDayOfTargetMonth);

  return [
    targetYear,
    String(normalizedMonthIndex + 1).padStart(2, '0'),
    String(targetDay).padStart(2, '0'),
  ].join('-');
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatDateString(dateString: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

  if (!match) {
    return dateString;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

function formatChinaDateTimeForDisplay(date: Date) {
  const chinaTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  const year = chinaTime.getUTCFullYear();
  const month = chinaTime.getUTCMonth();
  const day = chinaTime.getUTCDate();
  const hours = String(chinaTime.getUTCHours()).padStart(2, '0');
  const minutes = String(chinaTime.getUTCMinutes()).padStart(2, '0');

  return `${MONTH_NAMES[month]} ${day}, ${year} at ${hours}:${minutes}`;
}

function parseChinaDateTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?$/.test(value)) {
    return null;
  }

  const chinaDateTime = value.includes('T')
    ? `${value}:00+08:00`
    : `${value}T00:00:00+08:00`;

  const date = new Date(chinaDateTime);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatChinaDateTime(date: Date) {
  const chinaTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  const year = chinaTime.getUTCFullYear();
  const month = String(chinaTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(chinaTime.getUTCDate()).padStart(2, '0');
  const hours = String(chinaTime.getUTCHours()).padStart(2, '0');
  const minutes = String(chinaTime.getUTCMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function evaluateYesNoUnsure(
  id: string,
  label: string,
  answer: TransitAnswer,
  yesMessage: string,
  noMessage: string,
  unsureMessage: string
): TransitRuleResult {
  if (answer === 'yes') {
    return {
      id,
      label,
      status: 'pass',
      message: yesMessage,
    };
  }

  if (answer === 'no') {
    return {
      id,
      label,
      status: 'fail',
      message: noMessage,
    };
  }

  return {
    id,
    label,
    status: 'review',
    message: unsureMessage,
  };
}

export function evaluateTransitEligibility(
  input: TransitEligibilityInput
): TransitEligibilityResult {
  const rules: TransitRuleResult[] = [];

  // 1. Nationality
  if (eligibleCountrySet.has(input.nationality)) {
    rules.push({
      id: 'nationality',
      label: 'Eligible nationality',
      status: 'pass',
      message: `${input.nationality} is currently on the 240-hour visa-free transit nationality list.`,
    });
  } else {
    rules.push({
      id: 'nationality',
      label: 'Eligible nationality',
      status: 'fail',
      message: `${input.nationality || 'This nationality'} is not currently on the 240-hour eligibility list.`,
    });
  }

  // 2. Passport validity
  const arrivalDate = input.arrivalDateTime.slice(0, 10);

  const minimumPassportDate = addMonthsToDateString(
    arrivalDate,
    CHINA_TRANSIT_MIN_DOCUMENT_VALIDITY_MONTHS
  );

  const arrivalDateDisplay = formatDateString(arrivalDate);
  const minimumPassportDateDisplay = minimumPassportDate
    ? formatDateString(minimumPassportDate)
    : '';

  if (!minimumPassportDate || !input.passportExpirationDate) {
    rules.push({
      id: 'passport-validity',
      label: 'Travel-document validity',
      status: 'review',
      message:
        'Passport validity could not be evaluated from the dates provided.',
    });
  } else if (input.passportExpirationDate < minimumPassportDate) {
    let message =
      `Your passport does not appear to meet the 240-hour policy's validity requirement. ` +
      `It should remain valid for at least 3 months after arrival. ` +
      `Based on your planned arrival on ${arrivalDateDisplay}, your passport should be valid through at least ${minimumPassportDateDisplay}.`;

    if (input.nationality === 'United States') {
      message +=
        ' For U.S. passport holders, the U.S. Department of State advises having at least 6 months of passport validity beyond the date of arrival in China.';
    }

    rules.push({
      id: 'passport-validity',
      label: 'Travel-document validity',
      status: 'fail',
      message,
    });
  } else {
    let message =
      'Your passport appears to meet the 240-hour policy minimum of at least 3 months of validity after arrival.';

    if (input.nationality === 'United States') {
      const sixMonthDate = addMonthsToDateString(arrivalDate, 6);

      if (
        sixMonthDate &&
        input.passportExpirationDate >= sixMonthDate
      ) {
        message +=
          ' For U.S. passport holders, it also appears to meet the U.S. Department of State recommendation of at least 6 months of validity beyond arrival in China.';
      }
    }

    rules.push({
      id: 'passport-validity',
      label: 'Travel-document validity',
      status: 'pass',
      message,
    });
  }

  // Additional U.S.-specific passport guidance
  if (input.nationality === 'United States') {
    const sixMonthDate = addMonthsToDateString(arrivalDate, 6);

    if (
      sixMonthDate &&
      input.passportExpirationDate &&
      input.passportExpirationDate < sixMonthDate &&
      input.passportExpirationDate >= (minimumPassportDate ?? '')
    ) {
      rules.push({
        id: 'us-passport-guidance',
        label: 'U.S. passport guidance',
        status: 'review',
        message:
          `Your passport appears to meet China's 3-month minimum for the 240-hour policy. ` +
          `However, the U.S. Department of State advises U.S. passport holders to have at least 6 months of validity beyond arrival. ` +
          `Based on your planned arrival on ${arrivalDateDisplay}, that means validity through at least ${formatDateString(sixMonthDate)}.`,
      });
    }
  }

  // 3. Transit route
  const previousPlace = normalizePlace(input.previousCountryOrRegion);
  const nextPlace = normalizePlace(input.nextCountryOrRegion);

  const previousIsUnlisted =
    Boolean(input.previousCountryOrRegionIsUnlisted);

  const nextIsUnlisted =
    Boolean(input.nextCountryOrRegionIsUnlisted);

  if (!previousPlace || !nextPlace) {
    rules.push({
      id: 'route',
      label: 'Third-country or region transit',
      status: 'review',
      message:
        'The country or region immediately before and after Mainland China must both be provided.',
    });
  } else if (
    previousPlace === 'mainland china' ||
    nextPlace === 'mainland china'
  ) {
    rules.push({
      id: 'route',
      label: 'Third-country or region transit',
      status: 'fail',
      message:
        'The locations immediately before and after Mainland China must be outside Mainland China.',
    });
  } else if (previousPlace === nextPlace) {
    rules.push({
      id: 'route',
      label: 'Third-country or region transit',
      status: 'fail',
      message:
        `The country or region immediately before and after Mainland China is the same (${input.previousCountryOrRegion}), so the route does not satisfy the transit structure.`,
    });
  } else if (previousIsUnlisted || nextIsUnlisted) {
    const manualLocations = [
      previousIsUnlisted
        ? input.previousCountryOrRegion
        : null,
      nextIsUnlisted
        ? input.nextCountryOrRegion
        : null,
    ]
      .filter(Boolean)
      .join(' and ');

    rules.push({
      id: 'route',
      label: 'Third-country or region transit',
      status: 'review',
      message:
        `${input.previousCountryOrRegion} → Mainland China → ${input.nextCountryOrRegion} cannot be fully verified by this checker. ${manualLocations} was entered manually and is not in our standardized country/region list, so we cannot determine whether this itinerary will be accepted as transit to a third country or region under the 240-hour policy. Before traveling, confirm the itinerary with China’s National Immigration Administration or the immigration inspection authority at your intended Chinese port of entry.`,
    });
  } else {
    rules.push({
      id: 'route',
      label: 'Third-country or region transit',
      status: 'pass',
      message:
        `${input.previousCountryOrRegion} → Mainland China → ${input.nextCountryOrRegion} passes the core route test.`,
    });
  }

  // 4. Entry port
  const entryPort = portMap.get(input.entryPort);

  if (entryPort) {
    rules.push({
      id: 'entry-port',
      label: 'Eligible entry port',
      status: 'pass',
      message: `${entryPort.portName} is in the current designated-port dataset.`,
    });
  } else {
    rules.push({
      id: 'entry-port',
      label: 'Eligible entry port',
      status: 'fail',
      message: 'The selected entry port is not in the current designated 240-hour port dataset.',
    });
  }

  // 5. Exit port
  const exitPort = portMap.get(input.exitPort);

  if (exitPort) {
    rules.push({
      id: 'exit-port',
      label: 'Eligible departure port',
      status: 'pass',
      message: `${exitPort.portName} is in the current designated-port dataset.`,
    });
  } else {
    rules.push({
      id: 'exit-port',
      label: 'Eligible departure port',
      status: 'review',
      message:
        'The departure port is not in the current 65-port dataset. Some special exit arrangements may require manual verification.',
    });
  }

  // 6. Time limit
  const arrival = parseChinaDateTime(input.arrivalDateTime);
  const departure = parseChinaDateTime(input.departureDateTime);

  let deadlineChinaDateTime: string | undefined;
  let deadlineChinaDateTimeDisplay: string | undefined;

  if (!arrival || !departure) {
    rules.push({
      id: 'time',
      label: '240-hour time limit',
      status: 'review',
      message: 'Arrival or departure date/time could not be evaluated.',
    });
  } else if (
    input.departureDateTime.slice(0, 10) <
    input.arrivalDateTime.slice(0, 10)
  ) {
    rules.push({
      id: 'time',
      label: '240-hour time limit',
      status: 'fail',
      message: 'The planned departure date must not be before the arrival date in Mainland China.',
    });
  } else {
    const nextDay = addDaysToDateString(
      input.arrivalDateTime.slice(0, 10),
      1
    );

    if (!nextDay) {
      rules.push({
        id: 'time',
        label: '240-hour time limit',
        status: 'review',
        message: 'The 240-hour deadline could not be calculated.',
      });
    } else {
      const clockStart = new Date(`${nextDay}T00:00:00+08:00`);

      const deadline = new Date(
        clockStart.getTime() +
          CHINA_TRANSIT_POLICY_HOURS * 60 * 60 * 1000
      );

      deadlineChinaDateTime = formatChinaDateTime(deadline);
      deadlineChinaDateTimeDisplay =
        formatChinaDateTimeForDisplay(deadline);

      const clockStartDisplay =
        formatChinaDateTimeForDisplay(clockStart);

      const arrivalDisplay =
        formatDateString(input.arrivalDateTime.slice(0, 10));

      if (
        input.departureDateTime.slice(0, 10) <
        deadlineChinaDateTime.slice(0, 10)
      ) {
        rules.push({
          id: 'time',
          label: '240-hour time limit',
          status: 'pass',
          message:
            `Your planned departure is within the 240-hour period. ` +
            `Because you arrive on ${arrivalDisplay}, the 240-hour clock starts on ${clockStartDisplay} China time. ` +
            `Your calculated departure deadline is ${deadlineChinaDateTimeDisplay} China time.`,
        });
      } else {
        rules.push({
          id: 'time',
          label: '240-hour time limit',
          status: 'fail',
          message:
            `Your planned departure is after the 240-hour limit. ` +
            `Because you arrive on ${arrivalDisplay}, the 240-hour clock starts on ${clockStartDisplay} China time. ` +
            `Your calculated departure deadline is ${deadlineChinaDateTimeDisplay} China time.`,
        });
      }
    }
  }

  // 7. Permitted travel areas
  rules.push(
    evaluateYesNoUnsure(
      'geography',
      'Permitted travel areas',
      input.staysWithinPermittedAreas,
      'You confirmed that all planned travel in Mainland China will remain within the current permitted areas.',
      'Travel outside the designated permitted areas does not meet the 240-hour policy requirements.',
      'You should verify every Mainland China destination against the current permitted-area list.'
    )
  );

  // 8. Entry authorization for onward destination
  rules.push(
    evaluateYesNoUnsure(
      'onward-entry',
      'Legal entry to onward destination',
      input.canEnterOnwardDestination,
      'You confirmed that you meet the entry requirements for your onward country or region.',
      'You must be able to enter your onward country or region.',
      'Verify that you meet the entry requirements for your onward country or region.'
    )
  );

  // 9. Circumstances requiring individual review
  if (input.specialReviewCircumstances === 'no') {
    rules.push({
      id: 'special-review',
      label: 'Individual-review circumstances',
      status: 'pass',
      message: 'No additional individual-review circumstances were reported.',
    });
  } else {
    rules.push({
      id: 'special-review',
      label: 'Individual-review circumstances',
      status: 'review',
      message:
        'Your circumstances may require individual review by Chinese immigration authorities before relying on the checker result.',
    });
  }

  const status: TransitRuleStatus = rules.some(
    (rule) => rule.status === 'fail'
  )
    ? 'fail'
    : rules.some((rule) => rule.status === 'review')
      ? 'review'
      : 'pass';

  return {
    status,
    rules,
    deadlineChinaDateTime,
    deadlineChinaDateTimeDisplay,
  };
}