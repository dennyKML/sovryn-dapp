export enum RewardHistoryType {
  stabilityPoolRewards = 'stabilityPoolRewards',
  stabilityPoolSubsidies = 'stabilityPoolSubsidies',
  stakingRevenue = 'stakingRevenue',
  stakingSubsidies = 'stakingSubsidies',
}

export type RewardHistoryProps = {
  selectedHistoryType: RewardHistoryType;
  onChangeRewardHistory: (value: RewardHistoryType) => void;
};