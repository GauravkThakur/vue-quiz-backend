export interface Quiz {
  _id: string;
  question: string;
  codeSnippet: string;
  options: string[];
  correctAnswer: string;
  tag: string;
}
