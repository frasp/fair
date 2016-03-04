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
        ryanAirFlightsService = jasmine.createSpyObj('ryanAirFlightsService', ['getRyanAirFlights', 'getRyanAirFlightsForDestination']);
        ryanAirFlightsService.getRyanAirFlights.and.callFake(function () {
            return {
                then: function (callback) {
                    callback({
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
                    });
                }
            };
        });
        ryanAirFlightsService.getRyanAirFlightsForDestination.and.callFake(function () {
            return {
                then: function (callback) {
                    callback({
                        "trips": [
                           {
                               "origin": "CRL",
                               "destination": "CPH",
                               "dates": [
                                  {
                                      "dateOut": "2016-02-24T00:00:00.000",
                                      "flights": []
                                  },
                                  {
                                      "dateOut": "2016-02-25T00:00:00.000",
                                      "flights": []
                                  },
                                  {
                                      "dateOut": "2016-02-26T00:00:00.000",
                                      "flights": [
                                         {
                                             "flightNumber": "FR 6375",
                                             "time": [
                                                "2016-02-26T09:00:00.000",
                                                "2016-02-26T10:45:00.000"
                                             ],
                                             "duration": "01:45",
                                             "regularFare": {
                                                 "fareKey": "0~E~~EZ6LOW~BND6~~2~X",
                                                 "fareClass": "E",
                                                 "fares": [
                                                    {
                                                        "type": "ADT",
                                                        "amount": 96.9900,
                                                        "count": 1,
                                                        "hasDiscount": false,
                                                        "publishedFare": 96.9900
                                                    }
                                                 ]
                                             },
                                         },
                                         {
                                             "flightNumber": "FR 6356",
                                             "time": [
                                                "2016-02-26T21:20:00.000",
                                                "2016-02-26T23:05:00.000"
                                             ],
                                             "duration": "01:45",
                                             "regularFare": {
                                                 "fareKey": "0~L~~LZ6LOW~BND6~~2~X",
                                                 "fareClass": "L",
                                                 "fares": [
                                                    {
                                                        "type": "ADT",
                                                        "amount": 116.9900,
                                                        "count": 1,
                                                        "hasDiscount": false,
                                                        "publishedFare": 116.9900
                                                    }
                                                 ]
                                             }
                                         }
                                      ]
                                  }
                               ]
                           }
                        ],
                        "serverTimeUTC": "2016-02-25T17:18:33.970Z"
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

    it("Le controlleur appelle la méthode getFlights", function () {
        //Init
        var ctrl = createController();

        //Expectations
        expect(ctrl.getFlights()).toEqual("Flights");
    });

    it("Le controlleur doit mapper correctement les objets vols et ses détails après appel à la méthode getRyanAirFlights()", function () {
        //Init
        var ctrl = createController();

        //Execute
        ctrl.getRyanAirFlights();

        //Expectations
        expect(ctrl.context.ryanAirFlights).toBeDefined();
        expect(ctrl.context.ryanAirFlights[0]).toBeDefined();
        expect(ctrl.context.ryanAirFlights[0].arrivalDate).toEqual("2016-02-16");
        expect(ctrl.context.ryanAirFlights[0].departureAirport).toBeDefined();
        expect(ctrl.context.ryanAirFlights[0].departureAirport.country).toEqual("Belgique");
        expect(ctrl.context.ryanAirFlights[0].departureAirport.iataCode).toEqual("CRL");
        expect(ctrl.context.ryanAirFlights[0].departureAirport.name).toEqual("Bruxelles-Charleroi");
        expect(ctrl.context.ryanAirFlights[0].arrivalAirport).toBeDefined();
        expect(ctrl.context.ryanAirFlights[0].arrivalAirport.country).toEqual("Danemark");
        expect(ctrl.context.ryanAirFlights[0].arrivalAirport.iataCode).toEqual("CPH");
        expect(ctrl.context.ryanAirFlights[0].arrivalAirport.name).toEqual("Copenhague");
        expect(ctrl.context.ryanAirFlights[0].flights).toBeDefined();
        expect(ctrl.context.ryanAirFlights[0].flights.length).toEqual(2);
        expect(ctrl.context.ryanAirFlights[0].flights[0]).toBeDefined();
        expect(ctrl.context.ryanAirFlights[0].flights[0].departureDate).toEqual("2016-02-26T09:00:00.000");
        expect(ctrl.context.ryanAirFlights[0].flights[0].arrivalDate).toEqual("2016-02-26T10:45:00.000");
        expect(ctrl.context.ryanAirFlights[0].flights[0].duration).toEqual("01h45");
        expect(ctrl.context.ryanAirFlights[0].flights[0].flightNumber).toEqual("FR 6375");
        expect(ctrl.context.ryanAirFlights[0].flights[0].amount).toEqual(96.9900);
        expect(ctrl.context.ryanAirFlights[0].flights[1]).toBeDefined();
        expect(ctrl.context.ryanAirFlights[0].flights[1].departureDate).toEqual("2016-02-26T21:20:00.000");
        expect(ctrl.context.ryanAirFlights[0].flights[1].arrivalDate).toEqual("2016-02-26T23:05:00.000");
        expect(ctrl.context.ryanAirFlights[0].flights[1].duration).toEqual("01h45");
        expect(ctrl.context.ryanAirFlights[0].flights[1].flightNumber).toEqual("FR 6356");
        expect(ctrl.context.ryanAirFlights[0].flights[1].amount).toEqual(116.9900);
    });
});