export interface RecentActivity {
  id: number;
  resultId: number;
  resultCode: string;
  resultTitle: string;
  initiativeId: number;
  initiativeName: string;
  initiativeOfficialCode: string;
  eventType: string;
  message: string;
  emitterId: number;
  emitterName: string;
  createdAt: Date;
  phase: string;
}
