//var app = angular.module('trip', []);

//(function () {
//    'use strict';

//    app.config(function () {

//    });
//})();

//'use strict';

//describe('TU: ryanAirFares directive', function () {
//    var $scope, $q, $compile, element;
//    var departureAirport = "CPH";
//    var arrivalAirport = "CRL";

//    beforeEach(module('trip', 'app/templates/ryanAirFares.html'));

//    beforeEach(inject(function ($templateCache, _$compile_, $rootScope, _$q_, _$filter_) {
//        $filter = _$filter_;
//        $scope = $rootScope.$new();
//        $q = _$q_;
//        element = angular.element("<div data-ryan-air-fares data-departure-airport=\"CRL\" data-arrival-airport=\"CPH\"></div>");
//        $compile = _$compile_;
//        $compile(element)($scope);
//        $scope.$digest();
//    }));

//    it("la directive doit être correctement initialisée", function () {
//        //Expectations
//        expect(element).toBeDefined();
//        expect(element.isolateScope()).toBeDefined();
//    });

//    it("appel getFlights", function () {
//        //Init
//        var result = null;

//        //Expectations
//        expect(element).toBeDefined();
//        expect(element.isolateScope().getFlights()).toEqual("test");
//    });
//});