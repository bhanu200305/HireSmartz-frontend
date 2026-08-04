type VideoInterviewScoreProps = {
  evalResponse: {
    categorizedQuestions: {
      categories: {
        [key: string]: Array<{
          id: number;
          question: string;
          score: number;
          passFailResult?: boolean;
          createdBy: number;
          jobOpeningId: number;
          createdAt: string;
          category?: string;
        }>;
      };
    };
  };
};

const VideoInterviewScore = ({ evalResponse }: VideoInterviewScoreProps) => {
  // Check if categories exist and are not empty
  const hasCategories =
    evalResponse?.categorizedQuestions?.categories &&
    Object.keys(evalResponse.categorizedQuestions.categories).length > 0;

  if (!hasCategories) {
    return (
      <div className="p-4 text-center">
        <div className="bg-gray-100 rounded-lg p-6">
          <p className="text-gray-600 font-medium">
            No evaluation data available yet. The scores will appear here once the interview is
            evaluated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-score-container p-4">
      <table className="interview-score-table w-full p-4">
        <tbody>
          {Object.entries(evalResponse.categorizedQuestions.categories).map(
            ([category, questions], sectionIndex) => (
              <>
                <tr key={`section-${sectionIndex}`} className="bg-gray-100">
                  <td className="p-3 font-bold text-gray-800">{category}</td>
                  <td className="p-3 font-bold text-gray-800 text-center whitespace-nowrap">
                    {category === 'Pass/Fail Questions' ? 'Pass/Fail' : 'Score (Max 5)'}
                  </td>
                </tr>
                {questions.map((question, questionIndex) => (
                  <tr
                    key={`question-${sectionIndex}-${questionIndex}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="p-4 text-gray-600">{question.question}</td>
                    <td className="p-4 text-gray-600 text-center">
                      {category === 'Pass/Fail Questions'
                        ? question.passFailResult === undefined || question.passFailResult === null
                          ? 'N/A'
                          : question.passFailResult === true ||
                              String(question.passFailResult).toLowerCase() === 'yes' ||
                              String(question.passFailResult).toLowerCase() === 'true'
                            ? 'Yes'
                            : 'No'
                        : question.score == null
                          ? 'N/A'
                          : question.score}
                    </td>
                  </tr>
                ))}
              </>
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

export default VideoInterviewScore;
