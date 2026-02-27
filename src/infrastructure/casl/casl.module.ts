import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SelectionMember } from 'src/entities/selection-member.entity';
import { CaslAbilityFactory } from './casl-ability.factory';

@Module({
  imports: [TypeOrmModule.forFeature([SelectionMember])],
  providers: [CaslAbilityFactory],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
