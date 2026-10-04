import type { DecisionInput, Report } from '@/lib/schema';

export const validInput: DecisionInput = {
  decision: 'Should I accept a 6-month internship?',
  context: 'Stipend 25k, 20 minutes from home.',
  reasoning: 'The stipend is good and it is close to home, and it gives industry experience.',
  values: ['Money'],
};

export const validReport: Report = {
  reasoning_summary: 'You are prioritizing stipend, proximity and experience.',
  assumptions: [{ title: 'Experience will be valuable', description: 'You may be assuming the role teaches transferable skills.', impact_if_wrong: 'high' }],
  overlooked_factors: [{ title: 'Academic load', description: 'One factor worth examining is exam timing.', importance: 'high' }],
  missing_evidence: [{ title: 'Mentorship', description: 'Who would guide your work day to day?' }],
  reasoning_tensions: [],
  alternative_perspectives: [{ title: 'A mentor', description: 'Someone senior might weigh learning over pay.' }],
  reflection_questions: ['What would you need to learn for this to feel worthwhile?'],
  key_takeaway: 'Your reasoning leans on immediate benefits while long-term learning value is unconfirmed.',
  uncertainty_note: 'Nothing is known about the role itself beyond what you shared.',
};
