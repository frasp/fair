(function () {
    'use strict';

    app.directive('ryanAirFlights', ryanAirFlightsDirective);

    /**
    * @function ryanAirFlightsDirective.
    * @description : Directive renvoyant les vols Ryan air.
    */
    function ryanAirFlightsDirective(ryanAirFlightsService) {
        var directive = {
            scope: {
                ryanAirFaresData: "=ryanAirFaresData",
            },
            link: link,
            templateUrl: 'app/templates/ryanAirFlights.html'
        };

        return directive;

        /**
         * @function link.
         * @description : link.
         */
        function link(scope, element, attrs) {
            scope.getFlights = getFlights;
            scope.setFares = setFares;

            scope.$watch('ryanAirFaresData', function (newValue) {
                scope.fares = scope.setFares(scope.ryanAirFaresData);
            });
        }

        /**
        * @function setFares.
        * @description : fonction créant les objets avec les données minimales de vol.
        * @param ryanAirFares : vols envoyés depuis l'API.
        */
        function setFares(ryanAirFares) {
            var result = [];

            if (!!ryanAirFares) {
                angular.forEach(ryanAirFares.fares, function (ryanAirFare) {
                    result.push(ryanAirFaresMapping(ryanAirFare));
                });
            }            

            return result;
        }

        /**
        * @function ryanAirFaresMapping.
        * @description : fonction mappant un vol Ryan Air avec un vol standard.
        * @param ryanAirFare : vol Ryan Air.
        */
        function ryanAirFaresMapping(ryanAirFare) {
            var result = {
                departureDate: ryanAirFare.outbound.departureDate,
                arrivalDate: ryanAirFare.outbound.arrivalDate,
            };

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

            if (ryanAirFare.outbound.price !== null) {
                result.price = {
                    value: ryanAirFare.outbound.price.value,
                    currencySymbol: ryanAirFare.outbound.price.currencySymbol
                };
            }

            return result;
        }

        /**
        * @function getFlights.
        * @description : fonction renvoyant les vols Ryan air.
        */
        function getFlights() {
            return "test";
        }
    };
})();