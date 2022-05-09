import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import sessionAddressContract from './SessionAddressContract.entity';

@Injectable()
export default class sessionAddressContractService {
    constructor(@InjectRepository(sessionAddressContract) private readonly repoSessionAddressContract: Repository<sessionAddressContract>) {}
    async createAddressTable(addressInfo: any) {
        const newSessionAddressContract = this.repoSessionAddressContract.create(addressInfo);
        await this.repoSessionAddressContract.save(newSessionAddressContract);
        return newSessionAddressContract;
    }

    async findOneAddressTableByAddressContract(addressContract: string) {
        const addressTable = await this.repoSessionAddressContract.findOneBy({ addressContract });
        if (!addressTable) {
        //   throw new HttpException(`AddressTable do not found with this addressContract ${addressContract}`, HttpStatus.NOT_FOUND);
            return null
        }
        return addressTable;
      }
    
}