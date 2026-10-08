import React from 'react';
import { Modal } from 'antd';
import { useModalCloseAttention } from '../../../shared/ui/useModalCloseAttention';

/** ai-service scores each interview round type with a different prompt:
 * AI Audio Screening on answer quality, AI Video on alignment with the
 * resume, and the interviewer-led Hiring Panel on consistency with the
 * earlier AI Video round. */
export type InterviewScoringRoundType = 'audio' | 'ai_video' | 'panel';

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
    description?: string;
  }[];
  interviewRoundType?: InterviewScoringRoundType;
  /** This job's resolved INTERVIEW weights (job, else organization, else
   * platform default) — the same ones ai-service weights the round with. */
  interviewWeights?: {
    label: string;
    description?: string;
    weight: number;
  }[];
};

const RESUME_METRIC_LABELS = {
  SKILLS_MATCH: 'Skills Match',
  EXPERIENCE_MATCH: 'Experience Match',
  QUALIFICATIONS: 'Qualifications',
  KEYWORD_PRESENCE: 'Keyword Presence',
} as const;

type ResumeMetricLabel = (typeof RESUME_METRIC_LABELS)[keyof typeof RESUME_METRIC_LABELS];

// The modal body itself is locked (overflow hidden, see <Modal styles> below)
// so this is the single scroll region — bounded by the global modal
// max-height in index.css rather than its own max-h, which used to exceed
// that cap and stack a second, competing scrollbar on .ant-modal-body.
const SCROLL_AREA_CLASS = 'scoring-criteria-scroll flex-1 min-h-0 mt-6 pr-4 pb-4';

const CARD_CLASS = 'bg-white border border-gray-200 rounded-md p-4 text-sm';

type ScoringBreakdownItem = {
  label: string;
  max: number;
  description: string;
};

// job-service's master_scoring_category descriptions (RESUME stage) — used
// when the job's own scoring config doesn't carry one.
const RESUME_METRIC_DESCRIPTIONS: Record<ResumeMetricLabel, string> = {
  [RESUME_METRIC_LABELS.SKILLS_MATCH]: 'Match between candidate skills and JD requirements',
  [RESUME_METRIC_LABELS.EXPERIENCE_MATCH]: 'Relevance and depth of professional experience',
  [RESUME_METRIC_LABELS.QUALIFICATIONS]: 'Education, certifications, formal qualifications',
  [RESUME_METRIC_LABELS.KEYWORD_PRESENCE]: 'Presence of key JD-specific terms',
};

// Platform default RESUME weights (master_scoring_category) — what a job
// with no organization or job override is scored with.
const DEFAULT_SCORING_BREAKDOWN: ScoringBreakdownItem[] = (
  [
    [RESUME_METRIC_LABELS.SKILLS_MATCH, 40],
    [RESUME_METRIC_LABELS.EXPERIENCE_MATCH, 30],
    [RESUME_METRIC_LABELS.QUALIFICATIONS, 20],
    [RESUME_METRIC_LABELS.KEYWORD_PRESENCE, 10],
  ] as const
).map(([label, max]) => ({ label, max, description: RESUME_METRIC_DESCRIPTIONS[label] }));

// Platform default INTERVIEW weights and descriptions (master_scoring_category).
const DEFAULT_INTERVIEW_WEIGHTS = [
  {
    label: 'Skills Match',
    description: 'Technical depth, tool fluency, and clarity of explanation',
    weight: 40,
  },
  {
    label: 'Personality Traits',
    description: 'Adaptability, collaboration, ownership, resilience',
    weight: 20,
  },
  {
    label: 'Qualifications',
    description: 'Education, certifications, and relevant experience',
    weight: 15,
  },
  {
    label: 'Company Fit',
    description: 'Role understanding, cultural and working-style alignment',
    weight: 15,
  },
  {
    label: 'Career Goals',
    description: 'Motivation, growth mindset, and career alignment',
    weight: 10,
  },
];

