import { makeCosmoshubPath } from '@cosmjs/amino';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import BIP32Factory from 'bip32';
import { toBase64 } from 'js-base64';
import * as ecc from 'tiny-secp256k1';


function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}



const generateMnemonic = async () =>{
  const bip39 = require('bip39')
  // create random mnemonic or hardcode a mnemonic
  let mnemonic = bip39.generateMnemonic();
  // let mnemonic =
  // 'rich poverty old cart robot shine bus impulse major sniff pride frozen';
  console.log('mnemonic: ', mnemonic);
  //generate seed from mnemonic
  let seed = bip39.mnemonicToSeedSync(mnemonic);
  //get master key from seed
  const bip32 = BIP32Factory(ecc);
  let masterKey = bip32.fromSeed(seed);
  
  
  const key = await  createChildKey(masterKey, 0);
  const pubkey0 = key.privateKey; 
  createChildKey(masterKey, 1);

  return{
    'mnemonic': mnemonic,
    'pubkey0': pubkey0
  }
}
  

  
const createChildKey = async (masterKey, addressIndex) =>{
  console.log('---------------------');
  let path = `m/44'/118'/0'/0/${addressIndex}`;
  // let path = makeCosmoshubPath(addressIndex);
  console.log('path: ', path);
  let hd = masterKey.derivePath(path);
  //get private key
  const privateKey = hd.privateKey;
  if (!privateKey) {
  console.log('null hd key');
  }
  console.log('privateKey: ', toBase64(privateKey));
  //get public key
  const publicKey = hd.publicKey;
  console.log('publicKey: ', toBase64(publicKey));

  return{
    privateKey: toBase64(privateKey),
    publicKey: toBase64(publicKey)
  }
}
  
  

export const createAccount = async () => {
  // let mnemonic =
  //   'rich poverty old cart robot shine bus impulse major sniff pride frozen'
  // const bip39 = require("bip39");
  
  const rawMM = await generateMnemonic();
  const {mnemonic,pubkey0} = rawMM;
  const path: any = makeCosmoshubPath(randomIntFromInterval(1, 1000000000))
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: 'aura',
    hdPaths: [path],
  })

  const walletAddress = await wallet.getAccounts();
  const addressString = walletAddress[0].address;
  const settings = {
    "mnemonic": mnemonic, 
    "pubkey0":{
      "type": "tendermint/PubKeySecp256k1",
      "value": pubkey0,
    },
    "address0": addressString,
    "address1":addressString
  } 
 
  return settings;
}

