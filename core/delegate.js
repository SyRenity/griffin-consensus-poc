/**
 * Delegate client.
 *
 * @module core/delegate
 */

'use strict';

const Delegate  = require('core/account');
const transport = require('core/transport');
const events    = require('lib/events');
const helpers   = require('lib/helpers');

// QUESTION store validator signatures in new block?

/**
 * Delegates group name.
 *
 * @type {String}
 */
const DELEGATES_GROUP = 'delegates';

const secretKey = '';
const delegate  = Delegate(secretKey);

// random number generated in current round
let randomNumber = Math.random();

// random numbers of current round
let randomNumbers = [];

// TODO sign message with validators private key.
transport.send({type: events.RANDOM_NUMBER, data: randomNumber}, DELEGATES_GROUP);

(async function main() {

    // TODO get block from block producer
    const block = {};

    const finalRandomNumber = getRandomFromArray(randomNumbers);

    if (isValidBlockProducer(block, finalRandomNumber) && isValidBlock(block)) {
        transport.send({type: events.NEW_BLOCK, data: JSON.stringify(block)});
    } else {
        // in case when block is malformed we start round again
        randomNumbers = [];
    }

    randomNumber = Math.random();

    transport.send({type: events.RANDOM_NUMBER, data: randomNumber}, DELEGATES_GROUP);

})();

/**
 * Validate block producer.
 *
 * NOTE this can be done much more gracefully.
 *
 * @param  {Object}  block             Block produced by BP.
 * @param  {Number}  finalRandomNumber Final random number of current round.
 * @return {Boolean}                   Whether block producer is a valid next BP or not.
 */
function isValidBlockProducer(block, finalRandomNumber) {
    let nextBlockProducer;
    let i = 0;

    for (const account of block.state) {
        for (let _ = 0; _ < account.certificates.length; _++) {
            if (i++ === finalRandomNumber) {
                return block.producer === nextBlockProducer;
            }
        }
    }
}

/**
 * Get random number from array of random numbers.
 *
 * @param  {Number[]} randomNumbers Random numbers of current round.
 * @return {Number}                 Final random number of current round.
 */
function getRandomFromArray(randomNumbers) {
    return randomNumbers[Math.floor(Math.random() * randomNumbers.length)];
}

/**
 * Validate block.
 *
 * @param  {Object}  producedBlock Block produced by BP.
 * @return {Boolean}               Whether block is valid or not.
 */
function isValidBlock(producedBlock) {
    const block = delegate.produceBlock();

    return producedBlock.stateRoot === helpers.merkleRoot(producedBlock.transactions)
        && producedBlock.stateRoot === block.stateRoot
        && producedBlock.receiptsRoot === block.receiptsRoot;
}
