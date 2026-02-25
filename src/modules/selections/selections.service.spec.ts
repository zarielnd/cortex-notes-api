import { Test, TestingModule } from '@nestjs/testing';
import { SelectionsService } from './selections.service';

describe('SelectionsService', () => {
  let service: SelectionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SelectionsService],
    }).compile();

    service = module.get<SelectionsService>(SelectionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
