(function () {
    'use strict';

    angular.module('product', []).config(function () {

    });
})();
'use strict';

describe('module Test', function () {

    beforeEach(module('product', []));

    it('doit etre defini', function () {
        expect(true).toBeDefined();
    });
});