var app = angular.module('product', []);

(function () {
    'use strict';

    app.config(function () {

    });
})();

'use strict';

describe('TU : Flights controller ', function () {
    var createController;

    beforeEach(module('product'));

    beforeEach(function () {
        angular.mock.inject([
            '$rootScope', '$controller', '$compile', '$filter', '$q', function ($rootScope, $controller, _$compile_, _$filter_, _$q_) {
                createController = function () {
                    return $controller('Flights', {
                    });
                };
            }
        ]);
    });

    it('Context doit être défini', function () {
        //Init
        var ctrl = createController();

        //Expectations
        expect(ctrl.context).toBeDefined();
    });

    it('Context doit être défini', function () {
        //Init
        var ctrl = createController();

        //Expectations
        expect(ctrl.getFlights()).toEqual("Flights");
    });
});