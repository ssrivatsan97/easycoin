import * as ed from '@noble/ed25519'
import {objectToId} from './utils'
import { expose } from "threads/worker"
import {BLOCK_TARGET, MINING_TIMEOUT} from './constants'
import {BlockObjectType} from './objects'

// const ed = require('@noble/ed25519')
// const {objectToId} = require('../utils')
// const { expose } = require('threads/worker')

function randomNonce(){
  return Buffer.from(ed.utils.randomPrivateKey()).toString('hex')
}

function mine(templateBlock: BlockObjectType, target: string = BLOCK_TARGET): BlockObjectType{
  let hash = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
  let startTime = Date.now()
  // let created = Math.floor(startTime/1000)
  const block = JSON.parse(JSON.stringify(templateBlock))
  let nowTime
  while (hash.localeCompare(target) >= 0) {
    let nonce = randomNonce()
    // block =  Object.assign({nonce}, blockWithoutNonce)
    block.nonce = nonce
    hash = objectToId(block)
    nowTime = Date.now()
    if (nowTime - startTime > MINING_TIMEOUT) {
      throw "Tried for one second, could not find block"
    }
  }
  // console.log("Mined one block. Time taken " + (nowTime-startTime)/1000 + " seconds")
  return block
}

export type MineFuncType = typeof mine

expose(mine)