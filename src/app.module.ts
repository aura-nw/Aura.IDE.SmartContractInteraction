import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BandService } from './band.service';
import { JsonSchemaService } from './json-schema.service';
import { DatabaseModule } from './database/database.module';
import {sessionAddressContractModule} from './database/SessionAddressContract.module'

@Module({
    imports: [
        DatabaseModule,
        sessionAddressContractModule
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
