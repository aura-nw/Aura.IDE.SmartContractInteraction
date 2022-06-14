import { Injectable } from '@nestjs/common';
import { BIP32API, BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import {
    isSearchBySentFromOrToQuery,
    SearchTxFilter,
    SearchTxQuery,
    StargateClient,
} from '@cosmjs/stargate';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bip39 = require('bip39');

import { toBase64, Bech32 } from '@cosmjs/encoding';
import { makeCosmoshubPath } from '@cosmjs/amino';

import {
    DirectSecp256k1HdWallet,
    OfflineDirectSigner,
    Registry,
} from '@cosmjs/proto-signing';
import {
    assertIsDeliverTxSuccess,
    Coin,
    coin,
    coins,
    DeliverTxResponse,
    logs,
    SigningStargateClient,
    StdFee,
    calculateFee,
    GasPrice,
    isDeliverTxFailure,
    isDeliverTxSuccess,
} from '@cosmjs/stargate';
import {
    MsgExecuteContractEncodeObject,
    MsgStoreCodeEncodeObject,
    SigningCosmWasmClient,
    SigningCosmWasmClientOptions,
    MsgInstantiateContractEncodeObject,
    CosmWasmClient,
} from '@cosmjs/cosmwasm-stargate';
import {
    MsgClearAdmin,
    MsgExecuteContract,
    MsgInstantiateContract,
    MsgMigrateContract,
    MsgStoreCode,
    MsgUpdateAdmin,
} from 'cosmjs-types/cosmwasm/wasm/v1/tx';
import Long from 'long';
import { fromAscii, fromHex, toAscii, toHex } from '@cosmjs/encoding';
import { fromBase64 } from '@cosmjs/encoding';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import * as hackatom from './contract.json';
import { sleep } from '@cosmjs/utils';
import { Random } from '@cosmjs/crypto';
import addressTableService from './database/SessionAddressContract.service'
import { CACHE_MANAGER, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { plainToClass } from '@nestjs/class-transformer';
import { createAccount } from './helpers/aura.helpers'
import * as arrayBufferToBuffer from 'arraybuffer-to-buffer';

const fs = require('fs');

export interface ContractUploadInstructions {
    /** The wasm bytecode */
    readonly data: Uint8Array;
}

@Injectable()
export class AppService {
    wallet = {
        mnemonic:'',
        pubkey0: {
            type: 'tendermint/PubKeySecp256k1',
            value: '',
        },
        address0: '',
        address1: '',
    };

    // obj = JSON.parse(sessionStorage.wallet);
    // wallet = {
    //     mnemonic:this.obj.mnemonic,
    //     pubkey0:{
    //         type: 'tendermint/PubKeySecp256k1',
    //         value: this.obj.account.publicKey,
    //     },
    //     address0:this.obj.account.address,
    //     address1:this.obj.account.address,
    // }
    
    // wallet = {
    //     mnemonic: "tree glad link view design inherit bicycle flee short success notable valley",
    //     publey0: {
    //         type:'tendermint/PubKeySecp256k1',
    //         value:'A9kJ1MKp5RHtuxtTEeJKuSHZ8t6NJvSFQ/e9CCWaGe5q',
    //     },
    //     address0:'aura1t84aptvz33nf9cugmurjl9n5y5p38css28fjry',
    // //     // address0: {
    // //     //     "privateKey": "tT2Ryslz8fc19YnLInBrzPHVnhHhfkGy6rADSFc12J4=",
    // //     //     "publicKey": "A8054JyKxIhVNL1SVohQEHHbF3mgIBOWaTm+vIeHtK4L",
    // //     //     "address": "aura1eyy2jxrt0q6eqhdzp0wyv2nta43xaxssa7dc6u"
    // }
    
    //point to localhost aurad
    wasmd = {
        blockTime: 1_000, // ms
        chainId: 'aura-testnet',
        endpoint: 'http://0.0.0.0:26657',
        prefix: 'aura',
    };

    defaultSigningClientOptions = {
        broadcastPollIntervalMs: 200,
        broadcastTimeoutMs: 10_000,
    };
    defaultGasPrice = GasPrice.fromString('0.025uaura');
    defaultSendFee = calculateFee(100_000, this.defaultGasPrice);
    defaultUploadFee = calculateFee(1_500_000, this.defaultGasPrice);
    contract;
    
    constructor() {
        // const wasmBuffer = fs.readFileSync('./src/flower_store.wasm');
        // this.contract = new Uint8Array(wasmBuffer);

        // this.loadWasm(``)
    
            // console.log(original_wasmBuffer);
            // console.log(wasmBuffer);
    
        // this.wallet = settings;
    }

    loadWasm = (base64Wasm: any) => { 
        const wasm_buffer = Uint8Array.from(
            atob(base64Wasm),
            (c) => c.charCodeAt(0),
        ).buffer;
        const wasmBuffer = arrayBufferToBuffer(wasm_buffer);
        this.contract = new Uint8Array(wasmBuffer);
    }

   async InitContractAddress(settings):Promise<any> {
        console.log(settings);
        
        this.loadWasm(settings.wasm)
        console.log("objects settings InitCOntractADdress", settings);
        
        this.wallet = settings
        const client = await this.getSigningCosmWasmClient();

        let codeId;
        let txId;
        let resultUpload;
        console.log('Uploading contract...');
        try {
            resultUpload = await client.upload(
                this.wallet.address0,
                this.contract,
                'auto',
            );
            txId = resultUpload.transactionHash;
            console.log('tx upload complete here');
        } catch (error) {
            console.log(error);
            resultUpload = error;
            txId = error.txId;
            console.log('tx upload timeout');
        }
        await sleep(1000);
        console.log('txId: ', txId);
        let tx = await this.pollForTx(client, txId);
        console.log('Transaction upload:', tx);
        let parsedLogs = logs.parseRawLog(tx.rawLog);
        let logDetail = logs.findAttribute(parsedLogs, 'store_code', 'code_id');
        codeId = logDetail.value;
        console.log('CodeId: ', Number(codeId));
        let resultInstantiate;
        txId = null;
        tx = null;
        parsedLogs = null;
        logDetail = null;
        console.log('-------------------------');
        console.log('Instantiating contract...');

        //amount token will be sent to smart contract
        const funds = [coin(233444, 'uaura')];

        try {
            resultInstantiate = await client.instantiate(
                this.wallet.address0,
                Number(codeId),
                {
                    name: 'init-flower',
                    amount: 0,
                    price: 0,
                },
                'amazing random contract',
                'auto',
                {
                    funds: funds,
                },
            );
            console.log('tx instantiate complete here');
            txId = resultInstantiate.transactionHash;
        } catch (error) {
            resultInstantiate = error;
            console.log('tx instantiate timeout');
            txId = resultInstantiate.txId;
        }
        console.log('txId: ', txId);
        tx = await this.pollForTx(client, txId);
        console.log('Transaction instantiate: ', tx);
        parsedLogs = logs.parseRawLog(tx.rawLog);
        // logDetail = logs.findAttribute(parsedLogs, 'wasm', '_contract_address');
        logDetail = logs.findAttribute(
            parsedLogs,
            'instantiate',
            '_contract_address',
        );
        console.log('Init Contract address: ', logDetail.value);
        let initContractAddress = logDetail.value;

        return {initContractAddress,client}
    }

    async callFunctionByName(funcName: any, funcData: any, settings: any, contractAddress:any){
        this.wallet = settings
        let initContractAddress = contractAddress.addressContract;

        let clientSigningCosmWasm = await this.getSigningCosmWasmClient();
        console.log('clientSigningCosmWasm: ', clientSigningCosmWasm);
        console.log('init contract address: ', initContractAddress);
        console.log('-------------------------');
        console.log(`Executing contract ${funcName}...`);
        let resultExecute;
        let txId = null;
        try {
            resultExecute = await clientSigningCosmWasm.execute(
                this.wallet.address0,
                initContractAddress,
                {
                    [funcName]: funcData
                },
                'auto',
            );
            console.log('tx instantiate complete here');
            txId = resultExecute.transactionHash;
        } catch (error) {
            console.log('tx execute timeout');
            resultExecute = error;
            txId = resultExecute.txId;
        }


        
    }

    async callFunctionByNameQuery(funcName: any, funcData: any, settings: any, contractAddress: any){
        this.wallet = settings
        let initContractAddress = contractAddress.addressContract;

        let clientSigningCosmWasm = await this.getSigningCosmWasmClient();

        console.log('initContractAddress: ', initContractAddress);
        console.log('clientSigningCosmWasm: ', clientSigningCosmWasm);
        console.log('-------------------------');
        console.log('Query contract...');
        let contractOnchain = await clientSigningCosmWasm.getContract(initContractAddress);
        console.log('Contract onchain: ', contractOnchain);
        let resultQuery = await clientSigningCosmWasm.queryContractSmart(initContractAddress, {
            [funcName]: funcData,
        });
        console.log('Query result: ', resultQuery); 
    }
    

    async getSigningCosmWasmClient(): Promise<SigningCosmWasmClient>{
        const defaultGasPrice = GasPrice.fromString('0.0002uaura');

        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
            this.wallet.mnemonic,
            { prefix: this.wasmd.prefix },
        );
        const options = {
            ...this.defaultSigningClientOptions,
            prefix: this.wasmd.prefix,
            gasPrice: defaultGasPrice,
        };

        const client = await SigningCosmWasmClient.connectWithSigner(
            this.wasmd.endpoint,
            wallet,
            options,
        );
        return client; 
    }
    
    async pollForTx(client: any, txId: string): Promise<DeliverTxResponse> {
        console.log('polling');
        await sleep(1000);

        const result = await client.getTx(txId);
        console.log('result ', result);
        return result
            ? {
                  code: result.code,
                  height: result.height,
                  rawLog: result.rawLog,
                  transactionHash: txId,
                  gasUsed: result.gasUsed,
                  gasWanted: result.gasWanted,
              }
            : this.pollForTx(client, txId);
    }

}
