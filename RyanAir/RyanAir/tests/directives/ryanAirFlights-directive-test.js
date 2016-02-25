var app = angular.module('trip', []);

(function () {
    'use strict';

    app.config(function () {

    });
})();

'use strict';

describe('TU: ryanAirFlights directive', function () {
    var $scope, $q, $compile, element;
    var fares = {
        fares: [
        {
            outbound: {
                arrivalDate: "2016-02-16T08:35:00",
                arrivalAirport: {
                    countryName: "Danemark",
                    iataCode: "CPH",
                    name: "Copenhague",
                    seoName: "copenhagen"
                },
                departureAirport: {
                    countryName: "Belgique",
                    iataCode: "CRL",
                    name: "Bruxelles-Charleroi",
                    seoName: "bruxelles-charleroi"
                },
            departureDate: "2016-02-16T07:05:00",
            price: {
                currencyCode: "EUR",
                currencySymbol: "€",
                value: 9.99,
                valueFractionalUnit: "9",
                valueMainUnit: "9"
            },
        },
        summary: {
            price: {
                currencyCode: "EUR",
                currencySymbol: "€",
                value: 9.99,
                valueFractionalUnit: "9",
                valueMainUnit: "9"
            }
        }
        }]
    };

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

    it("construction objet setFlights OK", function () {
        //Init
        var result = null;

        //Execute
        result = element.isolateScope().setFares(fares);

        //Expectations
        expect(result).toBeDefined();
        expect(result[0]).toBeDefined();
        expect(result[0].arrivalDate).toEqual("2016-02-16T08:35:00");
        expect(result[0].departureDate).toEqual("2016-02-16T07:05:00");
        expect(result[0].departureAirport).toBeDefined();
        expect(result[0].departureAirport.country).toEqual("Belgique");
        expect(result[0].departureAirport.iataCode).toEqual("CRL");
        expect(result[0].departureAirport.name).toEqual("Bruxelles-Charleroi");
        expect(result[0].arrivalAirport).toBeDefined();
        expect(result[0].arrivalAirport.country).toEqual("Danemark");
        expect(result[0].arrivalAirport.iataCode).toEqual("CPH");
        expect(result[0].arrivalAirport.name).toEqual("Copenhague");
        expect(result[0].price).toBeDefined();
        expect(result[0].price.value).toEqual(9.99);
        expect(result[0].price.currencySymbol).toEqual("€");
    });
});