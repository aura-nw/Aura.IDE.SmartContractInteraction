import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import SessionAddressContractService from './database/SessionAddressContract.service'
import { CACHE_MANAGER, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import {createAccount} from './helpers/aura.helpers'
@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly SessionAddressContractService: SessionAddressContractService
    ) {}
    
    @Post('call-function-by-name')
    async callFunctionByName(@Body() request: any): Promise<any> {
        const funcName = request.funcName;
        const funcdata = request.funcdata;
        const queryType = request.queryType;
        const settings = request.settings;
        const initContractAddress = request.contractAddress.addressContract; 
        const appSv = new AppService();
        let result : any = ""
        let sessionAddressContractData;
        if (initContractAddress !== null ) {
            sessionAddressContractData = await this.SessionAddressContractService.findOneAddressTableByAddressContract(initContractAddress)
            console.log('initContractAddress',sessionAddressContractData);
        }

        if (queryType == "excute"){
            result = await appSv.callFunctionByName(funcName, funcdata, settings, sessionAddressContractData);
            
        } else {
            console.log('AppController', sessionAddressContractData)
            result = await appSv.callFunctionByNameQuery(funcName, funcdata, settings,sessionAddressContractData);
        }
        
        return result;
    }

    @Post('upload-contract') 
    async uploadContract(@Body() request: any): Promise<any> {
        const settings = request;
        console.log(
            "contract settingss", request
        );
        
        const appSv = new AppService();
        const address = await appSv.InitContractAddress(settings);
        console.log('address-app-controller', address); 

        try {
            const addressTable = await this.SessionAddressContractService.createAddressTable({
                addressContract: address.initContractAddress, 
                Client: JSON.stringify(address.client) 
            });
            return addressTable
          } catch (error) {
            throw new HttpException(`Error:${error}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return address;
    }

    @Post('create-wallet') 
    async createWallet(): Promise<any> {
        return await createAccount();
    }
}
