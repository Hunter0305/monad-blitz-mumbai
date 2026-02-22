export interface Goal {
  id: string;
  title: string;
  description: string;
  stakeAmount: number;
  currency: string;
  deadline: Date;
  createdAt: Date;
  status: 'active' | 'pending_review' | 'approved' | 'failed';
  proofSubmitted: boolean;
  charity: string;
  owner: string;
}

export const mockGoals: Goal[] = [
  {
    id: '1',
    title: 'Run a marathon under 4 hours',
    description: 'Complete a full marathon in under 4 hours by training consistently.',
    stakeAmount: 0.5,
    currency: 'ETH',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    status: 'active',
    proofSubmitted: false,
    charity: 'GiveDirectly',
    owner: '0x1234...5678',
  },
  {
    id: '2',
    title: 'Ship MVP by end of month',
    description: 'Complete and deploy the minimum viable product for the startup.',
    stakeAmount: 1.0,
    currency: 'ETH',
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    status: 'pending_review',
    proofSubmitted: true,
    charity: 'Gitcoin Grants',
    owner: '0x1234...5678',
  },
  {
    id: '3',
    title: 'Read 12 books this quarter',
    description: 'Read at least 12 non-fiction books in the current quarter.',
    stakeAmount: 0.25,
    currency: 'ETH',
    deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    status: 'approved',
    proofSubmitted: true,
    charity: 'The Water Project',
    owner: '0x1234...5678',
  },
  {
    id: '4',
    title: 'Lose 10kg in 3 months',
    description: 'Achieve a healthy weight loss target through diet and exercise.',
    stakeAmount: 0.75,
    currency: 'ETH',
    deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000),
    status: 'failed',
    proofSubmitted: false,
    charity: 'DAO Community Pool',
    owner: '0x1234...5678',
  },
];

export const mockProofs = [
  {
    id: '1',
    goalId: '2',
    goalTitle: 'Ship MVP by end of month',
    submitter: '0x1234...5678',
    stakeAmount: 1.0,
    currency: 'ETH',
    fileName: 'mvp-screenshot.png',
    explanation: 'MVP has been deployed to production. Here is the screenshot of the live app with analytics dashboard.',
    submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: 'pending' as 'pending' | 'approved' | 'rejected',
  },
  {
    id: '2',
    goalId: '5',
    goalTitle: 'Complete Solidity course',
    submitter: '0xabcd...ef01',
    stakeAmount: 0.3,
    currency: 'ETH',
    fileName: 'certificate.pdf',
    explanation: 'Completed all 12 modules of the advanced Solidity course with a 95% score.',
    submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: 'pending' as 'pending' | 'approved' | 'rejected',
  },
];

export const mockStats = {
  totalStaked: 12.5,
  goalsCreated: 48,
  successRate: 72,
  activeGoals: 15,
  streak: 5,
};
