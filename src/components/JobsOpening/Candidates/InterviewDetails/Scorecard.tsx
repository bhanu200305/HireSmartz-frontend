import { EvaluationResponseDto } from '../../../../types';
import { makeFirstLetterUpperCase, snakeToCamelCase } from '../../../../shared/utils/methods';

type ScorecardProps = {
  evalResponse?: EvaluationResponseDto & {
    weighted_score_details?: {
      categoryScores?: Record<string, number | string | null | undefined>;
      missingCategories?: string[];
    };
  };
};

type FocusAreaKey =
  | 'skills'
  | 'qualifications'
  | 'personality_traits'
  | 'career_goals'
  | 'company_fit';

type FocusAreaSection = {
  areaKey: string;
  sectionScore: string | number;
};

const FOCUS_AREA_ORDER: FocusAreaKey[] = [
  'skills',
  'qualifications',
  'personality_traits',
  'career_goals',
  'company_fit',
];

const FOCUS_AREA_LABELS: Record<FocusAreaKey, string> = {
  skills: 'Skills',
  qualifications: 'Qualifications',
  personality_traits: 'Personality Traits',
  career_goals: 'Career Goals',
  company_fit: 'Company Fit',
};

const STATIC_SCORECARD_ATTRIBUTES: Record<string, string[]> = {
  skills: ['Technical skills', 'Soft skills', 'Communication ability'],
  qualifications: ['Education', 'Certifications', 'Relevant professional experience'],
  personality_traits: [
    'Confidence',
    'Teamwork',
    'Initiative',
    'Adaptability',
    'Poise under pressure',
  ],
  career_goals: ['Motivation', 'Growth mindset', 'Long-term aspirations', 'Role alignment'],
  company_fit: [
    'Cultural alignment',
    'Role understanding',
    'Alignment with company mission',
    'Genuine interest',
  ],
};

const normalizeFocusAreaKey = (area: string): string =>
  area
    .replace(/[\s-]+/g, '_')
    .trim()
    .toLowerCase();

const resolveFocusAreaKey = (area: string): FocusAreaKey | null => {
  const normalized = normalizeFocusAreaKey(area);

  switch (normalized) {
    case 'skills':
    case 'qualifications':
    case 'personality_traits':
    case 'career_goals':
    case 'company_fit':
      return normalized;
    default:
      return null;
  }
};

const getStaticAttributesByArea = (area: string): string[] => {
  const normalizedArea = normalizeFocusAreaKey(area);
  return STATIC_SCORECARD_ATTRIBUTES[normalizedArea] || [];
};

const getSectionScore = (sectionData: unknown): string | number => {
  if (!sectionData || typeof sectionData !== 'object') {
    return 'N/A';
  }

  const score = (sectionData as { score?: string | number }).score;
  if (score === undefined || score === null || score === '') {
    return 'N/A';
  }

  return score;
};

const buildWeightedSections = (
  evalResponse?: ScorecardProps['evalResponse']
): FocusAreaSection[] => {
  if (!evalResponse?.weighted_score_details?.categoryScores) {
    return [];
  }

  const rawScores = evalResponse.weighted_score_details.categoryScores;
  const missingCategories = evalResponse.weighted_score_details.missingCategories || [];

  const mappedScores: Partial<Record<FocusAreaKey, string | number>> = {};

  Object.entries(rawScores).forEach(([rawKey, score]) => {
    const resolvedKey = resolveFocusAreaKey(rawKey);
    if (!resolvedKey) {
      return;
    }

    if (score === undefined || score === null || score === '') {
      return;
    }

    mappedScores[resolvedKey] = score;
  });

  const missingSet = new Set<FocusAreaKey>();
  missingCategories.forEach((category) => {
    const resolvedKey = resolveFocusAreaKey(category);
    if (resolvedKey) {
      missingSet.add(resolvedKey);
    }
  });

  return FOCUS_AREA_ORDER.map((areaKey) => ({
    areaKey,
    sectionScore: missingSet.has(areaKey) ? 'N/A' : (mappedScores[areaKey] ?? 'N/A'),
  }));
};

const buildLegacySections = (evalResponse?: ScorecardProps['evalResponse']): FocusAreaSection[] => {
  if (!evalResponse?.scorecard || evalResponse.scorecard.length === 0) {
    return [];
  }

  return evalResponse.scorecard.flatMap((scorecard) =>
    Object.entries(scorecard).map(([area, sectionData]) => ({
      areaKey: area,
      sectionScore: getSectionScore(sectionData),
    }))
  );
};

const getFocusAreaLabel = (area: string): string => {
  const resolvedKey = resolveFocusAreaKey(area);
  if (resolvedKey) {
    return FOCUS_AREA_LABELS[resolvedKey];
  }

  return makeFirstLetterUpperCase(snakeToCamelCase(area));
};

const Scorecard = ({ evalResponse }: ScorecardProps) => {
  const weightedSections = buildWeightedSections(evalResponse);
  const sectionsToRender =
    weightedSections.length > 0 ? weightedSections : buildLegacySections(evalResponse);

  if (sectionsToRender.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-700 bg-white shadow-sm max-w-3xl mx-auto mt-6">
        <p className="font-black">No scorecard released yet</p>
      </div>
    );
  }

  return (
    <div className="py-6 max-w-3xl text-sm mx-auto">
      <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-4 font-semibold text-gray-700">Interview focus areas</th>
              <th className="p-4 font-semibold text-gray-700">Attributes</th>
              <th className="p-4 font-semibold text-gray-700 text-center whitespace-nowrap">
                Score (Max 5)
              </th>
            </tr>
          </thead>
          <tbody>
            {sectionsToRender.map((section, index) => {
              const attributes = getStaticAttributesByArea(section.areaKey);

              return (
                <tr key={index + section.areaKey} className="border-t border-gray-100 align-top">
                  <td className="p-4 text-gray-600">{getFocusAreaLabel(section.areaKey)}</td>
                  <td className="p-4 text-gray-600">
                    {attributes.length > 0 ? (
                      <div className="space-y-1">
                        {attributes.map((attribute: string, attributeIndex: number) => (
                          <p key={attribute + attributeIndex}>{attribute}</p>
                        ))}
                      </div>
                    ) : (
                      <p>N/A</p>
                    )}
                  </td>
                  <td className="p-4 text-gray-600  text-center">{section.sectionScore}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Scorecard;
