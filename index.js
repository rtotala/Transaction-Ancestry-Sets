// run `node index.js` in the terminal

import fetch from 'node-fetch';
import printTree from 'print-tree';

console.log(`Transaction Ancestry Sets`);

const BLOCK_HEIGHT = 68000;
const TXN_MAP = {};
const rootNode = {
  id: BLOCK_HEIGHT,
  parents: [],
};

const FETCH_HASH_BY_BLOCK_HEIGHT = 'https://blockstream.info/api/block-height/';
const FETCH_TXN_BY_BLOCK_HASH = 'https://blockstream.info/api/block/';
const GET_TXN_INFO_BY_ID = 'https://blockstream.info/api/tx/';

const fetchHashForABlock = function (block) {
  console.log('fetchHashForABlock', block);
  return fetch(FETCH_HASH_BY_BLOCK_HEIGHT + block).then((res) => res.text());
};

const fetchAllTxnByBlockHash = function (blockHash) {
  console.log('fetchAllTxnByBlockHash', blockHash);
  return fetch(FETCH_TXN_BY_BLOCK_HASH + blockHash + `/txs/0`).then((res) =>
    res.json()
  );
};

const fetchTxnInfoByID = function (txnId) {
  console.log('fetchTxnInfoByID', txnId);
  return fetch(GET_TXN_INFO_BY_ID + txnId).then((res) => res.json());
};

const addToTheSet = function (txns, node) {
  const nodes = [];
  txns.forEach((txn) => {
    const currentNode = {
      id: txn.txid,
      parents: [],
      vin: txn.vin,
    };
    nodes.push(currentNode);

    if (!TXN_MAP[txn.txid]) {
      TXN_MAP[txn.txid] = currentNode;
    }
  });

  node.parents = node.parents.concat(nodes);

  return nodes;
};

const findAncestor = function (txn, node) {
  fetchTxnInfoByID(txn.txid).then((txn) => {
    if (txn.status?.block_height === BLOCK_HEIGHT) {
      const nodes = addToTheSet([txn], node);
      nodes.forEach((node) => {
        node.vin.forEach((inputTxn) => {
          findAncestor(inputTxn, node);
        });
      });
    }
  });
};

fetchHashForABlock(BLOCK_HEIGHT)
  .then((blockHash) => fetchAllTxnByBlockHash(blockHash))
  .then((txns) => txns.slice(1))
  .then((txns) => {
    const nodes = addToTheSet(txns, rootNode);
    nodes.forEach((node) => {
      node.vin.forEach((inputTxn) => {
        const a = findAncestor(inputTxn, node);
      });
    });
  });

const printTransactionList = function (txnMap) {
  console.log('--------------------------');
  console.log('All Transaction for ' + BLOCK_HEIGHT);
  console.log(Object.keys(txnMap));
  console.log('--------------------------');
};

const printAncestorSetforAllTxn = function (txnMap) {
  console.log('--------------------------');
  console.log('Ancestor Set for Every Transaction in the Block' + BLOCK_HEIGHT);
  console.log(
    Object.keys(txnMap).forEach((txn) => {
      console.log('Txn Id : ' + txn);
      console.log(
        ['Ancestors: ']
          .concat(txnMap[txn].parents.map((txn) => txn.id))
          .join(' ')
      );
    })
  );
  console.log('--------------------------');
};

setTimeout(() => {
  printTransactionList(TXN_MAP);
  printAncestorSetforAllTxn(TXN_MAP);
  printTree(
    rootNode,
    (rootNode) => rootNode.id,
    (rootNode) => rootNode.parents
  );
}, 3000);
