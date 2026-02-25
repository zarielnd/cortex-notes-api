import { Controller } from '@nestjs/common';
import { SelectionsService } from './selections.service';

@Controller('selections')
export class SelectionsController {
  constructor(private readonly selectionsService: SelectionsService) {}
}
