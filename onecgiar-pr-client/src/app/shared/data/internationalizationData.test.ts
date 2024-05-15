import { internationalizationData } from './internationalizationData';

describe('internationalizationData', () => {
  describe('reportNewResult', () => {
    describe('greeting', () => {
      it('should return the correct greeting for admin users', () => {
        const name = 'Test User';
        const initiatives = 'Test Initiative';
        const isAdmin = true;

        const result = internationalizationData.reportNewResult.greeting(name, initiatives, isAdmin);

        expect(result).toEqual(
          `Hello <strong>${name}</strong>, as an admin user, you can report results for <strong>any Initiative, Platform or SGP</strong> in the PRMS Reporting Tool.`
        );
      });

      it('should return the correct greeting for non-admin users', () => {
        const name = 'Test User';
        const initiatives = 'Test Initiative';
        const isAdmin = false;

        const result = internationalizationData.reportNewResult.greeting(name, initiatives, isAdmin);

        expect(result).toEqual(
          `Hello <strong>${name}</strong>, you can report for <strong>${initiatives}</strong>. If you would like to report for another Initiative, please contact <a class="open_route" href="mailto: projectcoordinationunit@cgiar.org">Project Coordination Unit.</a>`
        );
      });
    });
  });
});
