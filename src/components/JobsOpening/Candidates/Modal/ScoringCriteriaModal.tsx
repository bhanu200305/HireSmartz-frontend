import React from 'react';
import { Modal } from 'antd';
import { useModalCloseAttention } from '../../../shared/ui/useModalCloseAttention';

type ScoringCriteriaModalProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  subtitle?: string;
  matchMetrics?: {
    label: string;
    value?: string;
    max: number;
  }[];
};

const RESUME_METRIC_LABELS = {
  SKILLS_MATCH: 'Skills Match',
  EXPERIENCE_MATCH: 'Experience Match',
  QUALIFICATIONS: 'Qualifications',
  KEYWORD_PRESENCE: 'Keyword Presence',
} as const;

type ResumeMetricLabel = (typeof RESUME_METRIC_LABELS)[keyof typeof RESUME_METRIC_LABELS];

type ScoringBreakdownItem = {
  label: ResumeMetricLabel;
  max: number;
  description: string;
};

const ScoringCriteriaModal: React.FC<ScoringCriteriaModalProps> = ({
  visible,
  onClose,
  title,
  footer,
  subtitle,
  matchMetrics,
}) => {
  const withCloseAttention = useModalCloseAttention();
  const METRIC_DESCRIPTION_MAP: Record<ResumeMetricLabel, string> = {
    [RESUME_METRIC_LABELS.SKILLS_MATCH]:
      'Evaluates resumes based on exact matches to the required skills listed in the job description.',
    [RESUME_METRIC_LABELS.EXPERIENCE_MATCH]:
      'Quantifies relevant roles and years of experience to determine job alignment.',
    [RESUME_METRIC_LABELS.QUALIFICATIONS]:
      'Assesses education levels and certifications for relevant matches.',
    [RESUME_METRIC_LABELS.KEYWORD_PRESENCE]:
      'Scores based on the presence of specific terms from the job description.',
  };

  const DEFAULT_SCORING_BREAKDOWN: ScoringBreakdownItem[] = [
    {
      label: RESUME_METRIC_LABELS.SKILLS_MATCH,
      max: 40,
      description: METRIC_DESCRIPTION_MAP[RESUME_METRIC_LABELS.SKILLS_MATCH],
    },
    {
      label: RESUME_METRIC_LABELS.EXPERIENCE_MATCH,
      max: 30,
      description: METRIC_DESCRIPTION_MAP[RESUME_METRIC_LABELS.EXPERIENCE_MATCH],
    },
    {
      label: RESUME_METRIC_LABELS.QUALIFICATIONS,
      max: 20,
      description: METRIC_DESCRIPTION_MAP[RESUME_METRIC_LABELS.QUALIFICATIONS],
    },
    {
      label: RESUME_METRIC_LABELS.KEYWORD_PRESENCE,
      max: 10,
      description: METRIC_DESCRIPTION_MAP[RESUME_METRIC_LABELS.KEYWORD_PRESENCE],
    },
  ];

  const dynamicScoringBreakdown: ScoringBreakdownItem[] =
    matchMetrics
      ?.map((metric) => {
        const max = Number(metric.max) || 0;
        const label = metric.label as ResumeMetricLabel;

        return {
          label,
          max,
          description: METRIC_DESCRIPTION_MAP[label] || '',
        };
      })
      .filter((metric) => metric.description) || [];

  const scoringBreakdown =
    dynamicScoringBreakdown.length > 0 ? dynamicScoringBreakdown : DEFAULT_SCORING_BREAKDOWN;

  const POINTS_ALLOCATION_PREFIX_MAP: Record<ResumeMetricLabel, string> = {
    [RESUME_METRIC_LABELS.SKILLS_MATCH]: '+10 points per matching skill',
    [RESUME_METRIC_LABELS.EXPERIENCE_MATCH]: '+5 points per relevant year/role',
    [RESUME_METRIC_LABELS.QUALIFICATIONS]: '+10 points per matching degree or certification',
    [RESUME_METRIC_LABELS.KEYWORD_PRESENCE]: '+2 points per job description-specific term',
  };

  const renderDefaultContent = () => (
    <div className="-mx-6 max-h-[90vh] overflow-y-auto px-6 py-4 space-y-6">
      <h2 className="text-2xl font-semibold text-center mb-8">{title || 'Scoring Criteria'}</h2>

      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Scoring Breakdown</h3>
        <div className="bg-white border border-gray-200 rounded-md p-4 text-sm space-y-1">
          <p className="pb-2">
            The System uses a weighted system to score resumes based on various criteria. Below is
            the detailed breakdown:
          </p>
          <ul className="list-disc ml-7 space-y-2">
            {scoringBreakdown.map((metric) => (
              <li key={metric.label}>
                {metric.label}: {metric.max}% - {metric.description}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-8 pt-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <span className="w-12 h-4 rounded-xl bg-[#2B934E]"></span>
              <span>Percentage ≥ 80%</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-12 h-4 rounded-xl bg-[#FFBF00]"></span>
              <span>Percentage ≥ 50 && Percentage ≤ 79</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-12 h-4 rounded-xl bg-[#FF3B30]"></span>
              <span>Percentage ≥ 1 && Percentage ≤ 49</span>
            </div>
          </div>
        </div>
      </section>

      {/* commented out as per new design, can be added back if needed in the future */}
      {/* <section className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Deductions</h3>
        <div className="bg-white border border-gray-200 rounded-md p-4 text-sm">
          <p className="pb-2">Points are deducted for missing critical requirements:</p>
          <ul className="list-disc ml-7 space-y-2">
            <li>
              Deduct 10 to 20 points for missing essential tools, degrees, or certifications deemed
              mandatory in the job description.
            </li>
          </ul>
        </div>
      </section> */}

      <section>
        <h3 className="text-lg font-semibold mb-2">Scoring Breakdown</h3>
        <div className="bg-white border border-gray-200 rounded-md p-4">
          <p className="mb-4">
            This section outlines the allocation of points across different criteria:
          </p>
          <div>
            <table className="w-full border-collapse table-fixed text-left">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 font-semibold border-gray-200">Criteria</th>
                  <th className="p-3 font-semibold border-gray-200">Points Allocation</th>
                </tr>
              </thead>
              <tbody>
                {scoringBreakdown.map((metric) => (
                  <tr key={metric.label}>
                    <td className="p-3 border border-gray-200">{metric.label}</td>
                    <td className="p-3 border border-gray-200">
                      {POINTS_ALLOCATION_PREFIX_MAP[metric.label]} (Maximum: {metric.max} points)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );

  const renderAIFinalFeedbackContent = () => (
    <div className="-mx-6 max-h-[90vh] overflow-y-auto px-6 py-4 space-y-6">
      <h2 className="text-2xl font-semibold text-center mb-8">
        Scoring Criteria for Overall AI Score
      </h2>

      <section className="mb-6">
        <div className="bg-white border border-gray-200 rounded-md p-4 text-sm space-y-3">
          <p>
            The system calculates the <strong>Overall AI Score</strong> using a weighted approach
            across multiple evaluation stages:
          </p>

          <ul className="list-disc ml-7 space-y-2">
            <li>
              <strong>Resume Score: 20%</strong>
              <ul className="list-disc ml-7 mt-2 space-y-1">
                <li>Skills Match (40%): Required skills from job description</li>
                <li>Experience Match (30%): Relevant roles & years</li>
                <li>Qualifications (20%): Education & certifications</li>
                <li>Keyword Presence (10%): Job-specific terms</li>
              </ul>
            </li>

            <li>
              <strong>AI Audio Screening Score: 20%</strong>
              <p className="ml-2">
                Derived from candidate’s performance in the AI Audio Screening round.
              </p>
            </li>

            <li>
              <strong>AI Video Interview Score(s): 60%</strong>
              <p className="ml-2">
                Calculated as the <strong>simple average</strong> of all AI Video Interview round
                scores.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-2">Formula</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm font-mono">
          Overall AI Score = (Resume Score × 20%) + (AI Audio Score × 20%) + (Average AI Video
          Scores × 60%)
        </div>
      </section>
    </div>
  );

  const renderInterviewerFinalFeedbackContent = () => (
    <div className="-mx-6 max-h-[90vh] overflow-y-auto px-6 py-4 space-y-6">
      <h2 className="text-2xl font-semibold text-center mb-8">
        Scoring Criteria for Overall Human Score
      </h2>

      <section className="mb-6">
        <div className="bg-white border border-gray-200 rounded-md p-4 text-sm space-y-3">
          <p>
            The <strong>Overall Human Score</strong> is calculated as the simple average of all
            interviewer ratings provided during:
          </p>

          <ul className="list-disc ml-7 space-y-2">
            <li>
              <strong>Video Interview Round(s):</strong> Ratings for candidate performance in one or
              more video interview rounds.
            </li>
            <li>
              <strong>In-Person Interview Round(s):</strong> Ratings provided during physical
              interview rounds.
            </li>
          </ul>

          <p>
            Each rating reflects the interviewer’s evaluation of communication, technical
            proficiency, problem-solving ability, and cultural fit.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-2">Formula</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm font-mono">
          Overall Human Score = Sum of all interviewer ratings (Video + In-Person) / Total number of
          ratings
        </div>
      </section>
    </div>
  );
  const renderInterviewScoringContent = () => (
    <div className="-mx-6 max-h-[90vh] overflow-y-auto px-6 py-4">
      <h2 className="text-2xl font-semibold text-center">Interview Scoring</h2>
      <p className="text-center text-gray-600">
        {subtitle || 'AI Audio Screening / Video Interview'}
      </p>

      <section className="mb-6 mt-6">
        <h3 className="text-lg font-semibold mb-2">How the Interview Is Scored</h3>
        <div className="bg-white border border-gray-200 rounded-md p-4 text-sm space-y-4">
          <p>
            The AI listens to the candidate&apos;s spoken answers and evaluates them across a few
            key areas to understand overall suitability for the role.
          </p>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Scoring Scale (1-5)</h3>
        <div className="bg-white border border-gray-200 rounded-md p-4 text-sm space-y-3">
          <p>Each score ranges from 1 to 5, based only on what the candidate actually says.</p>
          <ul className="list-disc ml-7 space-y-2">
            <li>
              <strong>5 - Excellent</strong>: Clear, confident answers with strong examples
            </li>
            <li>
              <strong>4 - Good</strong>: Clear answers with some supporting details
            </li>
            <li>
              <strong>3 - Average</strong>: Basic answers with limited depth
            </li>
            <li>
              <strong>2 - Below Average</strong>: Weak or unclear answers
            </li>
            <li>
              <strong>1 - No Evidence</strong>: Not mentioned or not demonstrated
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Categories Analyzed</h3>
        <div className="bg-white border border-gray-200 rounded-md p-4 text-sm space-y-3">
          <p>The interview is evaluated across these five categories:</p>
          <ul className="list-disc ml-7 space-y-2">
            <li>
              <strong>Skills </strong>- Technical skills, soft skills, and communication{' '}
              <em>(Communication is always included.)</em>
            </li>
            <li>
              <strong>Qualifications </strong>- Education, certifications, and work experience
            </li>
            <li>
              <strong>Personality Traits </strong>- Confidence, teamwork, adaptability, attitude
            </li>
            <li>
              <strong>Career Goals </strong>- Motivation, aspirations, growth mindset
            </li>
            <li>
              <strong>Company Fit </strong>- Cultural alignment and role understanding
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-2">How each Category Score is calculated</h3>
        <div className="bg-white border border-gray-200 rounded-md p-4 text-sm space-y-3">
          <p>
            <strong>1.Each interview question is scored first</strong> on a 1-5 scale, based on how
            clearly and effectively the candidate answers.
          </p>
          <p>
            <strong>2.Question scores are grouped</strong> into the relevant categories above. (For
            example, communication-focused questions contribute to Skills.)
          </p>
          <p>
            <strong>3.The category score is the average</strong> of all question scores mapped to
            that category.
          </p>
          <p>
            This means a category score reflects{' '}
            <strong>overall performance across all related questions</strong>, not just a single
            answer.
          </p>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-2">How the Final Score Is Calculated</h3>
        <div className="bg-white border border-gray-200 rounded-md p-4 text-sm space-y-3">
          <ul className="list-disc ml-7 space-y-2">
            <li>
              Each category score is multiplied by its <strong>assigned weight</strong> (set by the
              company).
            </li>
            <li>
              If a category is <strong>not discussed at all</strong>, its weight is shared among the
              other categories.
            </li>
            <li>
              Poor or weak answers are still counted and <strong>are not ignored</strong>.
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-2">Final Interview Score (1-5)</h3>
        <div className="bg-white border border-gray-200 rounded-md p-4 text-sm space-y-3">
          <p>
            The final score is a <strong>weighted average</strong>, shown on the same{' '}
            <strong>1-5 scale</strong>:
          </p>
          <p>
            <strong>
              Final Score =
              <br />
              (Skills x Weight) + (Qualifications x Weight) +
              <br />
              (Personality Traits x Weight) + (Career Goals x Weight) +
              <br />
              (Company Fit x Weight)
            </strong>
          </p>
          <p>
            <em>(Weights always total 100% across the categories that were discussed)</em>
          </p>
        </div>
      </section>
    </div>
  );
  // Intake Call: matches ai-service's INTAKE_CONSISTENCY_PROMPT and
  // check_intake_call_consistency.py (0-5 scale, name-mismatch cap of 1,
  // never folded into any other score).
  const renderIntakeCallScoringContent = () => (
    <div className="-mx-6 max-h-[90vh] overflow-y-auto px-6 py-4">
      <h2 className="text-2xl font-semibold text-center">Intake Call Scoring</h2>
      <p className="text-center text-gray-600">{subtitle || 'Intake Call'}</p>

      <section className="mb-6 mt-6">
        <h3 className="text-lg font-semibold mb-2">What the Intake Call Checks</h3>
        <div className="bg-white border border-gray-200 rounded-md p-4 text-sm space-y-3">
          <p>
            The Intake Call is an <strong>authenticity check</strong>, not a skills interview. The
            AI compares what the candidate says during the call with the claims on their uploaded
            resume to confirm that the person on the call is the genuine owner of that resume.
          </p>
          <p>
            Only the candidate&apos;s own statements are assessed. The interviewer&apos;s questions
            are used for context only.
          </p>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-2">What Is Compared</h3>
        <div className="bg-white border border-gray-200 rounded-md p-4 text-sm space-y-3">
          <p>Specific claims made during the call are checked against the resume, including:</p>
          <ul className="list-disc ml-7 space-y-2">
            <li>
              <strong>Roles and Employers</strong> - Job titles and the companies the candidate has
              worked for
            </li>
            <li>
              <strong>Projects</strong> - Work the candidate describes and their part in it
            </li>
            <li>
              <strong>Skills</strong> - Tools, technologies, and abilities the candidate mentions
            </li>
            <li>
              <strong>Education</strong> - Degrees, institutions, and certifications
            </li>
            <li>
              <strong>Length of Experience</strong> - Years in each role and overall
            </li>
          </ul>
          <p>
            <strong>Name check:</strong> the name the candidate gives or confirms during the call is
            also compared with the name on the resume. Nicknames, shortened names, and spelling
            variants of the same name are accepted. If no name is mentioned during the call, this is
            not treated as a mismatch.
          </p>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Consistency Scale (0-5)</h3>
        <div className="bg-white border border-gray-200 rounded-md p-4 text-sm space-y-3">
          <p>The call receives a single score from 0 to 5:</p>
          <ul className="list-disc ml-7 space-y-2">
            <li>
              <strong>4-5 - Consistent</strong>: The call confirms specific resume claims with
              credible detail that only the resume&apos;s owner would be likely to know
            </li>
            <li>
              <strong>3 - Broadly Consistent</strong>: No contradictions, with minor gaps or topics
              the call did not cover
            </li>
            <li>
              <strong>2 - Inconclusive</strong>: Vague or generic answers that neither confirm nor
              contradict the resume. This score is also given when the call is too short to compare
              meaningfully
            </li>
            <li>
              <strong>0-1 - Inconsistent</strong>: Direct contradictions, claims the resume does not
              support, or a name that does not match the resume
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-2">How the Score Is Determined</h3>
        <div className="bg-white border border-gray-200 rounded-md p-4 text-sm space-y-3">
          <p>
            <strong>1. The whole call is reviewed at once</strong> against the whole resume. There
            are no category weights and no per-question averages.
          </p>
          <p>
            <strong>2. One overall score is given</strong>, together with a short written
            explanation of the reasoning.
          </p>
          <p>
            <strong>3. A name mismatch caps the score at 1</strong>, regardless of how consistent
            the rest of the call is.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-2">How the Score Is Used</h3>
        <div className="bg-white border border-gray-200 rounded-md p-4 text-sm space-y-3">
          <p>
            The Intake Call Consistency score is a <strong>standalone authenticity signal</strong>.
            It is not included in any interview-round score or in the candidate&apos;s overall
            score.
          </p>
          <p>
            Pipeline actions for the candidate (Advance, Skip, and Reject) become available once
            this check has been completed.
          </p>
        </div>
      </section>
    </div>
  );
  const renderContent = () => {
    if (title === 'AI_FINAL_FEEDBACK') return renderAIFinalFeedbackContent();
    if (title === 'INTERVIEWER_FINAL_FEEDBACK') return renderInterviewerFinalFeedbackContent();
    if (title === 'INTERVIEW_SCORING') return renderInterviewScoringContent();
    if (title === 'INTAKE_CALL_SCORING') return renderIntakeCallScoringContent();
    return renderDefaultContent();
  };

  return (
    <div>
      <Modal
        open={visible}
        onCancel={withCloseAttention({ onClose })}
        footer={footer}
        centered
        width="80vw"
        maskClosable
        keyboard
        className="custom-modal"
      >
        {renderContent()}
      </Modal>
    </div>
  );
};

export default ScoringCriteriaModal;
