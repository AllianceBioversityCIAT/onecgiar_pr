import { canCreateAtCenter, isCenterMember } from './bilateral-center-membership.util';

describe('isCenterMember (ASC-T-5)', () => {
  // ASC-AC-13 fixture shape: an admin who is not a Center User of centre 52 — no assignment
  // names it by either code or acronym.
  const notAMemberAssignments = [{ center_id: 'CIAT', center_acronym: 'CIAT' }];

  it('is false when the user has no assignments at all (ASC-AC-13 admin fixture)', () => {
    expect(isCenterMember([], '52', 'AfricaRice')).toBe(false);
    expect(isCenterMember(null, '52', 'AfricaRice')).toBe(false);
    expect(isCenterMember(undefined, '52', 'AfricaRice')).toBe(false);
  });

  it('is false when the assignments name a different centre', () => {
    expect(isCenterMember(notAMemberAssignments, '52', 'AfricaRice')).toBe(false);
  });

  it('is true when the CLARISA code (center_id) matches an assignment', () => {
    const centers = [{ center_id: '52', center_acronym: 'AfricaRice' }];
    expect(isCenterMember(centers, '52', null)).toBe(true);
  });

  it('is true when the acronym matches an assignment, independent of center_id', () => {
    const centers = [{ center_id: 'RICE_CODE', center_acronym: 'AfricaRice' }];
    expect(isCenterMember(centers, null, 'AfricaRice')).toBe(true);
  });

  // The whole point of `ASC-DD-7`: this function takes no `isAdmin` input at all, so an admin
  // with no matching assignment can never read as a member through this seam.
  it('never admits membership through admin status — the function has no isAdmin input to abuse', () => {
    expect(isCenterMember(notAMemberAssignments, '52', 'AfricaRice')).toBe(false);
  });
});

// RNB-2 (P2-3941, PO decision option A): who may generate bilateral results for a centre.
describe('canCreateAtCenter (RNB-2)', () => {
  const ifpri = [{ center_id: 'CENTER-07', center_acronym: 'IFPRI' }];

  it('lets an admin through even without an assignment (admins see every centre)', () => {
    expect(canCreateAtCenter(true, [], 'CENTER-07', 'IFPRI')).toBe(true);
  });

  it('lets a member of the centre through, by code or by acronym', () => {
    expect(canCreateAtCenter(false, ifpri, 'CENTER-07', null)).toBe(true);
    expect(canCreateAtCenter(false, ifpri, null, 'IFPRI')).toBe(true);
  });

  it('refuses a member of another centre', () => {
    expect(canCreateAtCenter(false, [{ center_id: 'CENTER-99', center_acronym: 'IRRI' }], 'CENTER-07', 'IFPRI')).toBe(false);
  });

  it('refuses a user with no centres', () => {
    expect(canCreateAtCenter(false, [], 'CENTER-07', 'IFPRI')).toBe(false);
    expect(canCreateAtCenter(false, null, 'CENTER-07', 'IFPRI')).toBe(false);
    expect(canCreateAtCenter(undefined, undefined, 'CENTER-07', 'IFPRI')).toBe(false);
  });
});
