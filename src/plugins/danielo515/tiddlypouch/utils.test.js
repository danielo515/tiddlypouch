const utils = require('./utils');

describe('Tiddlypouch utils', () => {
    it('Should convert bool to human', () => {
        expect(utils.boolToHuman(true)).toEqual('yes');
        expect(utils.boolToHuman(false)).toEqual('no');
    });
});
