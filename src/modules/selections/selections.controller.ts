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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { SelectionMember } from 'src/entities/selection-member.entity';
import { Selection } from 'src/entities/selection.entity';
import { User } from 'src/entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateSelectionDto } from './dto/create-selection.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateSelectionDto } from './dto/update-selection.dto';
import { SelectionsService } from './selections.service';

@ApiBearerAuth()
@Controller('selections')
@UseGuards(JwtAuthGuard)
export class SelectionsController {
  constructor(private readonly selectionsService: SelectionsService) {}

  @Get()
  findAll(@CurrentUser() user: User): Promise<Selection[]> {
    return this.selectionsService.findAll(user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Selection> {
    return this.selectionsService.findOne(id, user);
  }

  @Post()
  create(
    @Body() dto: CreateSelectionDto,
    @CurrentUser() user: User,
  ): Promise<Selection> {
    return this.selectionsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSelectionDto,
    @CurrentUser() user: User,
  ): Promise<Selection> {
    return this.selectionsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    return this.selectionsService.remove(id, user);
  }

  // ─── Member endpoints ──────────────────────────────────────────────────────

  @Get(':id/members')
  getMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<SelectionMember[]> {
    return this.selectionsService.getMembers(id, user);
  }

  @Post(':id/members')
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: User,
  ): Promise<SelectionMember> {
    return this.selectionsService.addMember(id, dto, user);
  }

  @Patch(':id/members/:userId/role')
  updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: User,
  ): Promise<SelectionMember> {
    return this.selectionsService.updateMemberRole(id, memberId, dto, user);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    return this.selectionsService.removeMember(id, memberId, user);
  }
}
