let proxyquire = require('proxyquireify')(require);
let MyWallet;
let HDAccount;

describe('HDAccount', () => {
  // account = HDAccount.fromExtPublicKey("xpub6DHN1xpggNEUkLDwwBGYDmYUaNmfE2mMGKZSiP7PB5wxbp34rhHAEBhMpsjHEwZWsHY2kPmPPD1w6gxGSBe3bXQzCn2WV8FRd7ZKpsiGHMq", undefined, "Example account");

  let account;
  let object = {
    'label': 'My great wallet',
    'archived': false,
    'xpriv': 'xprv9zJ1cTHnqzgBXr9Uq9jXrdbk2LwApa3Vu6dquzhmckQyj1hvK9xugPNsycfveTGcTy2571Rq71daBpe1QESUsjX7d2ZHVVXEwJEwDiiMD7E',
    'xpub': 'xpub6DHN1xpggNEUkLDwwBGYDmYUaNmfE2mMGKZSiP7PB5wxbp34rhHAEBhMpsjHEwZWsHY2kPmPPD1w6gxGSBe3bXQzCn2WV8FRd7ZKpsiGHMq',
    'address_labels': [{'index': 0, 'label': 'root'}],
    'cache': {
      'receiveAccount': 'xpub6FMWuMox3fJxEv2TSLN6jYQg6tHZBS7tKRSu7w4Q7F9K2UsSu4RxtwxfeHVhUv3csTSCRkKREpiVdr8EquBPXfBDZSMe84wmN9LzR3rwNZP',
      'changeAccount': 'xpub6FMWuMox3fJxGARtaDVY6e9st4Hk5j8Ui6r7XLnBPFXPXkajXNiAfiEqBakuDKYYeRf4ERtPm1TawBqKaBWj2dsHNJT4rSsugssTnaDsz2m'
    }
  };

  beforeEach(() => {
    MyWallet = {
      syncWallet () {},
      wallet: {
        getHistory () {}
      }
    };

    spyOn(MyWallet, 'syncWallet');
    spyOn(MyWallet.wallet, 'getHistory');
  });
    // account = new HDAccount(object)

  describe('Constructor', () => {
    describe('without arguments', () => {
      beforeEach(() => {
        let KeyRing = () => ({init () {}});
        let KeyChain = {};
        let stubs = { './wallet': MyWallet, './keyring': KeyRing, './keychain': KeyChain };
        HDAccount = proxyquire('../src/hd-account', stubs);
      });

      it('should create an empty HDAccount with default options', () => {
        account = new HDAccount();
        expect(account.balance).toEqual(null);
        expect(account.archived).not.toBeTruthy();
        expect(account.active).toBeTruthy();
        expect(account.receiveIndex).toEqual(0);
        expect(account.changeIndex).toEqual(0);
        expect(account.maxLabeledReceiveIndex).toEqual(-1);
      });

      it('should create an HDAccount from AccountMasterKey', () => {
        let accountZero = {
          toBase58 () { return 'accountZeroBase58'; },
          neutered () {
            return {
              toBase58 () { return 'accountZeroNeuteredBase58'; }
            };
          }
        };

        let a = HDAccount.fromAccountMasterKey(accountZero, 0, 'label');

        expect(a.label).toEqual('label');
        expect(a._xpriv).toEqual('accountZeroBase58');
        expect(a._xpub).toEqual('accountZeroNeuteredBase58');
      });

      it('should create an HDAccount from Wallet master key', () => {
        let masterkey = {
          deriveHardened (i) {
            return {
              deriveHardened (j) {
                return {
                  deriveHardened (k) {
                    return {
                      toBase58 () {
                        return `m/${i}/${j}/${k}`;
                      },
                      neutered () {
                        return {toBase58 () {}};
                      }
                    };
                  }
                };
              }
            };
          }
        };

        let a = HDAccount.fromWalletMasterKey(masterkey, 0, 'label');

        expect(a._xpriv).toEqual('m/44/0/0');
        expect(a.label).toEqual('label');
      });
    });

    it('should transform an Object to an HDAccount', () => {
      let stubs = { './wallet': MyWallet };
      HDAccount = proxyquire('../src/hd-account', stubs);
      account = new HDAccount(object);
      expect(account.extendedPublicKey).toEqual(object.xpub);
      expect(account.extendedPrivateKey).toEqual(object.xpriv);
      expect(account.label).toEqual(object.label);
      expect(account.archived).toEqual(object.archived);
      expect(account.receiveIndex).toEqual(0);
      expect(account.changeIndex).toEqual(0);
      expect(account.n_tx).toEqual(0);
      expect(account.balance).toEqual(null);
      expect(account.keyRing).toBeDefined();
      expect(account.receiveAddress).toBeDefined();
      expect(account.changeAddress).toBeDefined();
      expect(account.receivingAddressesLabels.length).toEqual(1);
    });
  });

  describe('JSON serializer', () =>
    it('should hold: fromJSON . toJSON = id', () => {
      let json1 = JSON.stringify(account, null, 2);
      let racc = JSON.parse(json1, HDAccount.reviver);
      let json2 = JSON.stringify(racc, null, 2);
      expect(json1).toEqual(json2);
    })
  );

  describe('instance', () => {
    beforeEach(() => {
      let stubs = { './wallet': MyWallet };
      HDAccount = proxyquire('../src/hd-account', stubs);
      account = new HDAccount(object);
    });

    describe('.incrementReceiveIndex', () =>
      it('should increment the received index', () => {
        let initial = account.receiveIndex;
        account.incrementReceiveIndex();
        let final = account.receiveIndex;
        expect(final).toEqual(initial + 1);
      })
    );

    describe('.incrementReceiveIndexIfLast', () => {
      it('should not increment the received index', () => {
        account._receiveIndex = 10;
        let initial = account.receiveIndex;
        account.incrementReceiveIndexIfLast(5);
        let final = account.receiveIndex;
        expect(final).toEqual(initial);
      });

      it('should increment the received index', () => {
        account._receiveIndex = 10;
        let initial = account.receiveIndex;
        account.incrementReceiveIndexIfLast(10);
        let final = account.receiveIndex;
        expect(final).toEqual(initial + 1);
      });
    });

    describe('.get/setLabelForReceivingAddress', () => {
      it('should set the label sync and get the label', () => {
        let fail = reason => console.log(reason);

        let success = () => {};

        account.setLabelForReceivingAddress(10, 'my label').then(success).catch(fail);
        expect(account._address_labels[10]).toEqual('my label');
        expect(MyWallet.syncWallet).toHaveBeenCalled();
        expect(account.getLabelForReceivingAddress(10)).toEqual('my label');
      });

      it('should not set a non-valid label', () => {
        let fail = reason => except(reason).toEqual('NOT_ALPHANUMERIC');

        let success = () => {};

        account.setLabelForReceivingAddress(10, 0).then(success).catch(fail);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should not set a label with a gap too wide', () => {
        let fail = reason => except(reason).toEqual('GAP');

        let success = () => {};

        account.setLabelForReceivingAddress(100, 'my label').then(success).catch(fail);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });
    });

    describe('Setter', () => {
      it('active shoud toggle archived', () => {
        account.active = false;
        expect(account.archived).toBeTruthy();
        expect(MyWallet.syncWallet).toHaveBeenCalled();
        account.active = true;
        expect(account.archived).toBeFalsy();
      });

      it('archived should archive the account and sync wallet', () => {
        account.archived = true;
        expect(account.archived).toBeTruthy();
        expect(account.active).not.toBeTruthy();
        expect(MyWallet.syncWallet).toHaveBeenCalled();
      });

      it('archived should throw exception if is non-boolean set', () => {
        let wrongSet = () => { account.archived = 'failure'; };
        expect(wrongSet).toThrow();
      });

      it('archived should call MyWallet.sync.getHistory when set to false', () => {
        account.archived = false;
        expect(MyWallet.wallet.getHistory).toHaveBeenCalled();
        expect(MyWallet.syncWallet).toHaveBeenCalled();
      });

      it('balance should be set and not sync wallet', () => {
        account.balance = 100;
        expect(account.balance).toEqual(100);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('balance should throw exception if is non-Number set', () => {
        let wrongSet = () => { account.balance = 'failure'; };
        expect(wrongSet).toThrow();
      });

      it('n_tx should be set and not sync wallet', () => {
        account.n_tx = 100;
        expect(account.n_tx).toEqual(100);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('n_tx should throw exception if is non-Number set', () => {
        let wrongSet = () => { account.n_tx = 'failure'; };
        expect(wrongSet).toThrow();
      });

      it('label should be set and sync wallet', () => {
        account.label = 'my label';
        expect(account.label).toEqual('my label');
        expect(MyWallet.syncWallet).toHaveBeenCalled();
      });

      it('label should be valid', () => {
        let test = () => { account.label = 0; };
        expect(test).toThrow();
      });

      it('xpriv is read only', () => {
        let wrongSet = () => { account.extendedPrivateKey = 'not allowed'; };
        expect(wrongSet).toThrow();
      });

      it('xpub is read only', () => {
        let wrongSet = () => { account.extendedPublicKey = 'not allowed'; };
        expect(wrongSet).toThrow();
      });

      it('receiveAddress is read only', () => {
        let wrongSet = () => { account.receiveAddress = 'not allowed'; };
        expect(wrongSet).toThrow();
      });

      it('changeAddress is read only', () => {
        let wrongSet = () => { account.changeAddress = 'not allowed'; };
        expect(wrongSet).toThrow();
      });

      it('index is read only', () => {
        let wrongSet = () => { account.index = 'not allowed'; };
        expect(wrongSet).toThrow();
      });

      it('KeyRing is read only', () => {
        let wrongSet = () => { account.keyRing = 'not allowed'; };
        expect(wrongSet).toThrow();
      });

      it('lastUsedReceiveIndex must be a number', () => {
        let invalid = () => { account.lastUsedReceiveIndex = '1'; };
        let valid = () => { account.lastUsedReceiveIndex = 1; };
        expect(invalid).toThrow();
        expect(account.lastUsedReceiveIndex).toEqual(0);
        expect(valid).not.toThrow();
        expect(account.lastUsedReceiveIndex).toEqual(1);
      });

      it('lastUsedReceiveIndex must be a positive number', () => {
        let invalid = () => { account.lastUsedReceiveIndex = -534.23; };
        expect(invalid).toThrow();
        expect(account.lastUsedReceiveIndex).toEqual(0);
      });

      it('receiveIndex must be a number', () => {
        let invalid = () => { account.receiveIndex = '1'; };
        let valid = () => { account.receiveIndex = 1; };
        expect(invalid).toThrow();
        expect(account.receiveIndex).toEqual(0);
        expect(valid).not.toThrow();
        expect(account.receiveIndex).toEqual(1);
      });

      it('receiveIndex must be a positive number', () => {
        let invalid = () => { account.receiveIndex = -534.34; };
        expect(invalid).toThrow();
        expect(account.receiveIndex).toEqual(0);
      });

      it('changeIndex must be a number', () => {
        let invalid = () => { account.changeIndex = '1'; };
        let valid = () => { account.changeIndex = 1; };
        expect(invalid).toThrow();
        expect(account.changeIndex).toEqual(0);
        expect(valid).not.toThrow();
        expect(account.changeIndex).toEqual(1);
      });

      it('changeIndex must be a positive number', () => {
        let invalid = () => { account.changeIndex = -534.234; };
        expect(invalid).toThrow();
        expect(account.changeIndex).toEqual(0);
      });
    });

    describe('Getter', () => {
      it('maxLabeledReceiveIndex should return the highest labeled index', () => {
        expect(account.maxLabeledReceiveIndex).toEqual(0);

        account.setLabelForReceivingAddress(1, 'label1');
        account.setLabelForReceivingAddress(10, 'label100');

        expect(account.maxLabeledReceiveIndex).toEqual(10);
      });

      it('labeledReceivingAddresses should return all the labeled receiving addresses', () => {
        expect(account.labeledReceivingAddresses.length).toEqual(1);

        account.setLabelForReceivingAddress(1, 'label1');
        account.setLabelForReceivingAddress(10, 'label100');

        expect(account.labeledReceivingAddresses.length).toEqual(3);
      });
    });

    describe('.encrypt', () => {
      beforeEach(() => { account = new HDAccount(object); });

      it('should fail and don\'t sync when encryption fails', () => {
        let wrongEnc = () => account.encrypt(() => null);
        expect(wrongEnc).toThrow();
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should write in a temporary field and let the original key intact', () => {
        let originalKey = account.extendedPrivateKey;
        account.encrypt(() => 'encrypted key');
        expect(account._temporal_xpriv).toEqual('encrypted key');
        expect(account.extendedPrivateKey).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should do nothing if watch only account', () => {
        account._xpriv = null;
        account.encrypt(() => 'encrypted key');
        expect(account.extendedPrivateKey).toEqual(null);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should do nothing if no cipher provided', () => {
        let originalKey = account.extendedPrivateKey;
        account.encrypt(undefined);
        expect(account.extendedPrivateKey).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });
    });

    describe('.decrypt', () => {
      beforeEach(() => { account = new HDAccount(object); });

      it('should fail and don\'t sync when decryption fails', () => {
        let wrongEnc = () => account.decrypt(() => null);
        expect(wrongEnc).toThrow();
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should write in a temporary field and let the original key intact', () => {
        let originalKey = account.extendedPrivateKey;
        account.decrypt(() => 'decrypted key');
        expect(account._temporal_xpriv).toEqual('decrypted key');
        expect(account.extendedPrivateKey).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should do nothing if watch only account', () => {
        account._xpriv = null;
        account.decrypt(() => 'decrypted key');
        expect(account.extendedPrivateKey).toEqual(null);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should do nothing if no cipher provided', () => {
        let originalKey = account.extendedPrivateKey;
        account.decrypt(undefined);
        expect(account.extendedPrivateKey).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });
    });

    describe('.persist', () => {
      beforeEach(() => { account = new HDAccount(object); });

      it('should do nothing if temporary is empty', () => {
        let originalKey = account.extendedPrivateKey;
        account.persist();
        expect(account.extendedPrivateKey).toEqual(originalKey);
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });

      it('should swap and delete if we have a temporary value', () => {
        account._temporal_xpriv = 'encrypted key';
        let temp = account._temporal_xpriv;
        account.persist();
        expect(account.extendedPrivateKey).toEqual(temp);
        expect(account._temporal_xpriv).not.toBeDefined();
        expect(MyWallet.syncWallet).not.toHaveBeenCalled();
      });
    });

    describe('.removeLabelForReceivingAddress', () =>
      it('should remove the label and sync the wallet', () => {
        let fail = reason => console.log(reason);

        let resolve = () => {};

        account.setLabelForReceivingAddress(0, 'Savings').then(resolve).catch(fail);
        expect(MyWallet.syncWallet).toHaveBeenCalled();
        account.removeLabelForReceivingAddress(0);
        expect(MyWallet.syncWallet).toHaveBeenCalled();
        expect(account.getLabelForReceivingAddress(0)).not.toEqual('Savings');
      })
    );

    describe('.fromExtPublicKey', () => {
      it('should import a correct key', () => {
        account = HDAccount.fromExtPublicKey('xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8', 0, 'New account');
        expect(account._xpriv).toEqual(null);
        expect(account.label).toEqual('New account');
      });

      it('should not import a truncated key', () => expect(() => HDAccount.fromExtPublicKey('xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGh', 0, 'New account')).toThrowError('Invalid checksum'));
    });

    describe('.fromExtPrivateKey', () => {
      it('should import a correct key', () => {
        account = HDAccount.fromExtPrivateKey('xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi', undefined, 'Another new account');
        expect(account.label).toEqual('Another new account');
        expect(account._xpub).toEqual('xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8');
        expect(account.isEncrypted).toBeFalsy();
        expect(account.isUnEncrypted).toBeTruthy();
        expect(account.index).toEqual(null);
      });

      it('should not import a truncated key', () => expect(() => HDAccount.fromExtPrivateKey('xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6', undefined, 'Another new account')).toThrowError('Invalid checksum'));
    });

    describe('.factory', () =>
      it('should not touch already instanciated objects', () => {
        let fromFactory = HDAccount.factory(account);
        expect(account).toEqual(fromFactory);
      })
    );
  });
});
