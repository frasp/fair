(function () {
    'use strict';

    app.controller('Flights', FlightsController);

    FlightsController.$inject = ['ryanAirFlightsService'];

    /**
    * @desc order directive that is specific to the order module at a company named Acme
    */
    function FlightsController(ryanAirFlightsService) {
        var vm = this;

        vm.context = {
            food: 'pizza',
            flexDaysOut: 2,
            ryanAirFlights: [],
        };

        vm.getFlights = getFlights;
        vm.getRyanAirFlights = getRyanAirFlights;

        getRyanAirFlights('LIL', '2016-06-01', '2016-06-02');

        /**
        * @desc order directive that is specific to the order module at a company named Acme
        */
        function getFlights() {
            return "Flights";
        }

        /**
         * @function getRyanAirFlights.
         * @description : fonction renvoyant les vols Ryan air.
         * @param airportCode: code de l'aéroport de départ.
         * @param departureDate: date de départ.
         * @param arrivalDate: date d'arrivée.
         */
        function getRyanAirFlights(airportCode, departureDate, arrivalDate) {
            return ryanAirFlightsService.getRyanAirFlights(airportCode, departureDate, arrivalDate).then(function (ryanAirFlights) {
                if (ryanAirFlights) {
                    var resultMapped = [];

                    angular.forEach(ryanAirFlights.fares, function (ryanAirFare) {
                        var ryanAirFareMapped = ryanAirFareMapping(ryanAirFare);
                        vm.context.ryanAirFlights.push(ryanAirFareMapped);

                        if (ryanAirFareMapped !== null && ryanAirFareMapped.departureAirport !== null && ryanAirFareMapped.arrivalAirport !== null) {
                            ryanAirFareMapped.flights = [];

                            ryanAirFlightsService.getRyanAirFlightsForDestination(ryanAirFareMapped.arrivalDate, ryanAirFareMapped.departureAirport.iataCode, ryanAirFareMapped.arrivalAirport.iataCode, vm.context.flexDaysOut).then(function (ryanAirFaresDetails) {
                                var flightsDetails = ryanAirFareDetailsMapping(ryanAirFaresDetails);

                                if (flightsDetails !== null) {
                                    angular.forEach(flightsDetails, function (flightDetails) {
                                        ryanAirFareMapped.flights.push(flightDetails);
                                    });
                                }
                            });
                        }
                    });
                }
            }, function () {
                console.log("error");
            });
        }

        /**
        * @function ryanAirFareMapping.
        * @description : fonction mappant un vol Ryan Air avec un vol standard.
        * @param ryanAirFare : vol Ryan Air.
        */
        function ryanAirFareMapping(ryanAirFare) {
            var result = {};

            if (ryanAirFare.outbound !== null) {

                if (ryanAirFare.outbound.arrivalDate !== null) {
                    result.arrivalDate = ryanAirFare.outbound.arrivalDate.split("T")[0];
                }

                if (ryanAirFare.outbound.departureAirport !== null) {
                    result.departureAirport = {
                        country: ryanAirFare.outbound.departureAirport.countryName,
                        name: ryanAirFare.outbound.departureAirport.name,
                        iataCode: ryanAirFare.outbound.departureAirport.iataCode
                    };
                }

                if (ryanAirFare.outbound.arrivalAirport !== null) {
                    result.arrivalAirport = {
                        country: ryanAirFare.outbound.arrivalAirport.countryName,
                        name: ryanAirFare.outbound.arrivalAirport.name,
                        iataCode: ryanAirFare.outbound.arrivalAirport.iataCode
                    };
                }
            }

            return result;
        }

        /**
        * @function ryanAirFareDetailMapping.
        * @description : fonction mappant les détails d'un vol Ryan Air avec un vol standard.
        * @param ryanAirFareDetails : détails vol Ryan Air.
        */
        function ryanAirFareDetailsMapping(ryanAirFareDetails) {
            if (ryanAirFareDetails !== null
                && ryanAirFareDetails.trips !== null) {
                var result = [];

                angular.forEach(ryanAirFareDetails.trips, function (trip) {

                    if (trip.dates !== null && trip.dates.length > 0) {

                        angular.forEach(trip.dates, function (tripDates) {

                            if (tripDates !== null && tripDates.flights !== null && tripDates.flights.length > 0) {

                                angular.forEach(tripDates.flights, function (tripDetails) {
                                    var trip = {};

                                    if (tripDetails.duration !== null) {
                                        trip.duration = tripDetails.duration.replace(":", "h");
                                    }
                                    trip.flightNumber = tripDetails.flightNumber;

                                    if (tripDetails.time !== null) {
                                        trip.departureDate = tripDetails.time[0];
                                        trip.arrivalDate = tripDetails.time[1];
                                    }

                                    if (tripDetails.regularFare !== null && tripDetails.regularFare.fares !== null && tripDetails.regularFare.fares.length > 0) {
                                        trip.amount = tripDetails.regularFare.fares[0].amount;
                                        result.push(trip); //on ne sélectionne que les billets classe éco
                                    }
                                });
                            }
                        });
                    }
                   
                });

                return result;
            }

            return null
        }
    }
})();