import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CaslGuard } from '../../common/guards/casl.guard';
import { CheckPolicies } from '../../common/decorators/check-policies.decorator';
import { AppAbility } from 'src/infrastructure/casl/casl-ability.factory';
import { Action } from 'src/infrastructure/casl/actions.enum';
import { User } from 'src/entities/user.entity';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, CaslGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, User))
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, User))
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.usersService.findById(id);
  }

  @Post()
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Create, User))
  create(@Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, User))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/disable')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, User))
  disable(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.usersService.disable(id);
  }

  @Patch(':id/lock')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, User))
  lock(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.usersService.lock(id);
  }

  @Patch(':id/unlock')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, User))
  unlock(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.usersService.unlock(id);
  }

  @Patch(':id/roles')
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, User))
  assignRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { roleIds: string[] },
  ): Promise<User> {
    return this.usersService.assignRoles(id, body.roleIds);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Delete, User))
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    return this.usersService.remove(id);
  }
}
