var app = angular.module('trip', []);

(function () {
    'use strict';

    app.config(function () {

    });
})();

'use strict';

describe('TU : Flights controller ', function () {
    var createController;
    var ryanAirFlightsService;

    beforeEach(module('trip'));

    beforeEach(module(function ($provide, $controllerProvider) {
        ryanAirFlightsService = jasmine.createSpyObj('ryanAirFlightsService', ['getRyanAirFlights']);
        ryanAirFlightsService.getRyanAirFlights.and.callFake(function () {
            return {
                then: function (callback) {
                    callback({
                        fares: [
	                    {
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
                    });
                }
            };
        });
    }));

    beforeEach(function () {
        angular.mock.inject([
            '$rootScope', '$controller', '$compile', '$filter', '$q', function ($rootScope, $controller, _$compile_, _$filter_, _$q_) {
                createController = function () {
                    return $controller('Flights', {
                        'ryanAirFlightsService': ryanAirFlightsService
                    });
                };
            }
        ]);
    });

    it("Context doit être défini", function () {
        //Init
        var ctrl = createController();

        //Expectations
        expect(ctrl.context).toBeDefined();
    });

    it("La directive appelle la méthode getRyanAirFlights", function () {
        //Init
        var ctrl = createController();

        //Expectations
        expect(ctrl.context).toBeDefined();
        expect(ctrl.context.ryanAirFlights).toBeDefined();
        expect(ctrl.context.ryanAirFlights.fares[0]).toBeDefined();
        expect(ctrl.context.ryanAirFlights.fares[0].departureAirport).toBeDefined();
        expect(ctrl.context.ryanAirFlights.fares[0].departureAirport.iataCode).toBeDefined("CRL");
    });

    it("La directive appelle la méthode getFlights", function () {
        //Init
        var ctrl = createController();

        //Expectations
        expect(ctrl.getFlights()).toEqual("Flights");
    });
});