// run `node index.js` in the terminal

import fetch from 'node-fetch';
import printTree from 'print-tree';

console.log(`Transaction Ancestry Sets`);

const BLOCK_HEIGHT = 680000;
const TXN_MAP = {};
const rootNode = {
  id: BLOCK_HEIGHT,
  parentsMap: {},
  parents: [],
};
let largetTreeTxnId = undefined;

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
    if (!TXN_MAP[txn.txid]) {
      const currentNode = {
        id: txn.txid,
        parents: [],
        parentsMap: {},
        vin: txn.vin,
      };

      nodes.push(currentNode);
      TXN_MAP[txn.txid] = currentNode;
    }
  });

  node.parents = node.parents.concat(nodes);
  node.parentsMap = TXN_MAP;

  return nodes;
};

const addAncestor = function (txn, node) {
  const currentNode = getNode(txn.txid);
  if (currentNode && !node.parentsMap[currentNode.id]) {
    node.parentsMap[currentNode.id] = currentNode;
    node.parents.push(currentNode);
    currentNode.vin.forEach((inputTxn) => {
      addAncestor(inputTxn, currentNode);
    });
  }
};

const getAncestorList = function (node) {
  let list = [node];

  Object.keys(node.parentsMap).forEach((txn) => {
    list = list.concat(getAncestorList(node.parentsMap[txn]));
  });

  return list;
};

fetchHashForABlock(BLOCK_HEIGHT)
  .then((blockHash) => fetchAllTxnByBlockHash(blockHash))
  .then((txns) => txns.slice(1))
  .then((txns) => {
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
  let max = -1;
  console.log('--------------------------');
  console.log('Ancestor Set for Every Transaction in the Block' + BLOCK_HEIGHT);

  Object.keys(txnMap).forEach((txn) => {
    const list = getAncestorList(txnMap[txn]);
    txnMap[txn].list = list.slice(1);
    if (list.length > max) {
      max = list.length;
      largetTreeTxnId = txn;
    }
    printAncestoryTree(txn);
  });

  console.log('--------------------------');
};

const printAncestoryTree = function (txnId, limit) {
  console.log('Txn Id: ' + txnId + '-> Ancestor Set: ');
  const list = TXN_MAP[txnId].list.slice(
    0,
    limit ? limit : TXN_MAP[txnId].list.length
  );
  console.log(list.map((list) => list.id).join('\r\n -'));
  console.log('--------------------------');
};

setTimeout(() => {
  printTransactionList(TXN_MAP);
  printAncestorSetforAllTxn(TXN_MAP);
  console.log('Largest ancestry sets - 10 txns');
  printAncestoryTree(largetTreeTxnId, 10);
  console.log('-------------------------');
  // printTree(
  //   rootNode,
  //   (rootNode) => rootNode.id,
  //   (rootNode) => rootNode.parents
  // );
}, 2000);
