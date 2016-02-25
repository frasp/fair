(function () {
    'use strict';

    angular.module('trip', []).config(function () {

    });
})();
'use strict';

describe('module Test', function () {

    beforeEach(module('trip', []));

    it('doit etre defini', function () {
        expect(true).toBeDefined();
    });
});