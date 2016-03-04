var app = angular.module('trip', []);

(function () {
    'use strict';

    app.config(function () {

    });
})();

'use strict';

describe('TU: ryanAirFlights directive', function () {
    var $scope, $q, $compile, element;

    beforeEach(module('trip', 'app/templates/ryanAirFlights.html'));

    beforeEach(inject(function ($templateCache, _$compile_, $rootScope, _$q_, _$filter_) {
        $filter = _$filter_;
        $scope = $rootScope.$new();
        $q = _$q_;
        element = angular.element("<div data-ryan-air-flights ryan-air-fares-data=\"fares\"></div>");
        $compile = _$compile_;
        $compile(element)($scope);
        $scope.$digest();
    }));

    it("la directive doit être correctement initialisée", function () {
        //Expectations
        expect(element).toBeDefined();
        expect(element.isolateScope()).toBeDefined();
    });

    it("appel getFlights", function () {
        //Init
        var result = null;

        //Expectations
        expect(element).toBeDefined();
        expect(element.isolateScope().getFlights()).toEqual("test");
    });
});