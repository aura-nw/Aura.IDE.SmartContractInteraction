import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import sessionAddressContract from './SessionAddressContract.entity';
import sessionAddressContractService from './SessionAddressContract.service'

@Module({
  imports: [TypeOrmModule.forFeature([sessionAddressContract])],
  providers: [sessionAddressContractService],
  exports: [sessionAddressContractService],
})
export class sessionAddressContractModule {}
