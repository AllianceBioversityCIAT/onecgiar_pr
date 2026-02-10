import { Test, TestingModule } from '@nestjs/testing';
import { IpsrFrameworkService } from './ipsr-framework.service';

describe('IpsrFrameworkService', () => {
  let service: IpsrFrameworkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IpsrFrameworkService],
    }).compile();

    service = module.get<IpsrFrameworkService>(IpsrFrameworkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should return a message indicating a new ipsrFramework is added', () => {
      const result = service.create();
      expect(result).toBe('This action adds a new ipsrFramework');
    });
  });

  describe('findAll', () => {
    it('should return a message indicating all ipsrFramework are returned', () => {
      const result = service.findAll();
      expect(result).toBe('This action returns all ipsrFramework');
    });
  });

  describe('findOne', () => {
    it('should return a message with the specific id', () => {
      const id = 123;
      const result = service.findOne(id);
      expect(result).toBe(`This action returns a #${id} ipsrFramework`);
    });

    it('should handle different ids correctly', () => {
      const id1 = 1;
      const id2 = 999;

      expect(service.findOne(id1)).toBe(
        `This action returns a #${id1} ipsrFramework`,
      );
      expect(service.findOne(id2)).toBe(
        `This action returns a #${id2} ipsrFramework`,
      );
    });
  });

  describe('update', () => {
    it('should return a message indicating an ipsrFramework is updated', () => {
      const id = 456;
      const result = service.update(id);
      expect(result).toBe(`This action updates a #${id} ipsrFramework`);
    });

    it('should handle different ids correctly', () => {
      const id1 = 1;
      const id2 = 999;

      expect(service.update(id1)).toBe(
        `This action updates a #${id1} ipsrFramework`,
      );
      expect(service.update(id2)).toBe(
        `This action updates a #${id2} ipsrFramework`,
      );
    });
  });

  describe('remove', () => {
    it('should return a message indicating an ipsrFramework is removed', () => {
      const id = 789;
      const result = service.remove(id);
      expect(result).toBe(`This action removes a #${id} ipsrFramework`);
    });

    it('should handle different ids correctly', () => {
      const id1 = 1;
      const id2 = 999;

      expect(service.remove(id1)).toBe(
        `This action removes a #${id1} ipsrFramework`,
      );
      expect(service.remove(id2)).toBe(
        `This action removes a #${id2} ipsrFramework`,
      );
    });
  });
});
