// import type { Report } from './schema';

// /** Phrases that would turn a critical-thinking report into a verdict. */
// const DIRECTIVES: RegExp[] = [
//   /\byou (should|must|ought to|need to) (definitely |absolutely )?(accept|decline|choose|take|pick|reject|go with|say yes|say no|quit|stay|leave)\b/i,
//   /\bi (strongly )?(recommend|advise|suggest) (that )?(you )?(accept|decline|choose|take|pick|reject|go|say|quit|stay|leave)\b/i,
//   /\b(definitely|clearly|obviously) (accept|decline|choose|take|go with|reject)\b/i,
//   /\bthe (best|right|better|smart) (choice|option|decision|move) is\b/i,
//   /\btherefore,? (you should |accept|decline|choose|take)\b/i,
// ];

// function allText(report: Report): string[] {
//   return [
//     report.reasoning_summary,
//     report.key_takeaway,
//     report.uncertainty_note,
//     ...report.reflection_questions,
//     ...[
//       ...report.assumptions,
//       ...report.overlooked_factors,
//       ...report.missing_evidence,
//       ...report.reasoning_tensions,
//       ...report.alternative_perspectives,
//     ].flatMap((i) => [i.title, i.description]),
//   ];
// }

// /** Returns the first directive phrase found in the report, or null. */
// export function findDirective(report: Report): string | null {
//   for (const chunk of allText(report)) {
//     for (const pattern of DIRECTIVES) {
//       const match = chunk.match(pattern);
//       if (match) return match[0];
//     }
//   }
//   return null;
// }




import type { Report } from './schema';

/** The thing being decided on. "take"/"leave" only count as a verdict when aimed at it. */
const OPTION = '(?:the |this |that |your |an? )?(?:offer|job|internship|position|role)';
/** "take it" / "leave it" is a verdict only when the clause ends there ("take it slowly" is fine). */
const BARE_IT = '(?:take|leave) it(?=\\s*(?:[.!?,;]|$))';
const VERDICT = `accept|decline|choose|reject|go with|say yes|say no|quit|(?:pick|select|take|leave) ${OPTION}|${BARE_IT}`;

/** Phrases that would turn a critical-thinking report into a verdict. */
const DIRECTIVES: RegExp[] = [
  new RegExp(`\\byou (?:should|must|ought to|need to) (?:definitely |absolutely )?(?:${VERDICT})\\b`, 'i'),
  new RegExp(`\\bi (?:strongly )?(?:recommend|advise|suggest) (?:that )?(?:you )?(?:${VERDICT})\\b`, 'i'),
  new RegExp(`\\b(?:definitely|clearly|obviously) (?:${VERDICT})\\b`, 'i'),
  /\bthe (best|right|better|smart) (choice|option|decision|move) is\b/i,
  new RegExp(`\\btherefore,? (?:you should )?(?:${VERDICT})\\b`, 'i'),
];

function allText(report: Report): string[] {
  return [
    report.reasoning_summary,
    report.key_takeaway,
    report.uncertainty_note,
    ...report.reflection_questions,
    ...[
      ...report.assumptions,
      ...report.overlooked_factors,
      ...report.missing_evidence,
      ...report.reasoning_tensions,
      ...report.alternative_perspectives,
    ].flatMap((i) => [i.title, i.description]),
  ];
}

/** Returns the first directive phrase found in the report, or null. */
export function findDirective(report: Report): string | null {
  for (const chunk of allText(report)) {
    for (const pattern of DIRECTIVES) {
      const match = chunk.match(pattern);
      if (match) return match[0];
    }
  }
  return null;
}

