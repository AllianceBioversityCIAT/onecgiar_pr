import { YesOrNotByBooleanPipe } from './yes-or-not-by-boolean.pipe';

describe('YesOrNotByBooleanPipe', () => {
  it('create an instance', () => {
    const pipe = new YesOrNotByBooleanPipe();
    expect(pipe).toBeTruthy();
  });
});
