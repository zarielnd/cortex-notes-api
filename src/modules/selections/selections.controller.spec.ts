import { Test, TestingModule } from '@nestjs/testing';
import { SelectionsController } from './selections.controller';
import { SelectionsService } from './selections.service';

describe('SelectionsController', () => {
  let controller: SelectionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SelectionsController],
      providers: [SelectionsService],
    }).compile();

    controller = module.get<SelectionsController>(SelectionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
