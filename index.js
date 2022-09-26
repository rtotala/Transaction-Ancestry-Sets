// run `node index.js` in the terminal

import fetch from 'node-fetch';
import printTree from 'print-tree';

console.log(`Transaction Ancestry Sets`);

const BLOCK_HEIGHT = 680000;
const TXN_MAP = {};
const rootNode = {
  id: BLOCK_HEIGHT,
  parents: [],
};

const FETCH_HASH_BY_BLOCK_HEIGHT = 'https://blockstream.info/api/block-height/';
const FETCH_TXN_BY_BLOCK_HASH = 'https://blockstream.info/api/block/';

const fetchHashForABlock = function (block) {
  console.log('fetchHashForABlock', block);
  return fetch(FETCH_HASH_BY_BLOCK_HEIGHT + block).then((res) => res.text());
};

const fetchAllTxnByBlockHash = async function (blockHash) {
  let index = 0;
  let list = [];

  while (true) {
    try {
      const res = await fetch(
        FETCH_TXN_BY_BLOCK_HASH + blockHash + `/txs/` + index * 25
      ).then((res) => res.json());
      list = list.concat(res);
      index++;
    } catch (e) {
      break;
    }
  }
  return list;
};

const getNode = function (txnId) {
  return TXN_MAP[txnId];
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

const addAncestor = function (txn, node) {
  const currentNode = getNode(txn.txid);
  if (currentNode) {
    node.parents.push(currentNode);
    currentNode.vin.forEach((inputTxn) => {
      addAncestor(inputTxn, currentNode);
    });
  }
};

fetchHashForABlock(BLOCK_HEIGHT)
  .then((blockHash) => fetchAllTxnByBlockHash(blockHash))
  .then((txns) => txns.slice(1))
  .then((txns) => {
    console.log(txns.length);
    const nodes = addToTheSet(txns, rootNode);
    nodes.forEach((node) => {
      node.vin.forEach((inputTxn) => {
        addAncestor(inputTxn, node);
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
}, 5000);