// Same colours and bands as the category bars on the Resume Review tab
// (CandidateDetails.tsx): a category's 0-5 score shown as a percentage.
const RESUME_BAR_BANDS = [
  { color: '#3FB97F', label: '4-5 out of 5 (80-100%)', meaning: 'Strong match' },
  { color: '#F6BC3F', label: '3 out of 5 (60%)', meaning: 'Partial match' },
  { color: '#F0686B', label: '0-2 out of 5 (0-40%)', meaning: 'Weak or no match' },
];

// Per-answer 1-5 rubric, per round type — condensed from ai-service's
// ANALYZE_TRANSCRIPT_PROMPT (audio), RESUME_ALIGNMENT_PROMPT (AI Video) and
// CONSISTENCY_PROMPT (Hiring Panel).
const INTERVIEW_RUBRICS: Record<
  InterviewScoringRoundType,
  { intro: string[]; scaleNote: string; scale: { score: string; text: string }[] }
> = {
  audio: {
    intro: [
      'The AI reviews the call transcript and scores each of the candidate’s answers on how well it demonstrates the competency the question is testing.',
    ],
    scaleNote: 'Each answer is scored on how well it demonstrates the competency being tested.',
    scale: [
      {
        score: '5 - Exceptional',
        text: 'Vivid, specific and impactful examples; a model answer (rare)',
      },
      { score: '4 - Strong', text: 'Clearly demonstrated with relevant, specific examples' },
      { score: '3 - Partial', text: 'Partly demonstrated; lacks depth or specificity' },
      { score: '2 - Minimal', text: 'Generic statement with no real context or example' },
      { score: '1 - Not Demonstrated', text: 'No demonstration, or an irrelevant answer' },
    ],
  },
  ai_video: {
    intro: [
      'This round is a resume alignment check. The AI compares the candidate’s spoken answers with the claims on their resume and, where available, the job description, to confirm the candidate can substantiate what the resume states.',
      'Where a question has nothing on the resume to compare against, the answer is judged on its general credibility instead.',
    ],
    scaleNote: 'Each answer is scored on how well it aligns with the candidate’s resume.',
    scale: [
      {
        score: '5 - Exceptional',
        text: 'Goes beyond the resume claim with convincing, fully consistent detail (rare)',
      },
      { score: '4 - Strong', text: 'Clearly substantiates a specific resume claim' },
      {
        score: '3 - Partial',
        text: 'Partly aligns with a resume claim but lacks the depth the resume implies',
      },
      { score: '2 - Minimal', text: 'Generic; does not substantiate any specific resume claim' },
      { score: '1 - Not Aligned', text: 'Contradicts, or has no connection to, the resume' },
    ],
  },
  panel: {
    intro: [
      'This round is a consistency check. The AI compares what the candidate says in this interviewer-led round with what they said in the earlier AI Video Interview and with their resume.',
      'This score requires a completed AI Video Interview for the same candidate. The interviewer’s own feedback and the recruiter’s score are recorded separately and do not change this AI score.',
    ],
    scaleNote:
      'Each answer is scored on how consistent it is with the earlier AI Video Interview and the resume.',
    scale: [
      {
        score: '5 - Exceptional',
        text: 'Reinforces the earlier round and the resume with credible additional detail (rare)',
      },
      {
        score: '4 - Consistent',
        text: 'Clearly consistent with both the earlier round and the resume',
      },
      {
        score: '3 - Broadly Consistent',
        text: 'Consistent overall, but introduces new, unsupported claims',
      },
      { score: '2 - Unclear', text: 'Too vague to rule out a contradiction' },
      {
        score: '1 - Contradictory',
        text: 'Directly contradicts the earlier round or the resume',
      },
    ],
  },
};

