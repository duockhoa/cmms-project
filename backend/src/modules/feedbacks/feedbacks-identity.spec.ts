import { FeedbacksService } from './feedbacks.service';

describe('feedback author', () => {
  it('prefers the authenticated name and department over form values', async () => {
    const prisma: any = { appFeedback: { count: jest.fn().mockResolvedValue(0), findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async ({ data }) => data) } };
    const result = await new FeedbacksService(prisma).create({ title: 'Issue', description: 'Details', requesterName: 'Forged A', department: 'Other' } as any,
      { name: 'Verified B', department: 'QA' });
    expect(result.requesterName).toBe('Verified B');
    expect(result.department).toBe('QA');
  });
});
