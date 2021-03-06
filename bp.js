/**
 * @module bp
 */

'use strict';

const wait      = require('util').promisify(setTimeout);
const Account   = require('core/account');
const transport = require('core/transport');
const pool      = require('core/pool');
const chaindata = require('core/chaindata');
const events    = require('lib/events');
const peer      = require('core/file-peer');

/**
 * Block producing timeout.
 *
 * @type {Number}
 */
const TIMEOUT = 5000;

/**
 * Secret key used for testing.
 *
 * @type {String}
 */
const SECRET_KEY = Buffer.from('557dce58018cf502a32b9b7723024805399350d006a4f71c3b9f489f7085cb50', 'hex');

const producer = Account(SECRET_KEY);

console.log(producer.secretKey.toString('hex'));
console.log('producer', {address: '0x' + producer.address.toString('hex'), publicKey: '0x' + producer.publicKey.toString('hex')});

require('network/observer');

(async function newBlock() {

    const parentBlock  = await chaindata.getLatest();
    const transactions = await pool.getAll();

    await pool.drain();

    const block = producer.produceBlock(parentBlock, transactions);

    await chaindata.add(block);



    console.log('new block', block.number);

    await streamBlock(block);

    // transport.send(events.NEW_BLOCK, block);

    return wait(TIMEOUT).then(newBlock);

})();


(async function newTx() {

    const target       = Account();
    const serializedTx = producer.tx('0x' + target.address.toString('hex'), '0xff');

    await transport.send(events.NEW_TRANSACTION, serializedTx);

    return wait(TIMEOUT / 2).then(newTx);
})();

async function streamBlock(block) {
    const nodesCount = transport.knownNodes.size - 1;

    if (nodesCount === 0) {
        return null;
    }

    console.log('streaming new block %d to %d nodes', block.number, nodesCount);

    const port = peer.peerString(block, nodesCount);
    transport.send(events.NEW_BLOCK, {
        port, block: {
            number:     block.number,
            hash:       block.hash,
            parentHash: block.parentHash
        }
    });
}