const ScoringCriteriaModal: React.FC<ScoringCriteriaModalProps> = ({
  visible,
  onClose,
  title,
  footer,
  subtitle,
  matchMetrics,
  interviewRoundType,
  interviewWeights,
}) => {
  const withCloseAttention = useModalCloseAttention();

  const dynamicScoringBreakdown: ScoringBreakdownItem[] =
    matchMetrics
      ?.map((metric) => ({
        label: metric.label,
        max: Number(metric.max) || 0,
        description:
          metric.description || RESUME_METRIC_DESCRIPTIONS[metric.label as ResumeMetricLabel] || '',
      }))
      .filter((metric) => metric.description) || [];

  const scoringBreakdown =
    dynamicScoringBreakdown.length > 0 ? dynamicScoringBreakdown : DEFAULT_SCORING_BREAKDOWN;

  const sectionHeading = (text: string) => <h3 className="text-lg font-semibold mb-2">{text}</h3>;

  const renderDefaultContent = () => (
    <div className={`${SCROLL_AREA_CLASS} space-y-6`}>
      <h2 className="text-2xl font-semibold text-center mb-8">{title || 'Scoring Criteria'}</h2>

      <section>
        {sectionHeading('Scoring Categories')}
        <div className={`${CARD_CLASS} space-y-3`}>
          <p>
            The AI scores the resume against this job&apos;s description across four weighted
            categories. The weights below are the ones configured for this job.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 font-semibold border border-gray-200">Category</th>
                  <th className="p-3 font-semibold border border-gray-200">What It Measures</th>
                  <th className="p-3 font-semibold border border-gray-200 w-24 text-right">
                    Weight
                  </th>
                </tr>
              </thead>
              <tbody>
                {scoringBreakdown.map((metric) => (
                  <tr key={metric.label}>
                    <td className="p-3 border border-gray-200 font-medium">{metric.label}</td>
                    <td className="p-3 border border-gray-200">{metric.description}</td>
                    <td className="p-3 border border-gray-200 text-right">{metric.max}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        {sectionHeading('How the Resume Score Is Calculated')}
        <div className={`${CARD_CLASS} space-y-3`}>
          <p>
            <strong>1. Each category is scored from 0 to 5</strong> based on how well the resume
            matches the job description, with two short reasons for the score.
          </p>
          <p>
            <strong>2. The Resume Score is the weighted average</strong> of the category scores,
            using the weights above, rounded to the nearest whole number (0 to 5).
          </p>
          <p>
            <strong>3. Fit for this role is scored, not general resume quality.</strong> A resume
            with no real relevance to the role scores 0-1 in the affected categories, even if it is
            a strong resume for a different job.
          </p>
          <p>
            If the job has no description, the resume is scored on its general strength and clarity
            instead.
          </p>
        </div>
      </section>

      <section>
        {sectionHeading('Formula')}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm font-mono break-words">
          Resume Score ={' '}
          {scoringBreakdown.map((metric) => `(${metric.label} × ${metric.max}%)`).join(' + ')}
        </div>
      </section>

      <section>
        {sectionHeading('Category Bar Colours')}
        <div className={CARD_CLASS}>
          <ul className="space-y-2">
            {RESUME_BAR_BANDS.map((band) => (
              <li key={band.label} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span
                  className="h-4 w-12 shrink-0 rounded-xl"
                  style={{ backgroundColor: band.color }}
                  aria-hidden
                />
                <span className="font-medium">{band.label}</span>
                <span className="text-gray-600">- {band.meaning}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );

  const renderAIFinalFeedbackContent = () => (
    <div className={`${SCROLL_AREA_CLASS} space-y-6`}>
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
              <strong>AI Agent Call Score: 20%</strong>
              <p className="ml-2">
                Derived from candidate’s performance in the AI Agent Call round.
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
          Overall AI Score = (Resume Score × 20%) + (AI Agent Call Score × 20%) + (Average AI Video
          Interview Scores × 60%)
        </div>
      </section>
    </div>
  );

  const renderInterviewerFinalFeedbackContent = () => (
    <div className={`${SCROLL_AREA_CLASS} space-y-6`}>
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
  // Interview rounds: matches ai-service's score_interview_round.py — a
  // per-answer 1-5 rubric that depends on the round type, aggregated as a
  // weighted average using this job's INTERVIEW category weights.
  const renderInterviewScoringContent = () => {
    const rubric = INTERVIEW_RUBRICS[interviewRoundType ?? 'audio'];
    const weights =
      interviewWeights && interviewWeights.length > 0
        ? interviewWeights
        : DEFAULT_INTERVIEW_WEIGHTS;
    return (
      <div className={`${SCROLL_AREA_CLASS} space-y-6`}>
        <div>
          <h2 className="text-2xl font-semibold text-center">Interview Scoring</h2>
          <p className="text-center text-gray-600">{subtitle || 'Interview Round'}</p>
        </div>

        <section>
          {sectionHeading('What This Round Measures')}
          <div className={`${CARD_CLASS} space-y-3`}>
            {rubric.intro.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </section>

        <section>
          {sectionHeading('Answer Scoring Scale (1-5)')}
          <div className={`${CARD_CLASS} space-y-3`}>
            <p>{rubric.scaleNote}</p>
            <ul className="list-disc ml-7 space-y-2">
              {rubric.scale.map((item) => (
                <li key={item.score}>
                  <strong>{item.score}</strong>: {item.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          {sectionHeading('Categories and Weights')}
          <div className={`${CARD_CLASS} space-y-3`}>
            <p>
              Each answer is scored only in the categories its question actually tests. Logistics,
              scheduling and courtesy exchanges are not scored. The weights below are the ones
              configured for this job.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-left">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-3 font-semibold border border-gray-200">Category</th>
                    <th className="p-3 font-semibold border border-gray-200">What It Measures</th>
                    <th className="p-3 font-semibold border border-gray-200 w-24 text-right">
                      Weight
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {weights.map((w) => (
                    <tr key={w.label}>
                      <td className="p-3 border border-gray-200 font-medium">{w.label}</td>
                      <td className="p-3 border border-gray-200">{w.description || '-'}</td>
                      <td className="p-3 border border-gray-200 text-right">{w.weight}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          {sectionHeading('How the Final Score Is Calculated')}
          <div className={`${CARD_CLASS} space-y-3`}>
            <p>
              <strong>1. Each answer is scored from 1 to 5</strong> in every category its question
              tests.
            </p>
            <p>
              <strong>2. All answer scores are combined into a weighted average</strong> using the
              category weights above. Categories that did not come up in the round are left out, so
              the remaining weights are rebalanced automatically.
            </p>
            <p>
              <strong>3. Contradictions lower the score.</strong> If an answer contradicts something
              the candidate said in an earlier round, that answer&apos;s scores are capped at 2.
            </p>
            <p>
              <strong>4. The result is rounded to the nearest whole number</strong>, giving the
              final score out of 5. Each category&apos;s own score is the rounded average of its
              answer scores.
            </p>
            <p>
              A score of <strong>0</strong> means the candidate gave no substantive answers (for
              example, the call was not answered or only rescheduling was discussed), so no
              competency could be assessed.
            </p>
          </div>
        </section>

        <section>
          {sectionHeading('Formula')}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm font-mono break-words">
            Final Score = Sum of (answer score × category weight) ÷ Sum of the weights applied
          </div>
        </section>
      </div>
    );
  };
  // Intake Call: matches ai-service's INTAKE_CONSISTENCY_PROMPT and
  // check_intake_call_consistency.py (0-5 scale, name-mismatch cap of 1,
  // never folded into any other score).
  const renderIntakeCallScoringContent = () => (
    <div className={SCROLL_AREA_CLASS}>
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
              <strong>Roles and Employers</strong> - Job Titles and the companies the candidate has
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
            While this check is pending, the Resume Review and Intake Call stages stay locked:
            Advance, Skip, Reject and Mark as Selected become available once the consistency score
            has been recorded.
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
        styles={{ body: { overflow: 'hidden' } }}
      >
        {renderContent()}
      </Modal>
    </div>
  );
};

export default ScoringCriteriaModal;
