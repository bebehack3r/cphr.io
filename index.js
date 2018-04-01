const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const cors = require('cors');
const web3 = require('./eth.min').web3;
const Tx = require('ethereumjs-tx');
const app = express();
const port = 3000;

// After implementing ZkSnark's algorithm,
// this JSON will be unnecessary
let params = {
  algorithm: 'aes256',
  inputEncoding: 'utf8',
  outputEncoding: 'hex',
  key: ''
};

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (true) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  })
);

app.post('/', (req, res) => {
  let { receiver, message } = req.body;
  web3.eth.getBlock('latest', (error, result) => {
    if (error) throw error;
    let randomBlock = parseInt(Math.random() * parseInt(result.number));
    web3.eth.getBlock(randomBlock).then(block => {
      params.key = block.hash;
      let cipher = crypto.createCipher(params.algorithm, params.key);
      let ciphered = cipher.update(
        message,
        params.inputEncoding,
        params.outputEncoding
      );
      ciphered += cipher.final(params.outputEncoding);
      const privateKey = new Buffer(process.env.PRIVATE_KEY, 'hex');
      web3.eth.getTransactionCount(web3.eth.defaultAccount).then(nonce => {
        let txParams = {
          nonce: web3.utils.toHex('' + nonce++),
          gasPrice: '0x028fa6ae00',
          gasLimit: '0xa028',
          to: receiver,
          form: web3.eth.defaultAccount,
          value: '0x0',
          data: web3.utils.toHex(ciphered),
          chainId: 1
        };
        let tx = new Tx(txParams);
        tx.sign(privateKey);
        let stx = tx.serialize();
        web3.eth
          .sendSignedTransaction('0x' + stx.toString('hex'))
          .on('transactionHash', hash => {
            res.json({
              success: true,
              hash: hash
            });
          });
      });
    });
  });
});

app.post('/dec', (req, res) => {
  let { encoded } = req.body;
  var decipher = crypto.createDecipher(params.algorithm, params.key);
  var deciphered = decipher.update(
    encoded,
    params.outputEncoding,
    params.inputEncoding
  );
  deciphered += decipher.final(params.inputEncoding);
  res.json({
    success: true,
    message: deciphered
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});
