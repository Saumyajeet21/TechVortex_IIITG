import { useState } from 'react';
import { quizData } from '../data/quizData';

export default function Quiz() {
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = quizData[idx];
  const answered = chosen !== null;

  function handleAnswer(i) {
    if (answered) return;
    setChosen(i);
    if (i === q.ans) setScore(s => s + 1);
  }

  function next() {
    if (idx + 1 >= quizData.length) { setDone(true); return; }
    setIdx(i => i + 1);
    setChosen(null);
  }

  function restart() {
    setIdx(0); setChosen(null); setScore(0); setDone(false);
  }

  const pct = Math.round((score / quizData.length) * 100);

  return (
    <div className="quiz-section">
      <span className="section-label">Quick Quiz</span>
      <h3 style={{ fontFamily: "'Syne',sans-serif", color: 'var(--ocean-deep)', marginBottom: '0.5rem', fontSize: '1.2rem' }}>Test Your Ocean Knowledge</h3>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: done ? '100%' : `${(idx / quizData.length) * 100}%` }} />
      </div>

      {done ? (
        <div className="quiz-score">
          <h3>{pct >= 80 ? '🌟 Ocean Expert!' : pct >= 60 ? '🌊 Good Job!' : '📚 Keep Learning!'} {score}/{quizData.length}</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1rem' }}>
            {pct >= 80 ? 'Outstanding! You have excellent knowledge of ocean science and safety.' : pct >= 60 ? 'Good knowledge! Review the Learning Hub modules to fill any gaps.' : 'Keep exploring the Learning Hub — the ocean has so much to teach us!'}
          </p>
          <button className="quiz-next" onClick={restart}>Restart Quiz</button>
        </div>
      ) : (
        <div>
          <p className="quiz-q">{idx + 1} of {quizData.length}: {q.q}</p>
          <div className="quiz-opts">
            {q.opts.map((o, i) => (
              <button
                key={i}
                className={`quiz-opt${answered && i === q.ans ? ' correct' : answered && i === chosen ? ' wrong' : ''}`}
                onClick={() => handleAnswer(i)}
                disabled={answered}
              >{o}</button>
            ))}
          </div>
          {answered && (
            <div className="quiz-feedback" style={{ background: chosen === q.ans ? '#eafaf1' : '#fde8e8', color: chosen === q.ans ? '#1e8449' : '#c0392b' }}>
              {chosen === q.ans ? '✓ Correct! ' : '✗ Not quite. '}{q.exp}
            </div>
          )}
          {answered && <button className="quiz-next" onClick={next}>Next Question →</button>}
        </div>
      )}
    </div>
  );
}
