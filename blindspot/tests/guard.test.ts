// import { describe, expect, it } from 'vitest';
// import { findDirective } from '@/lib/guard';
// import { validReport } from './fixtures';

// describe('findDirective', () => {
//   it('passes a neutral report', () => expect(findDirective(validReport)).toBeNull());

//   it.each([
//     'You should accept the internship.',
//     'I recommend that you decline.',
//     'The best choice is to take it.',
//     'Therefore, accept the offer.',
//     'You must definitely choose the startup.',
//   ])('flags verdict language: %s', (phrase) => {
//     expect(findDirective({ ...validReport, key_takeaway: phrase })).not.toBeNull();
//   });

//   it('checks nested item text too', () => {
//     const r = { ...validReport, assumptions: [{ title: 't', description: 'You should take it.', impact_if_wrong: 'low' as const }] };
//     expect(findDirective(r)).not.toBeNull();
//   });
// });


import { describe, expect, it } from 'vitest';
import { findDirective } from '@/lib/guard';
import { validReport } from './fixtures';

describe('findDirective', () => {
  it('passes a neutral report', () => expect(findDirective(validReport)).toBeNull());

  it.each([
    'You should accept the internship.',
    'I recommend that you decline.',
    'The best choice is to take it.',
    'Therefore, accept the offer.',
    'You must definitely choose the startup.',
  ])('flags verdict language: %s', (phrase) => {
    expect(findDirective({ ...validReport, key_takeaway: phrase })).not.toBeNull();
  });

  it.each([
    'You should take the internship.',
    'You need to leave the job.',
    'I suggest you take the offer.',
    'Obviously take the job.',
    'You should leave it.',
    'You should pick the internship.',
    'I recommend you select the job.',
  ])('still flags verdicts aimed at the option: %s', (phrase) => {
    expect(findDirective({ ...validReport, key_takeaway: phrase })).not.toBeNull();
  });

  it.each([
    'You should take time to check the exam schedule.',
    'You need to take into account the commute.',
    'You should leave room for studying.',
    'I suggest that you pick one question to answer first.',
    'You might need to stay longer on exam weeks.',
    'You should take the opportunity to ask about mentorship.',
    'You should take it slowly when comparing offers.',
  ])('allows benign phrasing: %s', (phrase) => {
    expect(findDirective({ ...validReport, key_takeaway: phrase })).toBeNull();
  });

  it('checks nested item text too', () => {
    const r = { ...validReport, assumptions: [{ title: 't', description: 'You should take it.', impact_if_wrong: 'low' as const }] };
    expect(findDirective(r)).not.toBeNull();
  });
});
