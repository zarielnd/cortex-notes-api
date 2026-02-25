import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from 'src/entities/user.entity';
import { Action } from 'src/infrastructure/casl/actions.enum';
import { AppAbility } from 'src/infrastructure/casl/casl-ability.factory';
import { CheckPolicies } from '../../common/decorators/check-policies.decorator';
import { CaslGuard } from '../../common/guards/casl.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AssignRolesDto } from './dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

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
    @Body() dto: AssignRolesDto,
  ): Promise<User> {
    return this.usersService.assignRoles(id, dto.roleIds);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Delete, User))
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    return this.usersService.remove(id);
  }
}
