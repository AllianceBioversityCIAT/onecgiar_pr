import { ResultTypeEnum } from './result-type.enum';

export const RESULT_TYPE_TO_INDICATOR_PATTERN: Record<number, string[]> = {
  [ResultTypeEnum.INNOVATION_DEVELOPMENT]: ['%Number of innovations%'],
  [ResultTypeEnum.CAPACITY_SHARING_FOR_DEVELOPMENT]: [
    '%Number of people trained%',
  ],
  [ResultTypeEnum.KNOWLEDGE_PRODUCT]: ['%Number of knowledge products%'],
  [ResultTypeEnum.POLICY_CHANGE]: ['%Number of Policy%'],
  [ResultTypeEnum.INNOVATION_USE]: ['%Innovation Use%'],
  [ResultTypeEnum.INNOVATION_USE_IPSR]: ['%Innovation Use%'],
} as const;
