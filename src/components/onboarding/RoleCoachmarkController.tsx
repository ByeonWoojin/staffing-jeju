"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { SpotlightCoachmark } from "@/components/onboarding/SpotlightCoachmark";
import {
  type CoachmarkRole,
  getCoachmarkSteps,
  matchesCoachmarkRoute,
} from "@/lib/onboarding/coachmark-config";
import {
  type CoachmarkStorageState,
  readCoachmarkState,
  writeCoachmarkState,
} from "@/lib/onboarding/coachmark-storage";

type RoleCoachmarkControllerProps = {
  role: CoachmarkRole | null | undefined;
};

const emptyState: CoachmarkStorageState = {
  completedSteps: [],
  skipped: false,
};

export function RoleCoachmarkController({
  role,
}: RoleCoachmarkControllerProps) {
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const [storageState, setStorageState] =
    useState<CoachmarkStorageState>(emptyState);
  const [missingStepIds, setMissingStepIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!role) {
        setIsReady(false);
        setStorageState(emptyState);
        return;
      }

      setStorageState(readCoachmarkState(role));
      setMissingStepIds(new Set());
      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [role]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMissingStepIds(new Set());
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  const steps = useMemo(() => (role ? getCoachmarkSteps(role) : []), [role]);

  const currentStepIndex = useMemo(() => {
    if (!role) {
      return -1;
    }

    if (!isReady || !role || storageState.skipped) return -1;

    return steps.findIndex(
      (step) =>
        matchesCoachmarkRoute(step.route, pathname) &&
        !storageState.completedSteps.includes(step.id) &&
        !missingStepIds.has(step.id),
    );
  }, [
    isReady,
    missingStepIds,
    pathname,
    role,
    steps,
    storageState.completedSteps,
    storageState.skipped,
  ]);

  const persistState = useCallback(
    (nextState: CoachmarkStorageState) => {
      if (!role) return;
      setStorageState(nextState);
      writeCoachmarkState(role, nextState);
    },
    [role],
  );

  const completeCurrentStep = useCallback(() => {
    if (currentStepIndex < 0) return;

    const currentStep = steps[currentStepIndex];
    persistState({
      ...storageState,
      completedSteps: Array.from(
        new Set([...storageState.completedSteps, currentStep.id]),
      ),
    });
  }, [currentStepIndex, persistState, steps, storageState]);

  const handleSkip = useCallback(() => {
    persistState({
      ...storageState,
      skipped: true,
    });
  }, [persistState, storageState]);

  const handleTargetMissing = useCallback((stepId: string) => {
    setMissingStepIds((current) => {
      const next = new Set(current);
      next.add(stepId);
      return next;
    });
  }, []);

  if (!role || currentStepIndex < 0) return null;

  return (
    <SpotlightCoachmark
      key={steps[currentStepIndex].id}
      steps={steps}
      currentStepIndex={currentStepIndex}
      onNext={completeCurrentStep}
      onComplete={completeCurrentStep}
      onSkip={handleSkip}
      onTargetMissing={handleTargetMissing}
    />
  );
}
