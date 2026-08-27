export function driver(_opts?: any) {
  return {
    drive: () => {},
    destroy: () => {},
    isActive: () => false,
    moveNext: () => {},
    movePrevious: () => {},
    hasNextStep: () => false,
    hasPreviousStep: () => false,
  };
}
