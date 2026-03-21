import { useState, useCallback } from 'react';

export interface TourStep {
  target: string; // CSS selector
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function useTour(tourId: string) {
  const storageKey = `tour_${tourId}_completed`;
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const hasCompleted = localStorage.getItem(storageKey) === 'true';

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const next = useCallback((totalSteps: number) => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(s => s + 1);
    } else {
      localStorage.setItem(storageKey, 'true');
      setIsActive(false);
    }
  }, [currentStep, storageKey]);

  const prev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  }, [currentStep]);

  const skip = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    setIsActive(false);
  }, [storageKey]);

  const startIfNew = useCallback(() => {
    if (!hasCompleted) start();
  }, [hasCompleted, start]);

  return { isActive, currentStep, start, next, prev, skip, hasCompleted, startIfNew };
}
