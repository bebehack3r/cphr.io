const libp2p = require('libp2p');
const TCP = require('libp2p-tcp');
const Mplex = require('libp2p-mplex');
const SECIO = require('libp2p-secio');
const PeerInfo = require('peer-info');
const MulticastDNS = require('libp2p-mdns');
const waterfall = require('async/waterfall');
const parallel = require('async/parallel');
const pull = require('pull-stream');

class MyBundle extends libp2p {
  constructor(peerInfo) {
    const modules = {
      transport: [new TCP()],
      connection: {
        muxer: [Mplex],
        crypto: [SECIO]
      },
      discovery: [new MulticastDNS(peerInfo, { interval: 1000 })]
    };
    super(modules, peerInfo);
  }
}

function createNode(callback) {
  let node;

  waterfall(
    [
      cb => PeerInfo.create(cb),
      (peerInfo, cb) => {
        peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0');
        node = new MyBundle(peerInfo);
        node.start(cb);
      }
    ],
    err => callback(err, node)
  );
}

parallel([cb => createNode(cb), cb => createNode(cb)], (err, nodes) => {
  if (err) {
    throw err;
  }

  const node1 = nodes[0];
  const node2 = nodes[1];

  let node1cipher = '';
  let node2cipher = '';

  const node1addr = node1.peerInfo.id.toB58String();
  const node2addr = node2.peerInfo.id.toB58String();

  node1.dial(node2.peerInfo, () => {});

  node1.handle('/genesis', (protocol, conn) => {
    pull(
      conn,
      pull.collect((err, cipher) => {
        node1cipher = cipher.toString();
        node1.dialProtocol(node2.peerInfo, '/established', (err, conn) => {
          if (err) {
            throw err;
          }
          pull(pull.values(['success']), conn);
        });
      })
    );
  });

  node2.handle('/genesis', (protocol, conn) => {
    pull(
      conn,
      pull.collect((err, cipher) => {
        node2cipher = cipher.toString();
        node2.dialProtocol(node1.peerInfo, '/established', (err, conn) => {
          if (err) {
            throw err;
          }
          pull(pull.values(['success']), conn);
        });
      })
    );
  });

  node1.handle('/established', (protocol, conn) => {
    pull(
      conn,
      pull.collect((err, answr) => {
        console.log(answr.toString());
        return answr.toString() == 'success' ? true : false;
      })
    );
  });

  node2.handle('/established', (protocol, conn) => {
    pull(
      conn,
      pull.collect((err, answr) => {
        console.log(answr.toString());
        return answr.toString() == 'success' ? true : false;
      })
    );
  });

  node1.on('peer:connect', peer => {
    node1cipher = 'ajlsdnfladqwldsd3923-fjsd';
    node1.dialProtocol(node2.peerInfo, '/genesis', (err, conn) => {
      if (err) {
        throw err;
      }
      pull(pull.values(['ajlsdnfladqwldsd3923-fjsd']), conn);
    });
  });
  // node2.on('peer:connect', peer => {});
});
