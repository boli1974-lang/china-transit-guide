import { evaluateTransitEligibility } from '../src/lib/transit-eligibility';

const cases = [
  {
    name: 'PASS - U.S. → China → South Korea',
    expectedStatus: 'pass' as const,
    input: {
      nationality: 'United States',
      passportExpirationDate: '2027-12-31',
      previousCountryOrRegion: 'Japan',
      nextCountryOrRegion: 'South Korea',
      entryPort: 'Shanghai Pudong International Airport',
      exitPort: 'Shanghai Pudong International Airport',
      arrivalDateTime: '2026-09-10',
      departureDateTime: '2026-09-18',
      staysWithinPermittedAreas: 'yes' as const,
      hasConfirmedOnwardTravel: 'yes' as const,
      canEnterOnwardDestination: 'yes' as const,
      specialReviewCircumstances: 'no' as const,
    },
  },
  {
    name: 'FAIL - U.S. → China → U.S.',
    expectedStatus: 'fail' as const,
    input: {
      nationality: 'United States',
      passportExpirationDate: '2027-12-31',
      previousCountryOrRegion: 'United States',
      nextCountryOrRegion: 'United States',
      entryPort: 'Shanghai Pudong International Airport',
      exitPort: 'Shanghai Pudong International Airport',
      arrivalDateTime: '2026-09-10',
      departureDateTime: '2026-09-18',
      staysWithinPermittedAreas: 'yes' as const,
      hasConfirmedOnwardTravel: 'yes' as const,
      canEnterOnwardDestination: 'yes' as const,
      specialReviewCircumstances: 'no' as const,
    },
  },
  {
    name: 'REVIEW - permitted area uncertain',
    expectedStatus: 'review' as const,
    input: {
      nationality: 'United States',
      passportExpirationDate: '2027-12-31',
      previousCountryOrRegion: 'Japan',
      nextCountryOrRegion: 'Hong Kong',
      entryPort: 'Shanghai Pudong International Airport',
      exitPort: 'Shanghai Pudong International Airport',
      arrivalDateTime: '2026-09-10',
      departureDateTime: '2026-09-18',
      staysWithinPermittedAreas: 'unsure' as const,
      hasConfirmedOnwardTravel: 'yes' as const,
      canEnterOnwardDestination: 'yes' as const,
      specialReviewCircumstances: 'no' as const,
    },
  },
  {
    name: 'REVIEW - manual unlisted onward destination',
    expectedStatus: 'review' as const,
    input: {
      nationality: 'United States',
      passportExpirationDate: '2027-12-31',
      previousCountryOrRegion: 'Japan',
      nextCountryOrRegion: 'Kosovo',
      nextCountryOrRegionIsUnlisted: true,
      entryPort: 'Shanghai Pudong International Airport',
      exitPort: 'Shanghai Pudong International Airport',
      arrivalDateTime: '2026-09-10',
      departureDateTime: '2026-09-18',
      staysWithinPermittedAreas: 'yes' as const,
      hasConfirmedOnwardTravel: 'yes' as const,
      canEnterOnwardDestination: 'yes' as const,
      specialReviewCircumstances: 'no' as const,
    },
  },
  {
    name: 'FAIL - manual route matches recognized route',
    expectedStatus: 'fail' as const,
    input: {
      nationality: 'United States',
      passportExpirationDate: '2027-12-31',
      previousCountryOrRegion: 'Japan',
      previousCountryOrRegionIsUnlisted: true,
      nextCountryOrRegion: 'Japan',
      entryPort: 'Shanghai Pudong International Airport',
      exitPort: 'Shanghai Pudong International Airport',
      arrivalDateTime: '2026-09-10',
      departureDateTime: '2026-09-18',
      staysWithinPermittedAreas: 'yes' as const,
      hasConfirmedOnwardTravel: 'yes' as const,
      canEnterOnwardDestination: 'yes' as const,
      specialReviewCircumstances: 'no' as const,
    },
  },
  {
    name: 'FAIL - manual Mainland China route',
    expectedStatus: 'fail' as const,
    input: {
      nationality: 'United States',
      passportExpirationDate: '2027-12-31',
      previousCountryOrRegion: 'Mainland China',
      previousCountryOrRegionIsUnlisted: true,
      nextCountryOrRegion: 'Japan',
      entryPort: 'Shanghai Pudong International Airport',
      exitPort: 'Shanghai Pudong International Airport',
      arrivalDateTime: '2026-09-10',
      departureDateTime: '2026-09-18',
      staysWithinPermittedAreas: 'yes' as const,
      hasConfirmedOnwardTravel: 'yes' as const,
      canEnterOnwardDestination: 'yes' as const,
      specialReviewCircumstances: 'no' as const,
    },
  },
];

for (const testCase of cases) {
  const result = evaluateTransitEligibility(testCase.input);

  if ('expectedStatus' in testCase && result.status !== testCase.expectedStatus) {
    throw new Error(
      `${testCase.name}: expected ${testCase.expectedStatus.toUpperCase()}, got ${result.status.toUpperCase()}`
    );
  }

  console.log('');
  console.log('================================');
  console.log(testCase.name);
  console.log('RESULT:', result.status.toUpperCase());
  console.log('DEADLINE:', result.deadlineChinaDateTime);

  for (const rule of result.rules) {
    console.log(`- ${rule.status.toUpperCase()}: ${rule.label}`);
    console.log(`  ${rule.message}`);
  }
}