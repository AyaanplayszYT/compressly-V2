import React, { useState, useEffect } from 'react';

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  
  const steps = [
    { title: 'Welcome to Compressly!', desc: 'Drop your images or folders here to get started.', target: '.dropzone', pos: 'bottom' },
    { title: 'Smart Formats', desc: 'Compressly auto-selects the best format, but you can override it here.', target: 'select', pos: 'bottom' },
    { title: 'Quality Control', desc: 'Adjust the slider to balance file size and visual quality.', target: 'input[type="range"]', pos: 'bottom' },
    { title: 'Ready, Set, Go!', desc: 'Click compress to process your batch instantly.', target: '.btn-primary.btn-full', pos: 'top' },
  ];

  const current = steps[step];
  
  useEffect(() => {
    // Wait for render
    const el = document.querySelector(current.target) as HTMLElement;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('onboarding-highlight');
    }
    return () => {
      document.querySelectorAll('.onboarding-highlight').forEach(e => e.classList.remove('onboarding-highlight'));
    };
  }, [step, current.target]);

  const handleNext = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else handleComplete();
  };

  const handleComplete = () => {
    window.api.settingSet('onboardingDone', true);
    onComplete();
  };

  return (
    <>
      <div className="onboarding-overlay" />
      <div className="onboarding-modal card" style={{ zIndex: 10000, position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
        <h3 style={{ marginBottom: 8, color: 'var(--accent)' }}>{current.title}</h3>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 20 }}>{current.desc}</p>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {steps.map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === step ? 'var(--accent)' : 'var(--border-color)' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleComplete}>Skip</button>
            <button className="btn btn-primary btn-sm" onClick={handleNext}>{step === steps.length - 1 ? 'Finish' : 'Next'}</button>
          </div>
        </div>
      </div>
    </>
  );
}
